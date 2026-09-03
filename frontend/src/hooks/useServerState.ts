import { useEffect, useState } from 'react';
import { getState, type ServerState } from '../services/api';

const INITIAL: ServerState = { mode: 'idle', controlled: false, since: null, teleopAllowed: true };

// Polls the server-authoritative mode/control state (Rule 6/10 source of truth).
export function useServerState(): ServerState {
  const [state, setState] = useState<ServerState>(INITIAL);
  useEffect(() => {
    let on = true;
    const tick = async () => {
      try {
        const s = await getState();
        if (on) setState(s);
      } catch {
        /* backend momentarily unreachable — keep last known */
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, []);
  return state;
}
