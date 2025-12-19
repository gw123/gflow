import { API_BASE } from '../config';
import { AuthResponse, UserInfoResponse } from '../models';

export async function register(headers: Record<string, string>, username: string, password: string, email: string, mobile: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username, password, email, mobile })
  });
  const raw = await res.json();
  if (!res.ok) {
    throw new Error(raw?.message || raw?.error || 'Registration failed');
  }
  return raw;
}

export async function login(headers: Record<string, string>, username?: string, password?: string, mobile?: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username, password, mobile })
  });
  const raw = await res.json();
  if (raw?.code && raw.code !== '0' && raw.code !== '200') {
    throw new Error(raw?.message || raw?.error || 'Login failed');
  }
  if (!res.ok) {
    throw new Error(raw?.message || raw?.error || 'Login failed');
  }
  const authData = raw?.data || raw;
  return authData;
}

export async function getMe(headers: Record<string, string>): Promise<UserInfoResponse> {
  const res = await fetch(`${API_BASE}/user/userInfo`, {
    headers
  });
  const raw = await res.json();
  if (raw?.code && raw.code !== '0' && raw.code !== '200') {
    throw new Error(raw?.message || raw?.error || 'Failed to fetch user');
  }
  if (!res.ok) {
    throw new Error(raw?.message || raw?.error || 'Failed to fetch user');
  }
  return raw?.data ?? raw;
}

export async function logout(headers: Record<string, string>): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'GET',
      headers
    });
    if (!res.ok) {
      return;
    }
  } catch {
  }
}
