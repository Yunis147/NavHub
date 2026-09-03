import { useCallback, useEffect, useRef, useState } from 'react';
import { acquireControl, heartbeat, releaseControl } from '../services/api';
import { API_URL, HEARTBEAT_MS } from '../config';

// Client half of arbitration (Rule 10). Explicit "Take control" (not auto) so control
// is a deliberate act; keeps the token alive by heartbeat; releases on unmount and on
// tab close (sendBeacon best-effort — the backend's TTL is the real guarantee).
export function useControl() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const take = useCallback(async () => {
    try {
      const { token: t } = await acquireControl();
      setToken(t);
      setError(null);
    } catch {
      setError('Another client has control');
    }
  }, []);

  const give = useCallback(async () => {
    const t = tokenRef.current;
    if (t) {
      setToken(null);
      await releaseControl(t);
    }
  }, []);

  // Heartbeat; if the server has dropped us (expired/stolen), surrender locally.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(async () => {
      const ok = await heartbeat(token);
      if (!ok) {
        setToken(null);
        setError('Lost control');
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [token]);

  // Release on tab close so control frees immediately rather than after the TTL.
  useEffect(() => {
    const onUnload = () => {
      const t = tokenRef.current;
      if (t) {
        navigator.sendBeacon(
          `${API_URL}/api/control/release`,
          new Blob([JSON.stringify({ token: t })], { type: 'application/json' }),
        );
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  return { hasControl: token !== null, token, take, give, error };
}
