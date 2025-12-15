import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { ServerWorkflowEngine } from './engine';
import { GrpcPluginManager } from '../runners/grpc/server';
import { Registry } from '../registry';
import { glog } from '../core/Logger';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logger instance
const logger = glog.defaultLogger().named('Server');

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_DIR = path.join(__dirname, '../../config');
const FLOWS_DIR = path.join(DATA_DIR, 'flows');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const APIS_FILE = path.join(DATA_DIR, 'apis.json');
const PLUGINS_CONFIG_FILE = path.join(CONFIG_DIR, 'plugins.yaml');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

if (!fs.existsSync(FLOWS_DIR)) {
    fs.mkdirSync(FLOWS_DIR);
}

// JSON Helper
const readJson = (file: string) => {
    if (!fs.existsSync(file)) return [];
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
};

const writeJson = (file: string, data: any) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// Workflow YAML Helpers
const readWorkflows = () => {
    if (!fs.existsSync(FLOWS_DIR)) {
        logger.info(`[WorkflowLoader] Flows directory not found: ${FLOWS_DIR}`);
        return [];
    }
    
    const workflows: any[] = [];
    const files = fs.readdirSync(FLOWS_DIR);
    
    logger.info(`[WorkflowLoader] Loading workflows from directory: ${FLOWS_DIR}`);
    logger.info(`[WorkflowLoader] Found ${files.length} files in flows directory`);
    
    for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            try {
                const filePath = path.join(FLOWS_DIR, file);
                logger.info(`[WorkflowLoader] Reading workflow file: ${file}`);
                
                const yamlData = fs.readFileSync(filePath, 'utf8');
                const workflow = yaml.load(yamlData) as any;
                
                if (workflow && workflow.id && workflow.content) {
                    logger.info(`[WorkflowLoader] ✅ Successfully loaded workflow: ${workflow.id} - ${workflow.name}`);
                    workflows.push(workflow);
                } else {
                    logger.warn(`[WorkflowLoader] ⚠️  Invalid workflow format in file: ${file}`);
                }
            } catch (e) {
                logger.error(`[WorkflowLoader] ❌ Error reading workflow file ${file}:`, e);
            }
        }
    }
    
    logger.info(`[WorkflowLoader] Finished loading ${workflows.length} valid workflows`);
    return workflows;
};

const writeWorkflow = (workflow: any) => {
    const filename = `${workflow.id}.yaml`;
    const filePath = path.join(FLOWS_DIR, filename);
    const yamlData = yaml.dump(workflow, { indent: 2 });
    fs.writeFileSync(filePath, yamlData, 'utf8');
};

