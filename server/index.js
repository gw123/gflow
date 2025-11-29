
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');
const { WorkflowEngine } = require('./engine');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const DATA_DIR = path.join(__dirname, 'data');
const WORKFLOWS_FILE = path.join(DATA_DIR, 'workflows.json');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const APIS_FILE = path.join(DATA_DIR, 'apis.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Helper to read/write JSON
const readJson = (file) => {
  if (!fs.existsSync(file)) return [];
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

const writeJson = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// --- SCHEDULER SYSTEM ---
const activeJobs = new Map();

const loadAndScheduleWorkflows = () => {
    console.log("Loading scheduled workflows...");
    const workflows = readJson(WORKFLOWS_FILE);
    
    // Clear existing jobs
    activeJobs.forEach(job => job.stop());
    activeJobs.clear();

    workflows.forEach(wfRecord => {
        const wf = wfRecord.content;
        const timerNode = wf.nodes.find(n => n.type === 'timer');
        
        if (timerNode && timerNode.parameters) {
            // Check for cron expression or interval
            let schedule = null;
            if (timerNode.parameters.cron) {
                schedule = timerNode.parameters.cron;
            } else if (timerNode.parameters.secondsInterval) {
                // Convert seconds to cron loosely, or use interval? 
                // node-cron handles cron syntax. For simplicity, we assume cron input or default.
                // If pure seconds, we might need `setInterval`. Here we assume a valid cron for simplicity
                // or map simple intervals to cron (e.g. every minute)
                if (timerNode.parameters.secondsInterval >= 60) {
                   schedule = "* * * * *"; // Default fallback for demo
                }
            }

            if (schedule && cron.validate(schedule)) {
                console.log(`Scheduling workflow [${wf.name}] with cron: ${schedule}`);
                const job = cron.schedule(schedule, async () => {
                    console.log(`[Cron] Triggering workflow ${wf.name}`);
                    const engine = new WorkflowEngine(wf);
                    await engine.run();
                });
                activeJobs.set(wfRecord.id, job);
            }
        }
    });
};

// Initialize Scheduler
loadAndScheduleWorkflows();


// --- PROXY API (Solves CORS for Browser Runner) ---
app.post('/api/proxy', async (req, res) => {
    const { method, url, headers, body, params } = req.body;
    try {
        console.log(`[Proxy] ${method} ${url}`);
        const response = await axios({
            method,
            url,
            headers,
            data: body,
            params: params
        });
        res.json({
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            headers: response.headers,
            // Calculate basic timing/size if possible
            size: JSON.stringify(response.data).length
        });
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        res.status(status).json({
            error: error.message,
            status: status,
            statusText: error.response ? error.response.statusText : "Error",
            data: error.response ? error.response.data : null
        });
    }
});

// --- SERVER EXECUTION API ---
app.post('/api/execute', async (req, res) => {
    const { workflow, workflowId } = req.body;
    let targetWorkflow = workflow;

    if (!targetWorkflow && workflowId) {
        const workflows = readJson(WORKFLOWS_FILE);
        const record = workflows.find(w => w.id === workflowId);
        if (record) targetWorkflow = record.content;
    }

    if (!targetWorkflow) {
        return res.status(400).json({ error: "No workflow provided" });
    }

    try {
        const engine = new WorkflowEngine(targetWorkflow);
        const result = await engine.run();
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- Existing Auth API ---

app.post('/api/auth/register', (req, res) => {
  const users = readJson(USERS_FILE);
  const { username, password, email } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const newUser = {
    id: Date.now().toString(),
    username,
    password, 
    email: email || '',
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  writeJson(USERS_FILE, users);
  
  const { password: _, ...userWithoutPass } = newUser;
  res.json(userWithoutPass);
});

app.post('/api/auth/login', (req, res) => {
  const users = readJson(USERS_FILE);
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    const { password: _, ...userWithoutPass } = user;
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    res.json({ user: userWithoutPass, token: `mock-token-${token}-${user.id}` });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1]; 
  if (!token || !token.startsWith('mock-token-')) return res.status(401).json({ error: 'Invalid token' });
  
  const parts = token.split('-');
  const userId = parts[parts.length - 1];
  
  const users = readJson(USERS_FILE);
  const user = users.find(u => u.id === userId);
  
  if (user) {
    const { password: _, ...userWithoutPass } = user;
    res.json(userWithoutPass);
  } else {
    res.status(401).json({ error: 'User not found' });
  }
});

// --- Workflows API ---

app.get('/api/workflows', (req, res) => {
  const workflows = readJson(WORKFLOWS_FILE);
  const summary = workflows.map(w => ({
    id: w.id,
    name: w.name,
    updatedAt: w.updatedAt
  }));
  res.json(summary);
});

app.get('/api/workflows/:id', (req, res) => {
  const workflows = readJson(WORKFLOWS_FILE);
  const workflow = workflows.find(w => w.id === req.params.id);
  if (workflow) {
    res.json(workflow);
  } else {
    res.status(404).json({ error: 'Workflow not found' });
  }
});

app.post('/api/workflows', (req, res) => {
  const workflows = readJson(WORKFLOWS_FILE);
  const newWorkflow = {
    id: Date.now().toString(),
    name: req.body.name || 'Untitled Workflow',
    content: req.body.content || {}, 
    updatedAt: new Date().toISOString()
  };
  workflows.push(newWorkflow);
  writeJson(WORKFLOWS_FILE, workflows);
  
  // Refresh scheduler
  loadAndScheduleWorkflows();
  
  res.json(newWorkflow);
});

app.put('/api/workflows/:id', (req, res) => {
  const workflows = readJson(WORKFLOWS_FILE);
  const index = workflows.findIndex(w => w.id === req.params.id);
  if (index !== -1) {
    workflows[index] = {
      ...workflows[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    writeJson(WORKFLOWS_FILE, workflows);
    
    // Refresh scheduler
    loadAndScheduleWorkflows();

    res.json(workflows[index]);
  } else {
    res.status(404).json({ error: 'Workflow not found' });
  }
});

app.delete('/api/workflows/:id', (req, res) => {
  let workflows = readJson(WORKFLOWS_FILE);
  workflows = workflows.filter(w => w.id !== req.params.id);
  writeJson(WORKFLOWS_FILE, workflows);
  
  // Refresh scheduler
  loadAndScheduleWorkflows();
  
  res.json({ success: true });
});

// --- Secrets API ---

app.get('/api/secrets', (req, res) => {
  const secrets = readJson(SECRETS_FILE);
  res.json(secrets);
});

app.post('/api/secrets', (req, res) => {
  const secrets = readJson(SECRETS_FILE);
  const newSecret = {
    id: req.body.id || Date.now().toString(),
    name: req.body.name,
    type: req.body.type,
    data: req.body.data,
    updatedAt: new Date().toISOString()
  };
  
  const existingIndex = secrets.findIndex(s => s.id === newSecret.id);
  if (existingIndex !== -1) {
    secrets[existingIndex] = newSecret;
  } else {
    secrets.push(newSecret);
  }
  
  writeJson(SECRETS_FILE, secrets);
  res.json(newSecret);
});

app.delete('/api/secrets/:id', (req, res) => {
  let secrets = readJson(SECRETS_FILE);
  secrets = secrets.filter(s => s.id !== req.params.id);
  writeJson(SECRETS_FILE, secrets);
  res.json({ success: true });
});

// --- API Management API ---

app.get('/api/apis', (req, res) => {
  const apis = readJson(APIS_FILE);
  res.json(apis);
});

app.post('/api/apis', (req, res) => {
  const apis = readJson(APIS_FILE);
  const newApi = {
    id: req.body.id || Date.now().toString(),
    name: req.body.name || 'New Request',
    method: req.body.method || 'GET',
    url: req.body.url || '',
    headers: req.body.headers || [],
    params: req.body.params || [],
    body: req.body.body || '',
    updatedAt: new Date().toISOString()
  };
  
  const existingIndex = apis.findIndex(a => a.id === newApi.id);
  if (existingIndex !== -1) {
    apis[existingIndex] = newApi;
  } else {
    apis.push(newApi);
  }
  
  writeJson(APIS_FILE, apis);
  res.json(newApi);
});

app.delete('/api/apis/:id', (req, res) => {
  let apis = readJson(APIS_FILE);
  apis = apis.filter(a => a.id !== req.params.id);
  writeJson(APIS_FILE, apis);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Workflow Server running at http://localhost:${PORT}`);
});
