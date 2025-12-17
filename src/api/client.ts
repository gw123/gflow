
import { CredentialItem, WorkflowDefinition, NodeExecutionResult } from '../types';

// Allow environment variable override, safely check import.meta.env
const API_BASE = import.meta.env?.VITE_API_BASE || 'http://localhost:8100/api/v1';

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
  user_id: number;
  username: string;
  email?: string;
  mobile?: string;
  avatar?: string;
  roles?: string[];
  permissions?: string[];
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user_id: number;
  username: string;
  role?: Array<{ id: number; name: string; label: string }>;
}

export interface UserInfoResponse {
  user_id: number;
  username: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
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

export interface Plugin {
  id: number;
  name: string;
  kind: string;
  endpoint: string;
  enabled: boolean;
  health_check: boolean;
  description: string;
  version: string;
  user_id: number;
}

export interface CreatePluginRequest {
  name: string;
  kind: string;
  endpoint: string;
  enabled: boolean;
  health_check: boolean;
  description: string;
  version: string;
}

export interface UpdatePluginRequest {
  name: string;
  kind: string;
  endpoint: string;
  enabled: boolean;
  health_check: boolean;
  description: string;
  version: string;
}

export interface PaginatedPlugins {
  data: Plugin[];
  pagination: {
    total_count: number;
    has_more: boolean;
    last_id: number;
    page_size: number;
    page_num: number;
  };
}

export interface ApiResponse<T> {
  code: string;
  code_en: string;
  message?: string;
  data?: T;
  pagination?: any;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage if available on client side
    if (typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  // Initialize token from localStorage (call this on app startup)
  initializeToken() {
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

  // Debug: Check token status
  debugTokenStatus() {
    console.log('[API Debug] Token in memory:', this.token ? this.token.substring(0, 20) + '...' : 'null');
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('auth_token');
      console.log('[API Debug] Token in localStorage:', stored ? stored.substring(0, 20) + '...' : 'null');
    }
  }

  // --- Auth ---

  /**
   * 用户注册
   * POST /api/v1/auth/register
   */
  async register(username: string, password: string, email: string, mobile: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, mobile })
    });
    const raw = await res.json();
    if (!res.ok) {
      throw new Error(raw?.message || raw?.error || 'Registration failed');
    }
    return raw;
  }

  /**
   * 用户登录
   * POST /api/v1/auth/login
   */
  async login(username?: string, password?: string, mobile?: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, mobile })
    });
    const raw = await res.json();
    
    console.log('[API] Login response:', raw);
    
    // Check for error code in response (backend returns code field for errors)
    if (raw?.code && raw.code !== '0' && raw.code !== '200') {
      throw new Error(raw?.message || raw?.error || 'Login failed');
    }
    
    if (!res.ok) {
      throw new Error(raw?.message || raw?.error || 'Login failed');
    }
    
    // Extract data from response (success data is nested in data field)
    const authData = raw?.data || raw;
    console.log('[API] Auth data extracted:', authData);
    
    if (authData?.token) {
      console.log('[API] Setting token:', authData.token);
      this.setToken(authData.token);
    } else {
      console.warn('[API] No token found in auth response');
    }
    return authData;
  }

  /**
   * 获取当前用户信息
   * GET /api/v1/user/userInfo
   */
  async getMe(): Promise<UserInfoResponse> {
    // If no token, skip the request
    if (!this.token) {
      console.warn('[API] No token available for getMe()');
      throw new Error('No authentication token available');
    }
    
    console.log('[API] Fetching user info with token:', this.token.substring(0, 20) + '...');
    
    const res = await fetch(`${API_BASE}/user/userInfo`, {
      headers: this.getHeaders()
    });
    const raw = await res.json();
    
    console.log('[API] User info response:', raw, 'Status:', res.status);
    
    // Check for error code in response
    if (raw?.code && raw.code !== '0' && raw.code !== '200') {
      this.setToken(null); // Invalid token, clear it
      throw new Error(raw?.message || raw?.error || 'Failed to fetch user');
    }
    
    if (!res.ok) {
      this.setToken(null); // Invalid token, clear it
      throw new Error(raw?.message || raw?.error || 'Failed to fetch user');
    }
    
    // Extract data from response (success data is nested in data field)
    return raw?.data ?? raw;
  }

  /**
   * 用户登出
   * GET /api/v1/auth/logout
   */
  async logout(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!res.ok) {
        console.warn('Logout request failed, but clearing local token anyway');
      }
    } catch (err) {
      console.warn('Logout request error:', err);
    }
    this.setToken(null);
  }

  // --- Workflows ---

  /**
   * 获取工作流列表
   * GET /api/v1/workflow/workflowList
   */
  async getWorkflows(): Promise<WorkflowSummary[]> {
    const res = await fetch(`${API_BASE}/workflow/workflowList`, { headers: this.getHeaders() });
    const raw = await res.json();
    if (!res.ok) {
      throw new Error(raw?.message || raw?.error || 'Failed to fetch workflows');
    }
    const list = Array.isArray(raw?.data) ? raw.data : [];
    return list.map((w: any) => ({
      id: w.id || w.name,
      name: w.name,
      updatedAt: w.updated_at || w.updatedAt || new Date().toISOString()
    }));
  }

  /**
   * 获取工作流列表（分页）
   * GET /api/v1/workflow/workflowList
   * @param params.keyword - 关键词
   * @param params.status - 状态
   * @param params.limit - 每页大小 (page_size)
   * @param params.offset - 页码 (page_num)
   */
  async getWorkflowsPaginated(params: QueryParams = {}): Promise<PaginatedWorkflows> {
    const queryParams: Record<string, string> = {};
    if (params.search) queryParams.keyword = params.search;
    if (params.status) queryParams.status = params.status;
    if (params.limit) queryParams.page_size = String(params.limit);
    if (params.offset !== undefined) queryParams.page_num = String(Math.floor(params.offset / (params.limit || 20)) + 1);

    const queryString = new URLSearchParams(queryParams).toString();

    const res = await fetch(`${API_BASE}/workflow/workflowList${queryString ? '?' + queryString : ''}`, {
      headers: this.getHeaders()
    });
    const raw = await res.json();
    if (!res.ok) {
      throw new Error(raw?.message || raw?.error || 'Failed to fetch workflows');
    }

    const list = Array.isArray(raw?.data) ? raw.data : [];
    const data = list.map((w: any) => ({
      ...w,
      id: w.id || w.name,
      updatedAt: w.updated_at || w.updatedAt || new Date().toISOString()
    }));

    const pagination = raw?.pagination || {};
    return {
      data,
      total: pagination.total_count || raw.total || 0,
      limit: pagination.page_size || params.limit || 20,
      offset: ((pagination.page_num || 1) - 1) * (pagination.page_size || params.limit || 20)
    };
  }

  /**
   * 获取工作流详情
   * GET /api/v1/workflow/{workflowName}
   */
  async getWorkflow(workflowName: string): Promise<WorkflowRecord> {
    const res = await fetch(`${API_BASE}/workflow/${encodeURIComponent(workflowName)}`, { headers: this.getHeaders() });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.message || raw?.error || 'Failed to fetch workflow');
    const workflow = raw?.data ?? raw;
    return {
      ...workflow,
      id: workflow.id || workflow.name,
      updatedAt: workflow.updated_at || workflow.updatedAt || new Date().toISOString()
    };
  }

  /**
   * 创建工作流
   * POST /api/v1/workflow/
   */
  async createWorkflow(name: string, content: WorkflowDefinition): Promise<WorkflowRecord> {
    const res = await fetch(`${API_BASE}/workflow/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name,
        version: (content as any).version || '1.0',
        nodes: content.nodes || [],
        connections: content.connections || {},
        global: content.global || {}
      })
    });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.message || raw?.error || 'Failed to create workflow');
    const workflow = raw?.data ?? raw;
    return {
      ...workflow,
      id: workflow.id || workflow.name,
      content,
      updatedAt: workflow.updated_at || workflow.updatedAt || new Date().toISOString()
    };
  }

  /**
   * 更新工作流
   * PUT /api/v1/workflow/{workflowName}
   */
  async updateWorkflow(workflowName: string, name: string, content: WorkflowDefinition): Promise<WorkflowRecord> {
    const res = await fetch(`${API_BASE}/workflow/${encodeURIComponent(workflowName)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name,
        version: (content as any).version || '1.0',
        nodes: content.nodes || [],
        connections: content.connections || {},
        global: content.global || {}
      })
    });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.message || raw?.error || 'Failed to update workflow');
    const workflow = raw?.data ?? raw;
    return {
      ...workflow,
      id: workflow.id || workflow.name,
      content,
      updatedAt: workflow.updated_at || workflow.updatedAt || new Date().toISOString()
    };
  }

  /**
   * 删除工作流
   * DELETE /api/v1/workflow/{workflowName}
   */
  async deleteWorkflow(workflowName: string): Promise<void> {
    const res = await fetch(`${API_BASE}/workflow/${encodeURIComponent(workflowName)}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const raw = await res.json().catch(() => ({}));
      throw new Error(raw?.message || raw?.error || 'Failed to delete workflow');
    }
  }

  async executeWorkflowById(id: string, input?: any): Promise<ServerExecutionResponse> {
    const res = await fetch(`${API_BASE}/execute`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ workflowId: id, input })
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

  async updateSecret(secret: CredentialItem): Promise<CredentialItem> {
    const res = await fetch(`${API_BASE}/secrets/${secret.id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(secret)
    });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to update secret');
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
    if (!this.token && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('gflow_local_apis');
        return stored ? JSON.parse(stored) : [];
    }
    const res = await fetch(`${API_BASE}/apis`, { headers: this.getHeaders() });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to fetch APIs');
    return raw?.data ?? raw;
  }

  async saveApi(apiReq: ApiRequest): Promise<ApiRequest> {
    if (!this.token && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('gflow_local_apis');
        const list: ApiRequest[] = stored ? JSON.parse(stored) : [];
        const newItem = { ...apiReq, id: apiReq.id === 'new' ? Math.random().toString(36).substring(2) : apiReq.id, updatedAt: new Date().toISOString() };
        
        const existsIndex = list.findIndex(r => r.id === newItem.id);
        if (existsIndex >= 0) {
            list[existsIndex] = newItem;
        } else {
            list.push(newItem);
        }
        localStorage.setItem('gflow_local_apis', JSON.stringify(list));
        return newItem;
    }

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
    if (!this.token && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('gflow_local_apis');
        if (stored) {
            const list: ApiRequest[] = JSON.parse(stored);
            const newList = list.filter(r => r.id !== id);
            localStorage.setItem('gflow_local_apis', JSON.stringify(newList));
        }
        return;
    }

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

  // --- Plugins ---

  /**
   * 获取插件列表
   * GET /api/v1/plugins
   */
  async getPlugins(params: { page_num?: number; page_size?: number } = {}): Promise<PaginatedPlugins> {
    const queryParams = new URLSearchParams();
    if (params.page_num) queryParams.append('page_num', String(params.page_num));
    if (params.page_size) queryParams.append('page_size', String(params.page_size));

    const queryString = queryParams.toString();
    const res = await fetch(`${API_BASE}/plugins${queryString ? '?' + queryString : ''}`, {
      headers: this.getHeaders()
    });
    const raw: ApiResponse<Plugin[]> = await res.json();
    
    if (!res.ok || raw.code !== '200') {
      throw new Error(raw?.message || 'Failed to fetch plugins');
    }

    return {
      data: raw.data || [],
      pagination: raw.pagination || {
        total_count: 0,
        has_more: false,
        last_id: 0,
        page_size: params.page_size || 10,
        page_num: params.page_num || 1
      }
    };
  }

  /**
   * 获取插件详情
   * GET /api/v1/plugins/{id}
   */
  async getPlugin(id: number): Promise<Plugin> {
    const res = await fetch(`${API_BASE}/plugins/${id}`, {
      headers: this.getHeaders()
    });
    const raw: ApiResponse<Plugin> = await res.json();
    
    if (!res.ok || raw.code !== '200') {
      throw new Error(raw?.message || 'Failed to fetch plugin');
    }

    return raw.data!;
  }

  /**
   * 创建插件
   * POST /api/v1/plugins
   */
  async createPlugin(plugin: CreatePluginRequest): Promise<Plugin> {
    const res = await fetch(`${API_BASE}/plugins`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(plugin)
    });
    const raw: ApiResponse<Plugin> = await res.json();
    
    if (!res.ok || raw.code !== '200') {
      throw new Error(raw?.message || 'Failed to create plugin');
    }

    return raw.data!;
  }

  /**
   * 更新插件
   * PUT /api/v1/plugins/{id}
   */
  async updatePlugin(id: number, plugin: UpdatePluginRequest): Promise<Plugin> {
    const res = await fetch(`${API_BASE}/plugins/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(plugin)
    });
    const raw: ApiResponse<Plugin> = await res.json();
    
    if (!res.ok || raw.code !== '200') {
      throw new Error(raw?.message || 'Failed to update plugin');
    }

    return raw.data!;
  }

  /**
   * 删除插件
   * DELETE /api/v1/plugins/{id}
   */
  async deletePlugin(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/plugins/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    const raw: ApiResponse<void> = await res.json();
    
    if (!res.ok || raw.code !== '200') {
      throw new Error(raw?.message || 'Failed to delete plugin');
    }
  }
}

export const api = new ApiClient();
