import { API_BASE } from '../config';
import { ApiRequest } from '../models';

export async function getApis(headers: Record<string, string>, token: string | null): Promise<ApiRequest[]> {
  if (!token && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('gflow_local_apis');
    return stored ? JSON.parse(stored) : [];
  }
  const res = await fetch(`${API_BASE}/apis`, { headers });
  const raw = await res.json();
  if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to fetch APIs');
  return raw?.data ?? raw;
}

export async function saveApi(headers: Record<string, string>, token: string | null, apiReq: ApiRequest): Promise<ApiRequest> {
  if (!token && typeof localStorage !== 'undefined') {
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
    headers,
    body: JSON.stringify(apiReq)
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(raw?.error?.message || raw?.error || 'Failed to save API');
  return raw?.data ?? raw;
}

export async function deleteApi(headers: Record<string, string>, token: string | null, id: string): Promise<void> {
  if (!token && typeof localStorage !== 'undefined') {
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
    headers
  });
  if (!res.ok) throw new Error('Failed to delete API');
}
