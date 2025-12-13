
import { CredentialItem, WorkflowDefinition, NodeExecutionResult } from '../types';

// Allow environment variable override, safely check import.meta.env
const API_BASE = import.meta.env?.VITE_API_BASE || 'http://localhost:3001/api';

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
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedWorkflows {
  data: WorkflowRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface QueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExecutionHistoryItem {
  id: string;
  workflow_id: string;
  status: 'success' | 'error' | 'running';
  trigger_type: string;
  trigger_by?: string;
  created_at: string;
  finished_at?: string;
  duration_ms?: number;
  logs?: string[];
  output_data?: any;
  error_message?: string;
}

export interface PaginatedExecutions {
  data: ExecutionHistoryItem[];
  total: number;
  limit: number;
  offset: number;
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

export interface ServerExecutionResponse {
  results: Record<string, NodeExecutionResult>;
  logs: string[];
  executionId?: string;
  status?: string;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  params: { key: string; value: string; enabled: boolean }[];
  body: string; // JSON string or plain text
  updatedAt?: string;
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
    const raw = await res.json();
    if (!res.ok) {
      throw new Error(raw?.error?.message || raw?.error || 'Failed to fetch workflows');
    }
    const list = Array.isArray(raw?.data) ? raw.data : [];
    return list.map((w: any) => ({
      id: w.id,
      name: w.name,
      updatedAt: w.updated_at || w.updatedAt || new Date().toISOString()
    }));
  }

  async getWorkflowsPaginated(params: QueryParams = {}): Promise<PaginatedWorkflows> {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v != null && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();

    const res = await fetch(`${API_BASE}/workflows${queryString ? '?' + queryString : ''}`, {
      headers: this.getHeaders()
    });
    const raw = await res.json();
    if (!res.ok) {
      throw new Error(raw?.error?.message || raw?.error || 'Failed to fetch workflows');
    }
    console.log("res==>", raw)

    const list = Array.isArray(raw?.data) ? raw.data : [];
    const data = list.map((w: any) => ({
      ...w,
      updatedAt: w.updated_at || w.updatedAt || new Date().toISOString()
    }));

    return {
      data,
      total: raw.total || 0,
      limit: raw.limit || 10,
      offset: raw.offset || 0
    };
  }

  async getWorkflow(id: string): Promise<WorkflowRecord> {
    const res = await fetch(`${API_BASE}/workflows/${id}`, { headers: this.getHeaders() });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to fetch workflow');
    return raw?.data ?? raw;
  }

  async createWorkflow(name: string, content: WorkflowDefinition): Promise<WorkflowRecord> {
    const res = await fetch(`${API_BASE}/workflows`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, content })
    });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to create workflow');
    return raw?.data ?? raw;
  }

  async updateWorkflow(id: string, name: string, content: WorkflowDefinition): Promise<WorkflowRecord> {
    const res = await fetch(`${API_BASE}/workflows/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, content })
    });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to update workflow');
    return raw?.data ?? raw;
  }

  async deleteWorkflow(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/workflows/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete workflow');
  }

  async executeWorkflowById(id: string, input?: any): Promise<ServerExecutionResponse> {
    const res = await fetch(`${API_BASE}/workflows/${id}/execute`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ input })
    });

    const raw = await res.json();
    if (!res.ok) {
      throw new Error(raw?.error?.message || raw?.error || 'Workflow execution failed');
    }
    return raw?.data ?? raw;
  }

  async getWorkflowExecutions(
    id: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedExecutions> {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v != null)
        .map(([k, v]) => [k, String(v)])
    ).toString();

    const res = await fetch(
      `${API_BASE}/workflows/${id}/executions${queryString ? '?' + queryString : ''}`,
      { headers: this.getHeaders() }
    );
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to fetch executions');
    const meta = raw?.meta || {};
    return {
      data: Array.isArray(raw?.data) ? raw.data : [],
      total: typeof meta.total === 'number' ? meta.total : (raw?.total ?? 0),
      limit: typeof meta.limit === 'number' ? meta.limit : (params.limit ?? 0),
      offset: typeof meta.offset === 'number' ? meta.offset : (params.offset ?? 0),
    };
  }

  // --- Secrets ---

  async getSecrets(): Promise<CredentialItem[]> {
    const res = await fetch(`${API_BASE}/secrets`, { headers: this.getHeaders() });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to fetch secrets');
    return raw?.data ?? raw;
  }

  async saveSecret(secret: CredentialItem): Promise<CredentialItem> {
    const res = await fetch(`${API_BASE}/secrets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(secret)
    });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to save secret');
    return raw?.data ?? raw;
  }

  async deleteSecret(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/secrets/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete secret');
  }

  // --- API Management ---

  async getApis(): Promise<ApiRequest[]> {
    const res = await fetch(`${API_BASE}/apis`, { headers: this.getHeaders() });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to fetch APIs');
    return raw?.data ?? raw;
  }

  async saveApi(apiReq: ApiRequest): Promise<ApiRequest> {
    const res = await fetch(`${API_BASE}/apis`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(apiReq)
    });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to save API');
    return raw?.data ?? raw;
  }

  async deleteApi(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/apis/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete API');
  }

  // --- Execution & Proxy ---

  async executeWorkflow(workflow: WorkflowDefinition, workflowId?: string): Promise<ServerExecutionResponse> {
    const res = await fetch(`${API_BASE}/execute`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ workflow, workflowId })
    });
    const raw = await res.json();
    if (!res.ok) {
      throw new Error(raw?.error?.message || raw?.error || 'Server execution failed');
    }
    return raw?.data ?? raw;
  }

  async proxyRequest(method: string, url: string, headers?: any, body?: any, params?: any): Promise<any> {
    let res;
    try {
      res = await fetch(`${API_BASE}/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, url, headers, body, params })
      });
    } catch (err: any) {
      throw new Error(`Failed to connect to backend proxy: ${err.message}. Is the server running on port 3001?`);
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const text = await res.text();
      const titleMatch = text.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : 'Unknown Error';
      throw new Error(`Backend returned HTML (Status ${res.status} ${res.statusText}): "${title}". The server might be down, the proxy path is incorrect, or the target URL is returning HTML.`);
    }

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e: any) {
      if (text.trim().startsWith('<')) {
        console.error("Proxy returned HTML:", text);
        throw new Error(`Backend server returned HTML (Status ${res.status}). The server might be down or the proxy path is incorrect.`);
      }
      throw new Error(`Invalid JSON response from server (Status ${res.status}): ${e.message}`);
    }
  }
}

export const api = new ApiClient();
