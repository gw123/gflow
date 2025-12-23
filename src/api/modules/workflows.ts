import { API_BASE } from '../config';
import { PaginatedWorkflows, QueryParams, WorkflowRecord, ServerExecutionResponse, PaginatedExecutions, NodeTemplatesResponse } from '../models';
import { WorkflowDefinition } from '../../types';

export async function getWorkflows(headers: Record<string, string>): Promise<WorkflowRecord[]> {
  const res = await fetch(`${API_BASE}/workflow/workflowList`, { headers });
  const raw = await res.json();
  if (!res.ok) {
    throw new Error(raw?.message || raw?.error || 'Failed to fetch workflows');
  }
  const list = Array.isArray(raw?.data) ? raw.data : [];
  return list.map((w: any) => ({
    id: w.id || w.name,
    name: w.name,
    content: { name: w.name, nodes: [] },
    updatedAt: w.updated_at || w.updatedAt || new Date().toISOString()
  }));
}

export async function getWorkflowsPaginated(headers: Record<string, string>, params: QueryParams = {}): Promise<PaginatedWorkflows> {
  const queryParams: Record<string, string> = {};
  if (params.search) queryParams.keyword = params.search;
  if (params.status) queryParams.status = params.status;
  if (params.limit) queryParams.page_size = String(params.limit);
  if (params.offset !== undefined) queryParams.page_num = String(Math.floor(params.offset / (params.limit || 20)) + 1);
  const queryString = new URLSearchParams(queryParams).toString();
  const res = await fetch(`${API_BASE}/workflow/workflowList${queryString ? '?' + queryString : ''}`, { headers });
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

export async function getWorkflow(headers: Record<string, string>, workflowName: string): Promise<WorkflowRecord> {
  const res = await fetch(`${API_BASE}/workflow/${encodeURIComponent(workflowName)}`, { headers });
  const raw = await res.json();
  if (!res.ok) throw new Error(raw?.message || raw?.error || 'Failed to fetch workflow');
  const workflow = raw?.data ?? raw;
  return {
    ...workflow,
    id: workflow.id || workflow.name,
    updatedAt: workflow.updated_at || workflow.updatedAt || new Date().toISOString()
  };
}

export async function createWorkflow(headers: Record<string, string>, name: string, content: WorkflowDefinition): Promise<WorkflowRecord> {
  const res = await fetch(`${API_BASE}/workflow/`, {
    method: 'POST',
    headers,
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

export async function updateWorkflow(headers: Record<string, string>, workflowName: string, name: string, content: WorkflowDefinition): Promise<WorkflowRecord> {
  const res = await fetch(`${API_BASE}/workflow/${encodeURIComponent(workflowName)}`, {
    method: 'PUT',
    headers,
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

export async function deleteWorkflow(headers: Record<string, string>, workflowName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/workflow/${encodeURIComponent(workflowName)}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) {
    const raw = await res.json().catch(() => ({}));
    throw new Error(raw?.message || raw?.error || 'Failed to delete workflow');
  }
}

export async function executeWorkflowById(headers: Record<string, string>, id: string, input?: any): Promise<ServerExecutionResponse> {
  const res = await fetch(`${API_BASE}/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ workflowId: id, input })
  });
  const raw = await res.json();
  if (!res.ok) {
    throw new Error(raw?.error?.message || raw?.error || 'Workflow execution failed');
  }
  return raw?.data ?? raw;
}

export async function getWorkflowExecutions(headers: Record<string, string>, id: string, params: { limit?: number; offset?: number } = {}): Promise<PaginatedExecutions> {
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([_, v]) => v != null)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  const res = await fetch(`${API_BASE}/workflows/${id}/executions${queryString ? '?' + queryString : ''}`, { headers });
  const raw = await res.json();
  if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to fetch executions');
  const meta = raw?.meta || {};
  return {
    data: Array.isArray(raw?.data) ? raw.data : [],
    total: typeof meta.total === 'number' ? meta.total : (raw?.total ?? 0),
    limit: typeof meta.limit === 'number' ? meta.limit : (params.limit ?? 0),
    offset: typeof meta.offset === 'number' ? meta.offset : (params.offset ?? 0)
  };
}

export async function executeWorkflow(headers: Record<string, string>, workflow: WorkflowDefinition, workflowId?: string): Promise<ServerExecutionResponse> {
  const res = await fetch(`${API_BASE}/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ workflow, workflowId })
  });
  const raw = await res.json();
  if (!res.ok) {
    throw new Error(raw?.error?.message || raw?.error || 'Server execution failed');
  }
  return raw?.data ?? raw;
}

export async function getNodeTemplates(headers: Record<string, string>): Promise<NodeTemplatesResponse> {
  const res = await fetch(`${API_BASE}/workflow/nodeTpls`, { headers });
  const raw = await res.json();
  if (!res.ok) {
    throw new Error(raw?.message || raw?.error || 'Failed to fetch node templates');
  }
  // Check for error responses
  if (raw?.code && raw.code !== '200' && raw.code !== 'SUCCESS' && raw.code !== 'success') {
    throw new Error(raw?.message || 'Failed to fetch node templates');
  }
  return raw as NodeTemplatesResponse;
}
