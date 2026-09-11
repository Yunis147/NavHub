import { API_URL } from '../config';

export interface ServerState {
  mode: 'idle' | 'mapping' | 'navigating';
  controlled: boolean;
  since: number | null;
  teleopAllowed: boolean;
}

async function postJson(path: string, body?: unknown): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function getState(): Promise<ServerState> {
  const r = await fetch(`${API_URL}/api/state`);
  if (!r.ok) throw new Error(`state ${r.status}`);
  return (await r.json()) as ServerState;
}

// Rejects if another client already holds control (backend returns 409, Rule 10).
export async function acquireControl(): Promise<{ token: string; since: number }> {
  const r = await postJson('/api/control/acquire');
  if (!r.ok) throw new Error('control in use');
  return (await r.json()) as { token: string; since: number };
}

export async function heartbeat(token: string): Promise<boolean> {
  const r = await postJson('/api/control/heartbeat', { token });
  return r.ok;
}

export async function releaseControl(token: string): Promise<void> {
  await postJson('/api/control/release', { token });
}

// --- SLAM mapping (Phase 2). Start needs the control token; stop is always allowed. ---

export async function startMapping(token: string): Promise<void> {
  const r = await postJson('/api/mapping/start', { token });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `mapping start ${r.status}`);
  }
}

export async function stopMapping(): Promise<void> {
  await postJson('/api/mapping/stop');
}

// --- Map persistence (Phase 3) ---

export async function saveMap(token: string, name: string): Promise<void> {
  const r = await postJson('/api/maps/save', { token, name });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `save map ${r.status}`);
  }
}

export interface MapInfo {
  name: string;
  createdAt: string;
  resolution: number;
  origin: number[];
}

export async function listMaps(): Promise<MapInfo[]> {
  const r = await fetch(`${API_URL}/api/maps`);
  if (!r.ok) throw new Error(`list maps ${r.status}`);
  return (await r.json()) as MapInfo[];
}
