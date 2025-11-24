
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const DATA_DIR = path.join(__dirname, 'data');
const WORKFLOWS_FILE = path.join(DATA_DIR, 'workflows.json');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

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

// --- Auth API ---

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
    password, // Note: In a real production app, passwords must be hashed!
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
    // Simple mock token generation for prototype
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    res.json({ user: userWithoutPass, token: `mock-token-${token}-${user.id}` });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1]; // Bearer token
  if (!token || !token.startsWith('mock-token-')) return res.status(401).json({ error: 'Invalid token' });
  
  // Extract user ID from the end of our mock token
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
  // Return list with summary info
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
    id: Date.now().toString(), // Simple ID generation
    name: req.body.name || 'Untitled Workflow',
    content: req.body.content || {}, // The YAML content or JSON structure
    updatedAt: new Date().toISOString()
  };
  workflows.push(newWorkflow);
  writeJson(WORKFLOWS_FILE, workflows);
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
    res.json(workflows[index]);
  } else {
    res.status(404).json({ error: 'Workflow not found' });
  }
});

app.delete('/api/workflows/:id', (req, res) => {
  let workflows = readJson(WORKFLOWS_FILE);
  workflows = workflows.filter(w => w.id !== req.params.id);
  writeJson(WORKFLOWS_FILE, workflows);
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
  
  // Check if update or create based on ID
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

app.listen(PORT, () => {
  console.log(`Workflow Server running at http://localhost:${PORT}`);
});
