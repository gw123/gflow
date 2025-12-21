import { API_BASE } from '../config';
import {
  WebhookRoute,
  CreateWebhookRouteRequest,
  UpdateWebhookRouteRequest,
  WebhookRouteListParams,
  PaginatedWebhookRoutes,
  WebhookRouteApiListResponse
} from '../models';

interface WebhookRouteApiResponse<T> {
  code: string;
  msg: string;
  data: T;
}

export async function getWebhookRoutes(
  headers: Record<string, string>,
  params?: WebhookRouteListParams
): Promise<PaginatedWebhookRoutes> {
  const queryParams = new URLSearchParams();
  if (params?.keyword) queryParams.append('keyword', params.keyword);
  if (params?.page_num) queryParams.append('page_num', String(params.page_num));
  if (params?.page_size) queryParams.append('page_size', String(params.page_size));
  
  const queryString = queryParams.toString();
  const res = await fetch(`${API_BASE}/webhook-route/${queryString ? '?' + queryString : ''}`, { headers });
  const raw: WebhookRouteApiListResponse = await res.json();

  if (!res.ok || raw.code !== "200") {
    throw new Error('Failed to fetch webhook routes');
  }
  
  // Transform API response to expected format
  return {
    list: raw.data,
    total: raw.pagination.total_count,
    page: params?.page_num || 1,
    pageSize: params?.page_size || 20
  };
}

export async function getWebhookRoute(
  headers: Record<string, string>,
  id: number
): Promise<WebhookRoute> {
  const res = await fetch(`${API_BASE}/webhook-route/${id}`, { headers });
  const raw: WebhookRouteApiResponse<WebhookRoute> = await res.json();
  
  if (!res.ok || raw.code !== "200") {
    throw new Error(raw?.msg || 'Failed to fetch webhook route');
  }
  
  return raw.data;
}

export async function createWebhookRoute(
  headers: Record<string, string>,
  route: CreateWebhookRouteRequest
): Promise<WebhookRoute> {
  const res = await fetch(`${API_BASE}/webhook-route/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(route)
  });
  const raw: WebhookRouteApiResponse<WebhookRoute> = await res.json();
  
  if (!res.ok || raw.code !== "200") {
    throw new Error(raw?.msg || 'Failed to create webhook route');
  }
  
  return raw.data;
}

export async function updateWebhookRoute(
  headers: Record<string, string>,
  id: number,
  route: UpdateWebhookRouteRequest
): Promise<void> {
  const res = await fetch(`${API_BASE}/webhook-route/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(route)
  });
  const raw: WebhookRouteApiResponse<null> = await res.json();
  
  if (!res.ok || raw.code !== "200") {
    throw new Error(raw?.msg || 'Failed to update webhook route');
  }
}

export async function deleteWebhookRoute(
  headers: Record<string, string>,
  id: number
): Promise<void> {
  const res = await fetch(`${API_BASE}/webhook-route/${id}`, {
    method: 'DELETE',
    headers
  });
  const raw: WebhookRouteApiResponse<null> = await res.json();
  
  if (!res.ok || raw.code !== "200") {
    throw new Error(raw?.msg || 'Failed to delete webhook route');
  }
}
