import { API_BASE } from '../config';
import { ServerSecret, SecretTemplate } from '../models';
import { CredentialItem } from '../../types';

function mapServerSecretToCredentialItem(s: ServerSecret): CredentialItem {
  return {
    id: String(s.id),
    name: s.name,
    type: s.type,
    data: s.value || {}
  };
}

export async function getSecrets(headers: Record<string, string>): Promise<CredentialItem[]> {
  const res = await fetch(`${API_BASE}/secrets`, { headers });
  const raw = await res.json();
  if (!res.ok) throw new Error(raw?.message || raw?.error || 'Failed to fetch secrets');
  // 适配新的返回格式：code 为 "200" 表示成功
  if (raw?.code && raw.code !== '200' && raw.code !== 'SUCCESS' && raw.code !== 'success') {
    throw new Error(raw?.message || 'Failed to fetch secrets');
  }
  const list = Array.isArray(raw?.data) ? raw.data : [];
  return list.map((s: ServerSecret) => mapServerSecretToCredentialItem(s));
}

export async function createSecret(headers: Record<string, string>, secret: CredentialItem): Promise<any> {
  const res = await fetch(`${API_BASE}/secrets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: secret.name,
      type: secret.type,
      value: secret.data
    })
  });
  const raw = await res.json();
  
  // Check for error responses
  if (!res.ok || (raw?.code && raw.code !== '200' && raw.code !== 'SUCCESS' && raw.code !== 'success')) {
    const errorMessage = raw?.message || raw?.error || 'Failed to save secret';
    throw new Error(errorMessage);
  }
  
  return raw;
}

export async function updateSecret(headers: Record<string, string>, secret: CredentialItem): Promise<any> {
  const res = await fetch(`${API_BASE}/secrets/${secret.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      name: secret.name,
      type: secret.type,
      value: secret.data
    })
  });
  const raw = await res.json();
  
  // Check for error responses
  if (!res.ok || (raw?.code && raw.code !== '200' && raw.code !== 'SUCCESS' && raw.code !== 'success')) {
    const errorMessage = raw?.message || raw?.error || 'Failed to update secret';
    throw new Error(errorMessage);
  }
  
  return raw;
}

export async function deleteSecret(headers: Record<string, string>, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/secrets/${id}`, {
    method: 'DELETE',
    headers
  });
  
  // Always try to parse the response body
  let raw;
  try {
    raw = await res.json();
  } catch (e) {
    // If response is not JSON, throw generic error
    if (!res.ok) {
      throw new Error('Failed to delete secret');
    }
    return;
  }
  
  // Check for error responses
  if (!res.ok || (raw?.code && raw.code !== '200' && raw.code !== 'SUCCESS' && raw.code !== 'success')) {
    const errorMessage = raw?.message || raw?.error || 'Failed to delete secret';
    throw new Error(errorMessage);
  }
}

export async function getSecret(headers: Record<string, string>, id: string): Promise<CredentialItem> {
  const res = await fetch(`${API_BASE}/secrets/${id}`, { headers });
  const raw = await res.json();
  if (!res.ok) throw new Error(raw?.message || raw?.error || 'Failed to fetch secret');
  if (raw?.code && raw.code !== '200' && raw.code !== 'SUCCESS' && raw.code !== 'success') {
    throw new Error(raw?.message || 'Failed to fetch secret');
  }
  return mapServerSecretToCredentialItem(raw?.data as ServerSecret);
}

export async function getSecretByName(headers: Record<string, string>, secretName: string): Promise<CredentialItem> {
  const res = await fetch(`${API_BASE}/secrets/byName/${encodeURIComponent(secretName)}`, { headers });
  const raw = await res.json();
  if (!res.ok) throw new Error(raw?.message || raw?.error || 'Failed to fetch secret');
  if (raw?.code && raw.code !== '200' && raw.code !== 'SUCCESS' && raw.code !== 'success') {
    throw new Error(raw?.message || 'Failed to fetch secret');
  }
  return mapServerSecretToCredentialItem(raw?.data as ServerSecret);
}

export async function getSecretsBySecretType(headers: Record<string, string>, secretKind: string, secretType: string, provider?: string, keyword?: string): Promise<CredentialItem[]> {
  const path = provider && provider.length > 0
    ? `${API_BASE}/secrets/bySecretType/${encodeURIComponent(secretKind)}/${encodeURIComponent(secretType)}/${encodeURIComponent(provider)}`
    : `${API_BASE}/secrets/bySecretType/${encodeURIComponent(secretKind)}/${encodeURIComponent(secretType)}`;
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  const res = await fetch(`${path}${qs}`, { headers });
  const raw = await res.json();
  if (!res.ok) throw new Error(raw?.message || raw?.error || 'Failed to fetch secrets');
  if (raw?.code && raw.code !== '200' && raw.code !== 'SUCCESS' && raw.code !== 'success') {
    throw new Error(raw?.message || 'Failed to fetch secrets');
  }
  const list = Array.isArray(raw?.data) ? raw.data : [];
  return list.map((s: ServerSecret) => mapServerSecretToCredentialItem(s));
}

export async function getSecretTemplates(headers: Record<string, string>): Promise<SecretTemplate[]> {
  const res = await fetch(`${API_BASE}/secret_tpls`, { headers });
  const raw = await res.json();
  if (!res.ok) throw new Error(raw?.message || raw?.error || 'Failed to fetch secret templates');
  if (Array.isArray(raw)) return raw as SecretTemplate[];
  if (Array.isArray(raw?.data)) return raw.data as SecretTemplate[];
  return [];
}
