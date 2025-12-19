import { API_BASE } from '../config';
import { ApiResponse, PaginatedPlugins, Plugin, CreatePluginRequest, UpdatePluginRequest } from '../models';

export async function getPlugins(headers: Record<string, string>, params: { page_num?: number; page_size?: number } = {}): Promise<PaginatedPlugins> {
  const queryParams = new URLSearchParams();
  if (params.page_num) queryParams.append('page_num', String(params.page_num));
  if (params.page_size) queryParams.append('page_size', String(params.page_size));
  const queryString = queryParams.toString();
  const res = await fetch(`${API_BASE}/plugins${queryString ? '?' + queryString : ''}`, { headers });
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

export async function getPlugin(headers: Record<string, string>, id: number): Promise<Plugin> {
  const res = await fetch(`${API_BASE}/plugins/${id}`, { headers });
  const raw: ApiResponse<Plugin> = await res.json();
  if (!res.ok || raw.code !== '200') {
    throw new Error(raw?.message || 'Failed to fetch plugin');
  }
  return raw.data!;
}

export async function createPlugin(headers: Record<string, string>, plugin: CreatePluginRequest): Promise<Plugin> {
  const res = await fetch(`${API_BASE}/plugins`, {
    method: 'POST',
    headers,
    body: JSON.stringify(plugin)
  });
  const raw: ApiResponse<Plugin> = await res.json();
  if (!res.ok || raw.code !== '200') {
    throw new Error(raw?.message || 'Failed to create plugin');
  }
  return raw.data!;
}

export async function updatePlugin(headers: Record<string, string>, id: number, plugin: UpdatePluginRequest): Promise<Plugin> {
  const res = await fetch(`${API_BASE}/plugins/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(plugin)
  });
  const raw: ApiResponse<Plugin> = await res.json();
  if (!res.ok || raw.code !== '200') {
    throw new Error(raw?.message || 'Failed to update plugin');
  }
  return raw.data!;
}

export async function deletePlugin(headers: Record<string, string>, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/plugins/${id}`, {
    method: 'DELETE',
    headers
  });
  const raw: ApiResponse<void> = await res.json();
  if (!res.ok || raw.code !== '200') {
    throw new Error(raw?.message || 'Failed to delete plugin');
  }
}
