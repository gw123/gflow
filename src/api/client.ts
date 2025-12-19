
import { CredentialItem, WorkflowDefinition, NodeExecutionResult } from '../types';
import { API_BASE } from './config';
import {
  WorkflowSummary,
  WorkflowRecord,
  PaginatedWorkflows,
  QueryParams,
  ExecutionHistoryItem,
  PaginatedExecutions,
  User,
  AuthResponse,
  UserInfoResponse,
  ServerExecutionResponse,
  ApiRequest,
  Plugin,
  CreatePluginRequest,
  UpdatePluginRequest,
  PaginatedPlugins,
  ApiResponse,
  ServerSecret,
  SecretTemplate
} from './models';
import * as AuthModule from './modules/auth';
import * as WorkflowModule from './modules/workflows';
import * as SecretsModule from './modules/secrets';
import * as ApisModule from './modules/apis';
import * as PluginsModule from './modules/plugins';
import * as ProxyModule from './modules/proxy';
export type {
  User,
  AuthResponse,
  UserInfoResponse,
  WorkflowSummary,
  WorkflowRecord,
  PaginatedWorkflows,
  QueryParams,
  ExecutionHistoryItem,
  PaginatedExecutions,
  ServerExecutionResponse,
  ApiRequest,
  Plugin,
  CreatePluginRequest,
  UpdatePluginRequest,
  PaginatedPlugins,
  ApiResponse,
  ServerSecret,
  SecretTemplate
} from './models';

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

  async register(username: string, password: string, email: string, mobile: string): Promise<any> {
    return AuthModule.register({ 'Content-Type': 'application/json' }, username, password, email, mobile);
  }

  async login(username?: string, password?: string, mobile?: string): Promise<AuthResponse> {
    const authData = await AuthModule.login({ 'Content-Type': 'application/json' }, username, password, mobile);
    if (authData?.token) {
      this.setToken(authData.token);
    }
    return authData;
  }

  async getMe(): Promise<UserInfoResponse> {
    if (!this.token) {
      throw new Error('No authentication token available');
    }
    try {
      const data = await AuthModule.getMe(this.getHeaders());
      return data;
    } catch (e) {
      this.setToken(null);
      throw e;
    }
  }

  async logout(): Promise<void> {
    await AuthModule.logout(this.getHeaders());
    this.setToken(null);
  }

  // --- Workflows ---

  async getWorkflows(): Promise<WorkflowSummary[]> {
    const list = await WorkflowModule.getWorkflows(this.getHeaders());
    return list.map(w => ({ id: w.id, name: w.name, updatedAt: w.updatedAt }));
  }

  async getWorkflowsPaginated(params: QueryParams = {}): Promise<PaginatedWorkflows> {
    return WorkflowModule.getWorkflowsPaginated(this.getHeaders(), params);
  }

  async getWorkflow(workflowName: string): Promise<WorkflowRecord> {
    return WorkflowModule.getWorkflow(this.getHeaders(), workflowName);
  }

  async createWorkflow(name: string, content: WorkflowDefinition): Promise<WorkflowRecord> {
    return WorkflowModule.createWorkflow(this.getHeaders(), name, content);
  }

  async updateWorkflow(workflowName: string, name: string, content: WorkflowDefinition): Promise<WorkflowRecord> {
    return WorkflowModule.updateWorkflow(this.getHeaders(), workflowName, name, content);
  }

  async deleteWorkflow(workflowName: string): Promise<void> {
    await WorkflowModule.deleteWorkflow(this.getHeaders(), workflowName);
  }

  async executeWorkflowById(id: string, input?: any): Promise<ServerExecutionResponse> {
    return WorkflowModule.executeWorkflowById(this.getHeaders(), id, input);
  }

  async getWorkflowExecutions(
    id: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedExecutions> {
    return WorkflowModule.getWorkflowExecutions(this.getHeaders(), id, params);
  }

  // --- Secrets ---

  async getSecrets(): Promise<CredentialItem[]> {
    return SecretsModule.getSecrets(this.getHeaders());
  }

  async saveSecret(secret: CredentialItem): Promise<CredentialItem> {
    await SecretsModule.createSecret(this.getHeaders(), secret);
    return this.getSecretByName(secret.name);
  }

  async updateSecret(secret: CredentialItem): Promise<CredentialItem> {
    await SecretsModule.updateSecret(this.getHeaders(), secret);
    return this.getSecret(String(secret.id));
  }

  async deleteSecret(id: string): Promise<void> {
    await SecretsModule.deleteSecret(this.getHeaders(), id);
  }

  async getSecret(id: string): Promise<CredentialItem> {
    return SecretsModule.getSecret(this.getHeaders(), id);
  }

  async getSecretByName(secretName: string): Promise<CredentialItem> {
    return SecretsModule.getSecretByName(this.getHeaders(), secretName);
  }

  async getSecretsBySecretType(secretKind: string, secretType: string, provider?: string, keyword?: string): Promise<CredentialItem[]> {
    return SecretsModule.getSecretsBySecretType(this.getHeaders(), secretKind, secretType, provider, keyword);
  }

  async getSecretTemplates(): Promise<SecretTemplate[]> {
    return SecretsModule.getSecretTemplates(this.getHeaders());
  }

  // --- API Management ---

  async getApis(): Promise<ApiRequest[]> {
    return ApisModule.getApis(this.getHeaders(), this.token);
  }

  async saveApi(apiReq: ApiRequest): Promise<ApiRequest> {
    return ApisModule.saveApi(this.getHeaders(), this.token, apiReq);
  }

  async deleteApi(id: string): Promise<void> {
    await ApisModule.deleteApi(this.getHeaders(), this.token, id);
  }

  // --- Execution & Proxy ---

  async executeWorkflow(workflow: WorkflowDefinition, workflowId?: string): Promise<ServerExecutionResponse> {
    return WorkflowModule.executeWorkflow(this.getHeaders(), workflow, workflowId);
  }

  async proxyRequest(method: string, url: string, headers?: any, body?: any, params?: any): Promise<any> {
    return ProxyModule.proxyRequest(method, url, headers, body, params);
  }

  // --- Plugins ---

  async getPlugins(params: { page_num?: number; page_size?: number } = {}): Promise<PaginatedPlugins> {
    return PluginsModule.getPlugins(this.getHeaders(), params);
  }

  async getPlugin(id: number): Promise<Plugin> {
    return PluginsModule.getPlugin(this.getHeaders(), id);
  }

  async createPlugin(plugin: CreatePluginRequest): Promise<Plugin> {
    return PluginsModule.createPlugin(this.getHeaders(), plugin);
  }

  async updatePlugin(id: number, plugin: UpdatePluginRequest): Promise<Plugin> {
    return PluginsModule.updatePlugin(this.getHeaders(), id, plugin);
  }

  async deletePlugin(id: number): Promise<void> {
    await PluginsModule.deletePlugin(this.getHeaders(), id);
  }
}

export const api = new ApiClient();
