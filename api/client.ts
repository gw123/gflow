
import { CredentialItem, WorkflowDefinition } from '../types';

const API_BASE = 'http://localhost:3001/api';

export interface WorkflowSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  content: WorkflowDefinition;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage if available on client side
    if (typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken() {
    return this.token;
  }

  // --- Auth ---

  async register(username: string, password: string, email?: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Registration failed');
    }
    return res.json();
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }
    const data = await res.json();
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders()
    });
    if (!res.ok) {
        this.setToken(null); // Invalid token, clear it
        throw new Error('Failed to fetch user');
    }
    return res.json();
  }

  logout() {
    this.setToken(null);
  }

  // --- Workflows ---

  async getWorkflows(): Promise<WorkflowSummary[]> {
    const res = await fetch(`${API_BASE}/workflows`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch workflows');
    return res.json();
  }

  async getWorkflow(id: string): Promise<WorkflowRecord> {
    const res = await fetch(`${API_BASE}/workflows/${id}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch workflow');
    return res.json();
  }

  async createWorkflow(name: string, content: WorkflowDefinition): Promise<WorkflowRecord> {
    const res = await fetch(`${API_BASE}/workflows`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, content })
    });
    if (!res.ok) throw new Error('Failed to create workflow');
    return res.json();
  }

  async updateWorkflow(id: string, name: string, content: WorkflowDefinition): Promise<WorkflowRecord> {
    const res = await fetch(`${API_BASE}/workflows/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, content })
    });
    if (!res.ok) throw new Error('Failed to update workflow');
    return res.json();
  }

  async deleteWorkflow(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/workflows/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete workflow');
  }

  // --- Secrets ---

  async getSecrets(): Promise<CredentialItem[]> {
    const res = await fetch(`${API_BASE}/secrets`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch secrets');
    return res.json();
  }

  async saveSecret(secret: CredentialItem): Promise<CredentialItem> {
    const res = await fetch(`${API_BASE}/secrets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(secret)
    });
    if (!res.ok) throw new Error('Failed to save secret');
    return res.json();
  }

  async deleteSecret(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/secrets/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete secret');
  }
}

export const api = new ApiClient();
