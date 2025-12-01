
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cron from 'node-cron';
import { ServerWorkflowEngine } from './engine';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use require for JSON loading in Node environment to be safe
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

const DATA_DIR = path.join(__dirname, 'data');
const WORKFLOWS_FILE = path.join(DATA_DIR, 'workflows.json');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const APIS_FILE = path.join(DATA_DIR, 'apis.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// --- SERVER EXECUTION API ---
app.post('/api/execute', async (req, res) => {
    const { workflow, workflowId } = req.body;
    let targetWorkflow = workflow;

    if (!targetWorkflow && workflowId) {
        const workflows = readJson(WORKFLOWS_FILE);
        const record = workflows.find((w: any) => w.id === workflowId);
        if (record) targetWorkflow = record.content;
    }

    if (!targetWorkflow) {
        return res.status(400).json({ error: "No workflow provided" });
    }

    try {
        const engine = new ServerWorkflowEngine(targetWorkflow);
        const result = await engine.run();
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Existing APIs (Preserved) ---

// Proxy API
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

// Auth
app.post('/api/auth/register', (req, res) => {
  const users = readJson(USERS_FILE);
  const { username, password, email } = req.body;
  if (users.find((u: any) => u.username === username)) return res.status(400).json({ error: 'Username exists' });
  const newUser = { id: Date.now().toString(), username, password, email, createdAt: new Date().toISOString() };
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

// CRUD
app.get('/api/workflows', (req, res) => res.json(readJson(WORKFLOWS_FILE).map((w: any) => ({ id: w.id, name: w.name, updatedAt: w.updatedAt }))));
app.get('/api/workflows/:id', (req, res) => {
    const w = readJson(WORKFLOWS_FILE).find((w: any) => w.id === req.params.id);
    w ? res.json(w) : res.status(404).json({error: 'Not found'});
});
app.post('/api/workflows', (req, res) => {
    const w = { id: Date.now().toString(), name: req.body.name, content: req.body.content, updatedAt: new Date().toISOString() };
    const all = readJson(WORKFLOWS_FILE);
    all.push(w);
    writeJson(WORKFLOWS_FILE, all);
    res.json(w);
});
app.put('/api/workflows/:id', (req, res) => {
    const all = readJson(WORKFLOWS_FILE);
    const idx = all.findIndex((w: any) => w.id === req.params.id);
    if(idx !== -1) {
        all[idx] = { ...all[idx], ...req.body, updatedAt: new Date().toISOString() };
        writeJson(WORKFLOWS_FILE, all);
        res.json(all[idx]);
    } else res.status(404).json({error: 'Not found'});
});
app.delete('/api/workflows/:id', (req, res) => {
    const all = readJson(WORKFLOWS_FILE).filter((w: any) => w.id !== req.params.id);
    writeJson(WORKFLOWS_FILE, all);
    res.json({success: true});
});

app.get('/api/secrets', (req, res) => res.json(readJson(SECRETS_FILE)));
app.post('/api/secrets', (req, res) => {
    const all = readJson(SECRETS_FILE);
    const s = { id: req.body.id || Date.now().toString(), name: req.body.name, type: req.body.type, data: req.body.data, updatedAt: new Date().toISOString() };
    const idx = all.findIndex((i: any) => i.id === s.id);
    if(idx !== -1) all[idx] = s; else all.push(s);
    writeJson(SECRETS_FILE, all);
    res.json(s);
});
app.delete('/api/secrets/:id', (req, res) => {
    const all = readJson(SECRETS_FILE).filter((s: any) => s.id !== req.params.id);
    writeJson(SECRETS_FILE, all);
    res.json({success: true});
});

app.get('/api/apis', (req, res) => res.json(readJson(APIS_FILE)));
app.post('/api/apis', (req, res) => {
    const all = readJson(APIS_FILE);
    const a = { id: req.body.id || Date.now().toString(), ...req.body, updatedAt: new Date().toISOString() };
    const idx = all.findIndex((i: any) => i.id === a.id);
    if(idx !== -1) all[idx] = a; else all.push(a);
    writeJson(APIS_FILE, all);
    res.json(a);
});
app.delete('/api/apis/:id', (req, res) => {
    const all = readJson(APIS_FILE).filter((a: any) => a.id !== req.params.id);
    writeJson(APIS_FILE, all);
    res.json({success: true});
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