const deleteWorkflow = (workflowId: string) => {
    const filename = `${workflowId}.yaml`;
    const filePath = path.join(FLOWS_DIR, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json() as any);

// --- SWAGGER CONFIGURATION --- 
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GFlow API Documentation',
      version: '1.0.0',
      description: 'API documentation for GFlow workflow management system',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/server/index.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- SCHEDULER SYSTEM ---
// Map to store active cron jobs
const activeJobs = new Map<string, any>();

const loadAndScheduleWorkflows = () => {
    logger.info("Loading scheduled workflows...");
    const workflows = readWorkflows();

    // Clear existing jobs
    activeJobs.forEach(job => job.stop());
    activeJobs.clear();

    workflows.forEach((wfRecord: any) => {
        // 跳过未启用的工作流（支持顶层 enabled 与 content.enabled）
        if (wfRecord && (wfRecord.enabled === false || (wfRecord.content && wfRecord.content.enabled === false))) {
            return;
        }
        const wf = wfRecord.content;
        const timerNode = wf.nodes.find((n: any) => n.type === 'timer');

        if (timerNode && timerNode.parameters) {
            let schedule = null;
            if (timerNode.parameters.cron) {
                schedule = timerNode.parameters.cron;
            } else if (timerNode.parameters.secondsInterval) {
                // Simple interval handling (fallback for demo)
                if (timerNode.parameters.secondsInterval >= 60) {
                    schedule = "* * * * *"; // Run every minute for intervals >= 60s
                }
            }

            if (schedule && cron.validate(schedule)) {
                logger.info(`Scheduling workflow [${wf.name}] with cron: ${schedule}`);
                const job = cron.schedule(schedule, async () => {
                    logger.info(`[Cron] Triggering workflow ${wf.name}`);
                    try {
                        const engine = new ServerWorkflowEngine(wf);
                        await engine.run();
                    } catch (err) {
                        logger.error(`[Cron] Error executing ${wf.name}:`, err);
                    }
                });
                activeJobs.set(wfRecord.id, job);
            }
        }
    });
};

// Initialize Scheduler
loadAndScheduleWorkflows();

// Watch flows directory changes to reschedule dynamically
try {
    if (fs.existsSync(FLOWS_DIR)) {
        fs.watch(FLOWS_DIR, { recursive: false }, (eventType, filename) => {
            if (filename && (filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
                try {
                    logger.info(`[Scheduler] Workflow file changed: ${filename}, reloading...`);
                    loadAndScheduleWorkflows();
                } catch (e) {
                    logger.warn('[Scheduler] Failed to reload workflows on change:', (e as any)?.message || e);
                }
            }
        });
        logger.info('[Scheduler] Workflows directory watcher started');
    }
} catch (e) {
    logger.warn('[Scheduler] Failed to start workflows watcher:', (e as any)?.message || e);
}

// Initialize gRPC Plugins
const initializeGrpcPlugins = async () => {
    if (fs.existsSync(PLUGINS_CONFIG_FILE)) {
        try {
            logger.info('[Server] Loading gRPC plugins from:', PLUGINS_CONFIG_FILE);
            await GrpcPluginManager.loadFromConfig(PLUGINS_CONFIG_FILE);
            logger.info('[Server] gRPC plugins loaded successfully');
        } catch (error) {
            logger.error('[Server] Failed to load gRPC plugins:', error);
        }
    } else {
        logger.info('[Server] No plugins config found at:', PLUGINS_CONFIG_FILE);
    }
};

// Run async initialization
initializeGrpcPlugins().catch(error => logger.error('Failed to initialize gRPC plugins:', error));


// --- SERVER EXECUTION API --- 
/**
 * @openapi
 * /api/execute:
 *   post:
 *     summary: Execute a workflow
 *     description: Execute a workflow either by providing the workflow definition or workflow ID
 *     tags:
 *       - Workflow Execution
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workflow: 
 *                 type: object
 *                 description: The workflow definition to execute
 *               workflowId: 
 *                 type: string
 *                 description: The ID of an existing workflow to execute
 *             example:
 *               workflowId: "1234567890"
 *     responses:
 *       200:
 *         description: Workflow executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Workflow execution result
 *       400:
 *         description: Bad request - workflow not provided or disabled
 *       500:
 *         description: Internal server error during workflow execution
 */
app.post('/api/execute', async (req, res) => {
    const { workflow, workflowId } = req.body;
    let targetWorkflow = workflow;

    if (!targetWorkflow && workflowId) {
        const workflows = readWorkflows();
        const record = workflows.find((w: any) => w.id === workflowId);
        if (record) {
            // 若工作流被禁用（顶层或内容级），阻止执行
            if (record.enabled === false || (record.content && record.content.enabled === false)) {
                return res.status(400).json({ error: 'Workflow is disabled' });
            }
            targetWorkflow = record.content;
        }
    }

    if (!targetWorkflow) {
        return res.status(400).json({ error: "No workflow provided" });
    }

    // 若直接传递 workflow 对象且其标记为未启用，也阻止执行
    if ((targetWorkflow as any)?.enabled === false) {
        return res.status(400).json({ error: 'Workflow is disabled' });
    }

    try {
        const engine = new ServerWorkflowEngine(targetWorkflow);
        const result = await engine.run();
        res.json(result);
    } catch (e: any) {
        logger.error("Execution Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- Proxy API --- 
/**
 * @openapi
 * /api/proxy:
 *   post:
 *     summary: Proxy API request
 *     description: Forward an API request to another server
 *     tags:
 *       - Proxy
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method: 
 *                 type: string
 *                 description: HTTP method (GET, POST, PUT, DELETE, etc.)
 *               url: 
 *                 type: string
 *                 description: Target URL to forward the request to
 *               headers: 
 *                 type: object
 *                 description: HTTP headers to include in the request
 *               body: 
 *                 type: object
 *                 description: Request body
 *               params: 
 *                 type: object
 *                 description: URL parameters
 *             example:
 *               method: "GET"
 *               url: "https://api.example.com/data"
 *               headers: { "Authorization": "Bearer token" }
 *     responses:
 *       200:
 *         description: Request forwarded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: 
 *                   type: number
 *                   description: HTTP status code
 *                 statusText: 
 *                   type: string
 *                   description: HTTP status text
 *                 data: 
 *                   type: object
 *                   description: Response data
 *                 headers: 
 *                   type: object
 *                   description: Response headers
 *       500:
 *         description: Internal server error during proxy request
 */
app.post('/api/proxy', async (req, res) => {
    const { method, url, headers, body, params } = req.body;
    try {
        const response = await axios({ method, url, headers, data: body, params });
        res.json({
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            headers: response.headers
        });
    } catch (error: any) {
        const status = error.response ? error.response.status : 500;
        res.status(status).json({
            error: error.message,
            status: status,
            data: error.response ? error.response.data : null
        });
    }
});

// --- Auth APIs --- 
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: 
 *                 type: string
 *                 description: Username for the new account
 *               password: 
 *                 type: string
 *                 description: Password for the new account
 *               email: 
 *                 type: string
 *                 description: Email address for the new account
 *             required:
 *               - username
 *               - password
 *               - email
 *             example:
 *               username: "john_doe"
 *               password: "password123"
 *               email: "john@example.com"
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: 
 *                   type: string
 *                   description: User ID
 *                 username: 
 *                   type: string
 *                   description: Username
 *                 email: 
 *                   type: string
 *                   description: Email address
 *                 createdAt: 
 *                   type: string
 *                   description: Account creation timestamp
 *       400:
 *         description: Bad request - username already exists
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login to user account
 *     description: Authenticate user and get access token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: 
 *                 type: string
 *                 description: Username
 *               password: 
 *                 type: string
 *                 description: Password
 *             required:
 *               - username
 *               - password
 *             example:
 *               username: "john_doe"
 *               password: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: 
 *                   type: object
 *                   properties:
 *                     id: 
 *                       type: string
 *                       description: User ID
 *                     username: 
 *                       type: string
 *                       description: Username
 *                     email: 
 *                       type: string
 *                       description: Email address
 *                     createdAt: 
 *                       type: string
 *                       description: Account creation timestamp
 *                 token: 
 *                   type: string
 *                   description: Authentication token
 *       401:
 *         description: Invalid credentials
 */

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     description: Retrieve information about the currently authenticated user
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User info retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: 
 *                   type: string
 *                   description: User ID
 *                 username: 
 *                   type: string
 *                   description: Username
 *                 email: 
 *                   type: string
 *                   description: Email address
 *                 createdAt: 
 *                   type: string
 *                   description: Account creation timestamp
 *       401:
 *         description: Unauthorized - no token provided or invalid token
 */
app.post('/api/auth/register', (req, res) => {
    const users = readJson(USERS_FILE);
    const { username, password, email } = req.body;
    if (users.find((u: any) => u.username === username)) return res.status(400).json({ error: 'Username exists' });

    const newUser = {
        id: Date.now().toString(),
        username,
        password,
        email,
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    writeJson(USERS_FILE, users);

    const { password: _, ...u } = newUser;
    res.json(u);
});

app.post('/api/auth/login', (req, res) => {
    const users = readJson(USERS_FILE);
    const user = users.find((u: any) => u.username === req.body.username && u.password === req.body.password);
    if (user) {
        const { password: _, ...u } = user;
        res.json({ user: u, token: `mock-token-${Date.now()}-${user.id}` });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.get('/api/auth/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const userId = token.split('-').pop();
    const users = readJson(USERS_FILE);
    const user = users.find((u: any) => u.id === userId);
    if (user) {
        const { password: _, ...u } = user;
        res.json(u);
    } else {
        res.status(401).json({ error: 'User not found' });
    }
});

// --- Workflow CRUD --- 
/**
 * @openapi
 * /api/workflows:
 *   get:
 *     summary: Get all workflows
 *     description: Retrieve a list of all workflows with optional filtering and pagination
 *     tags:
 *       - Workflow Management
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter workflows by name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by (default: updatedAt)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *         description: Sort order (asc or desc, default: desc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of workflows to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of workflows to skip before returning results
 *     responses:
 *       200:
 *         description: Workflows retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: 
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: 
 *                         type: string
 *                         description: Workflow ID
 *                       name: 
 *                         type: string
 *                         description: Workflow name
 *                       updatedAt: 
 *                         type: string
 *                         description: Last update timestamp
 *                       enabled: 
 *                         type: boolean
 *                         description: Whether the workflow is enabled
 *                 total: 
 *                   type: integer
 *                   description: Total number of workflows
 *                 limit: 
 *                   type: integer
 *                   description: Number of workflows returned per page
 *                 offset: 
 *                   type: integer
 *                   description: Number of workflows skipped
 */

/**
 * @openapi
 * /api/workflows/{id}:
 *   get:
 *     summary: Get a workflow by ID
 *     description: Retrieve a specific workflow by its ID
 *     tags:
 *       - Workflow Management
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: 
 *                   type: string
 *                   description: Workflow ID
 *                 name: 
 *                   type: string
 *                   description: Workflow name
 *                 content: 
 *                   type: object
 *                   description: Workflow definition
 *                 enabled: 
 *                   type: boolean
 *                   description: Whether the workflow is enabled
 *                 updatedAt: 
 *                   type: string
 *                   description: Last update timestamp
 *       404:
 *         description: Workflow not found
 */

/**
 * @openapi
 * /api/workflows:
 *   post:
 *     summary: Create a new workflow
 *     description: Create a new workflow with the provided definition
 *     tags:
 *       - Workflow Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: 
 *                 type: string
 *                 description: Workflow name
 *               content: 
 *                 type: object
 *                 description: Workflow definition
 *               enabled: 
 *                 type: boolean
 *                 description: Whether the workflow is enabled (default: true)
 *             required:
 *               - name
 *               - content
 *             example:
 *               name: "My Workflow"
 *               content: { "nodes": [], "connections": [] }
 *               enabled: true
 *     responses:
 *       200:
 *         description: Workflow created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: 
 *                   type: string
 *                   description: Workflow ID
 *                 name: 
 *                   type: string
 *                   description: Workflow name
 *                 content: 
 *                   type: object
 *                   description: Workflow definition
 *                 enabled: 
 *                   type: boolean
 *                   description: Whether the workflow is enabled
 *                 updatedAt: 
 *                   type: string
 *                   description: Creation timestamp
 */

/**
 * @openapi
 * /api/workflows/{id}:
 *   put:
 *     summary: Update a workflow
 *     description: Update an existing workflow by its ID
 *     tags:
 *       - Workflow Management
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: 
 *                 type: string
 *                 description: Workflow name
 *               content: 
 *                 type: object
 *                 description: Workflow definition
 *               enabled: 
 *                 type: boolean
 *                 description: Whether the workflow is enabled
 *             example:
 *               name: "Updated Workflow"
 *               enabled: false
 *     responses:
 *       200:
 *         description: Workflow updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: 
 *                   type: string
 *                   description: Workflow ID
 *                 name: 
 *                   type: string
 *                   description: Workflow name
 *                 content: 
 *                   type: object
 *                   description: Workflow definition
 *                 enabled: 
 *                   type: boolean
 *                   description: Whether the workflow is enabled
 *                 updatedAt: 
 *                   type: string
 *                   description: Update timestamp
 *       404:
 *         description: Workflow not found
 */

/**
 * @openapi
 * /api/workflows/{id}:
 *   delete:
 *     summary: Delete a workflow
 *     description: Delete an existing workflow by its ID
 *     tags:
 *       - Workflow Management
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                   description: Whether the deletion was successful
 *       404:
 *         description: Workflow not found
 */
app.get('/api/workflows', (req, res) => {
    let workflows = readWorkflows().map((w: any) => ({
        id: w.id,
        name: w.name,
        updatedAt: w.updatedAt,
        enabled: (w.enabled !== false) && (!w.content || w.content.enabled !== false),
    }));

    // Filter
    const search = req.query.search as string;
    if (search) {
        workflows = workflows.filter((w: any) => w.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Sort
    const sortBy = (req.query.sortBy as string) || 'updatedAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    
    workflows.sort((a: any, b: any) => {
        const valA = a[sortBy];
        const valB = b[sortBy];
        
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination
    console.log('--- Executing GET /api/workflows (Updated) ---');
    const total = workflows.length;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const paginatedWorkflows = workflows.slice(offset, offset + limit);

    res.json({
        data: paginatedWorkflows,
        total,
        limit,
        offset
    });
});

app.get('/api/workflows/:id', (req, res) => {
    const w = readWorkflows().find((w: any) => w.id === req.params.id);
    w ? res.json(w) : res.status(404).json({ error: 'Not found' });
});

app.post('/api/workflows', (req, res) => {
    const w = {
        id: Date.now().toString(),
        name: req.body.name,
        content: req.body.content,
        enabled: req.body.enabled ?? true,
        updatedAt: new Date().toISOString()
    };
    writeWorkflow(w);
    loadAndScheduleWorkflows();
    res.json(w);
});

app.put('/api/workflows/:id', (req, res) => {
    const workflows = readWorkflows();
    const existing = workflows.find((w: any) => w.id === req.params.id);
    if (existing) {
        const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
        writeWorkflow(updated);
        loadAndScheduleWorkflows();
        res.json(updated);
    } else res.status(404).json({ error: 'Not found' });
});

app.delete('/api/workflows/:id', (req, res) => {
    const workflows = readWorkflows();
    const exists = workflows.some((w: any) => w.id === req.params.id);
    if (exists) {
        deleteWorkflow(req.params.id);
        loadAndScheduleWorkflows();
        res.json({ success: true });
    } else res.status(404).json({ error: 'Not found' });
});

// --- Secrets API --- 
/**
 * @openapi
 * /api/secrets:
 *   get:
 *     summary: Get all secrets
 *     description: Retrieve a list of all secrets
 *     tags:
 *       - Secrets Management
 *     responses:
 *       200:
 *         description: Secrets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: 
 *                     type: string
 *                     description: Secret ID
 *                   name: 
 *                     type: string
 *                     description: Secret name
 *                   type: 
 *                     type: string
 *                     description: Secret type
 *                   data: 
 *                     type: object
 *                     description: Secret data
 *                   updatedAt: 
 *                     type: string
 *                     description: Last update timestamp
 */

/**
 * @openapi
 * /api/secrets:
 *   post:
 *     summary: Create or update a secret
 *     description: Create a new secret or update an existing one
 *     tags:
 *       - Secrets Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id: 
 *                 type: string
 *                 description: Secret ID (optional, will be generated if not provided)
 *               name: 
 *                 type: string
 *                 description: Secret name
 *               type: 
 *                 type: string
 *                 description: Secret type
 *               data: 
 *                 type: object
 *                 description: Secret data
 *             example:
 *               name: "API_KEY"
 *               type: "string"
 *               data: { "value": "secret_key_123" }
 *     responses:
 *       200:
 *         description: Secret created or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: 
 *                   type: string
 *                   description: Secret ID
 *                 name: 
 *                   type: string
 *                   description: Secret name
 *                 type: 
 *                   type: string
 *                   description: Secret type
 *                 data: 
 *                   type: object
 *                   description: Secret data
 *                 updatedAt: 
 *                   type: string
 *                   description: Last update timestamp
 */

/**
 * @openapi
 * /api/secrets/{id}:
 *   delete:
 *     summary: Delete a secret
 *     description: Delete an existing secret by its ID
 *     tags:
 *       - Secrets Management
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Secret ID
 *     responses:
 *       200:
 *         description: Secret deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                   description: Whether the deletion was successful
 */
app.get('/api/secrets', (req, res) => res.json(readJson(SECRETS_FILE)));
app.post('/api/secrets', (req, res) => {
    const all = readJson(SECRETS_FILE);
    const s = { id: req.body.id || Date.now().toString(), name: req.body.name, type: req.body.type, data: req.body.data, updatedAt: new Date().toISOString() };
    const idx = all.findIndex((i: any) => i.id === s.id);
    if (idx !== -1) all[idx] = s; else all.push(s);
    writeJson(SECRETS_FILE, all);
    res.json(s);
});
app.delete('/api/secrets/:id', (req, res) => {
    const all = readJson(SECRETS_FILE).filter((s: any) => s.id !== req.params.id);
    writeJson(SECRETS_FILE, all);
    res.json({ success: true });
});

// --- APIs API --- 
/**
 * @openapi
 * /api/apis:
 *   get:
 *     summary: Get all APIs
 *     description: Retrieve a list of all APIs
 *     tags:
 *       - API Management
 *     responses:
 *       200:
 *         description: APIs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: 
 *                     type: string
 *                     description: API ID
 *                   updatedAt: 
 *                     type: string
 *                     description: Last update timestamp
 */

/**
 * @openapi
 * /api/apis:
 *   post:
 *     summary: Create or update an API
 *     description: Create a new API or update an existing one
 *     tags:
 *       - API Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id: 
 *                 type: string
 *                 description: API ID (optional, will be generated if not provided)
 *               name: 
 *                 type: string
 *                 description: API name
 *               url: 
 *                 type: string
 *                 description: API URL
 *               method: 
 *                 type: string
 *                 description: HTTP method
 *               headers: 
 *                 type: object
 *                 description: HTTP headers
 *             example:
 *               name: "Weather API"
 *               url: "https://api.weather.com/v1/current.json"
 *               method: "GET"
 *               headers: { "Authorization": "Bearer token" }
 *     responses:
 *       200:
 *         description: API created or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: 
 *                   type: string
 *                   description: API ID
 *                 updatedAt: 
 *                   type: string
 *                   description: Last update timestamp
 */

/**
 * @openapi
 * /api/apis/{id}:
 *   delete:
 *     summary: Delete an API
 *     description: Delete an existing API by its ID
 *     tags:
 *       - API Management
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API ID
 *     responses:
 *       200:
 *         description: API deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                   description: Whether the deletion was successful
 */
app.get('/api/apis', (req, res) => res.json(readJson(APIS_FILE)));
app.post('/api/apis', (req, res) => {
    const all = readJson(APIS_FILE);
    const a = { id: req.body.id || Date.now().toString(), ...req.body, updatedAt: new Date().toISOString() };
    const idx = all.findIndex((i: any) => i.id === a.id);
    if (idx !== -1) all[idx] = a; else all.push(a);
    writeJson(APIS_FILE, all);
    res.json(a);
});
app.delete('/api/apis/:id', (req, res) => {
    const all = readJson(APIS_FILE).filter((a: any) => a.id !== req.params.id);
    writeJson(APIS_FILE, all);
    res.json({ success: true });
});

// --- gRPC Plugins API --- 
/**
 * @openapi
 * /api/plugins:
 *   get:
 *     summary: Get all gRPC plugins
 *     description: Retrieve a list of all registered gRPC plugins
 *     tags:
 *       - Plugins Management
 *     responses:
 *       200:
 *         description: Plugins retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   kind: 
 *                     type: string
 *                     description: Plugin kind
 *                   name: 
 *                     type: string
 *                     description: Plugin name
 *                   endpoint: 
 *                     type: string
 *                     description: Plugin endpoint
 *                   enabled: 
 *                     type: boolean
 *                     description: Whether the plugin is enabled
 *                   status: 
 *                     type: string
 *                     description: Plugin status
 *                   lastHealthCheck: 
 *                     type: string
 *                     description: Last health check timestamp
 *                   error: 
 *                     type: string
 *                     description: Error message if any
 *                   description: 
 *                     type: string
 *                     description: Plugin description
 *                   version: 
 *                     type: string
 *                     description: Plugin version
 *                   category: 
 *                     type: string
 *                     description: Plugin category
 */

/**
 * @openapi
 * /api/plugins/{kind}:
 *   get:
 *     summary: Get a plugin by kind
 *     description: Retrieve a specific plugin by its kind
 *     tags:
 *       - Plugins Management
 *     parameters:
 *       - in: path
 *         name: kind
 *         required: true
 *         schema:
 *           type: string
 *         description: Plugin kind
 *     responses:
 *       200:
 *         description: Plugin retrieved successfully
 *       404:
 *         description: Plugin not found
 */

/**
 * @openapi
 * /api/plugins/reload:
 *   post:
 *     summary: Reload all plugins
 *     description: Reload all gRPC plugins from the configuration file
 *     tags:
 *       - Plugins Management
 *     responses:
 *       200:
 *         description: Plugins reloaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                   description: Whether the reload was successful
 *                 message: 
 *                   type: string
 *                   description: Reload result message
 *       500:
 *         description: Failed to reload plugins
 */

/**
 * @openapi
 * /api/plugins:
 *   post:
 *     summary: Register a plugin
 *     description: Manually register a new gRPC plugin
 *     tags:
 *       - Plugins Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kind: 
 *                 type: string
 *                 description: Plugin kind
 *               name: 
 *                 type: string
 *                 description: Plugin name
 *               endpoint: 
 *                 type: string
 *                 description: Plugin endpoint
 *               enabled: 
 *                 type: boolean
 *                 description: Whether the plugin is enabled
 *             example:
 *               kind: "custom-plugin"
 *               name: "My Custom Plugin"
 *               endpoint: "localhost:50051"
 *               enabled: true
 *     responses:
 *       200:
 *         description: Plugin registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                   description: Whether the registration was successful
 *                 message: 
 *                   type: string
 *                   description: Registration result message
 *       400:
 *         description: Failed to register plugin
 *       500:
 *         description: Internal server error during plugin registration
 */

/**
 * @openapi
 * /api/plugins/{kind}:
 *   delete:
 *     summary: Unregister a plugin
 *     description: Unregister an existing gRPC plugin by its kind
 *     tags:
 *       - Plugins Management
 *     parameters:
 *       - in: path
 *         name: kind
 *         required: true
 *         schema:
 *           type: string
 *         description: Plugin kind
 *     responses:
 *       200:
 *         description: Plugin unregistered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: 
 *                   type: boolean
 *                   description: Whether the unregistration was successful
 *                 message: 
 *                   type: string
 *                   description: Unregistration result message
 *       404:
 *         description: Plugin not found
 */

/**
 * @openapi
 * /api/plugins/{kind}/health:
 *   post:
 *     summary: Check plugin health
 *     description: Perform a health check on a specific plugin
 *     tags:
 *       - Plugins Management
 *     parameters:
 *       - in: path
 *         name: kind
 *         required: true
 *         schema:
 *           type: string
 *         description: Plugin kind
 *     responses:
 *       200:
 *         description: Health check performed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 healthy: 
 *                   type: boolean
 *                   description: Whether the plugin is healthy
 *       500:
 *         description: Failed to perform health check
 */

// 获取所有已注册的插件
// 获取所有已注册的插件
app.get('/api/plugins', (req, res) => {
    const plugins = GrpcPluginManager.getPlugins();
    res.json(plugins.map(p => {
        const nodePlugin = Registry.get(p.config.kind);
        // Exclude runner as it may contain methods/circular refs not suitable for JSON
        let safeNodePlugin = undefined;
        if (nodePlugin) {
            const { runner, ...rest } = nodePlugin;
            safeNodePlugin = rest;
        }

        return {
            kind: p.config.kind,
            name: p.config.name,
            endpoint: p.config.endpoint,
            enabled: p.config.enabled,
            status: p.status,
            lastHealthCheck: p.lastHealthCheck,
            error: p.error,
            description: p.config.description || p.metadata?.description,
            version: p.config.version || p.metadata?.version,
            category: p.config.category || p.metadata?.category,
            nodePlugin: safeNodePlugin, // Include the full node definition (sans runner)
        };
    }));
});

// 获取单个插件状态
app.get('/api/plugins/:kind', (req, res) => {
    const plugin = GrpcPluginManager.getPluginStatus(req.params.kind);
    if (plugin) {
        res.json(plugin);
    } else {
        res.status(404).json({ error: 'Plugin not found' });
    }
});

// 重新加载所有插件
app.post('/api/plugins/reload', async (req, res) => {
    try {
        await GrpcPluginManager.reloadPlugins(PLUGINS_CONFIG_FILE);
        res.json({ success: true, message: 'Plugins reloaded' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 手动注册插件
app.post('/api/plugins', async (req, res) => {
    try {
        const config = req.body;
        const success = await GrpcPluginManager.registerPlugin(config);
        if (success) {
            res.json({ success: true, message: 'Plugin registered' });
        } else {
            res.status(400).json({ error: 'Failed to register plugin' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 卸载插件
app.delete('/api/plugins/:kind', (req, res) => {
    const success = GrpcPluginManager.unregisterPlugin(req.params.kind);
    if (success) {
        res.json({ success: true, message: 'Plugin unregistered' });
    } else {
        res.status(404).json({ error: 'Plugin not found' });
    }
});

// 健康检查单个插件
app.post('/api/plugins/:kind/health', async (req, res) => {
    try {
        const isHealthy = await GrpcPluginManager.checkHealth(req.params.kind);
        res.json({ healthy: isHealthy });
    } catch (error: any) {
        res.status(500).json({ healthy: false, error: error.message });
    }
});

app.listen(PORT, () => logger.info(`Server running on http://localhost:${PORT}`));