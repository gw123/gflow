import { API_BASE } from '../config';

export async function proxyRequest(method: string, url: string, headers?: any, body?: any, params?: any): Promise<any> {
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
      throw new Error(`Backend server returned HTML (Status ${res.status}). The server might be down or the proxy path is incorrect.`);
    }
    throw new Error(`Invalid JSON response from server (Status ${res.status}): ${e.message}`);
  }
}
