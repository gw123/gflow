import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { ServerWorkflowEngine } from './engine';
import { GrpcPluginManager } from '../runners/grpc/server';
import { Registry } from '../registry';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_DIR = path.join(__dirname, '../../config');
const WORKFLOWS_FILE = path.join(DATA_DIR, 'workflows.json');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const APIS_FILE = path.join(DATA_DIR, 'apis.json');
const PLUGINS_CONFIG_FILE = path.join(CONFIG_DIR, 'plugins.yaml');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
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

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json() as any);

// --- SCHEDULER SYSTEM ---
// Map to store active cron jobs
const activeJobs = new Map<string, any>();

const loadAndScheduleWorkflows = () => {
    console.log("Loading scheduled workflows...");
    const workflows = readJson(WORKFLOWS_FILE);

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
                console.log(`Scheduling workflow [${wf.name}] with cron: ${schedule}`);
                const job = cron.schedule(schedule, async () => {
                    console.log(`[Cron] Triggering workflow ${wf.name}`);
                    try {
                        const engine = new ServerWorkflowEngine(wf);
                        await engine.run();
                    } catch (err) {
                        console.error(`[Cron] Error executing ${wf.name}:`, err);
                    }
                });
                activeJobs.set(wfRecord.id, job);
            }
        }
    });
};

// Initialize Scheduler
loadAndScheduleWorkflows();

// Watch workflows file changes to reschedule dynamically
try {
    if (fs.existsSync(WORKFLOWS_FILE)) {
        fs.watchFile(WORKFLOWS_FILE, { interval: 2000 }, () => {
            try {
                loadAndScheduleWorkflows();
            } catch (e) {
                console.warn('[Scheduler] Failed to reload workflows on change:', (e as any)?.message || e);
            }
        });
        console.log('[Scheduler] Workflows file watcher started');
    }
} catch (e) {
    console.warn('[Scheduler] Failed to start workflows watcher:', (e as any)?.message || e);
}

// Initialize gRPC Plugins
const initializeGrpcPlugins = async () => {
    if (fs.existsSync(PLUGINS_CONFIG_FILE)) {
        try {
            console.log('[Server] Loading gRPC plugins from:', PLUGINS_CONFIG_FILE);
            await GrpcPluginManager.loadFromConfig(PLUGINS_CONFIG_FILE);
            console.log('[Server] gRPC plugins loaded successfully');
        } catch (error) {
            console.error('[Server] Failed to load gRPC plugins:', error);
        }
    } else {
        console.log('[Server] No plugins config found at:', PLUGINS_CONFIG_FILE);
    }
};

// Run async initialization
initializeGrpcPlugins().catch(console.error);


// --- SERVER EXECUTION API ---
app.post('/api/execute', async (req, res) => {
    const { workflow, workflowId } = req.body;
    let targetWorkflow = workflow;

    if (!targetWorkflow && workflowId) {
        const workflows = readJson(WORKFLOWS_FILE);
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
        console.error("Execution Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- Proxy API ---
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
app.get('/api/workflows', (req, res) =>
    res.json(
        readJson(WORKFLOWS_FILE).map((w: any) => ({
            id: w.id,
            name: w.name,
            updatedAt: w.updatedAt,
            enabled: (w.enabled !== false) && (!w.content || w.content.enabled !== false),
        }))
    )
);

app.get('/api/workflows/:id', (req, res) => {
    const w = readJson(WORKFLOWS_FILE).find((w: any) => w.id === req.params.id);
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
    const all = readJson(WORKFLOWS_FILE);
    all.push(w);
    writeJson(WORKFLOWS_FILE, all);
    loadAndScheduleWorkflows();
    res.json(w);
});

app.put('/api/workflows/:id', (req, res) => {
    const all = readJson(WORKFLOWS_FILE);
    const idx = all.findIndex((w: any) => w.id === req.params.id);
    if (idx !== -1) {
        all[idx] = { ...all[idx], ...req.body, updatedAt: new Date().toISOString() };
        writeJson(WORKFLOWS_FILE, all);
        loadAndScheduleWorkflows();
        res.json(all[idx]);
    } else res.status(404).json({ error: 'Not found' });
});

app.delete('/api/workflows/:id', (req, res) => {
    const all = readJson(WORKFLOWS_FILE).filter((w: any) => w.id !== req.params.id);
    writeJson(WORKFLOWS_FILE, all);
    loadAndScheduleWorkflows();
    res.json({ success: true });
});

// --- Secrets API ---
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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));