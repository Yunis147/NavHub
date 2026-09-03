import ROSLIB from 'roslib';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ROSBRIDGE_URL } from '../config';

export type RosStatus = 'connecting' | 'connected' | 'closed';

interface RosCtx {
  ros: ROSLIB.Ros | null;
  status: RosStatus;
  url: string;
}

const Ctx = createContext<RosCtx>({ ros: null, status: 'connecting', url: ROSBRIDGE_URL });

export const useRos = (): RosCtx => useContext(Ctx);

export function RosProvider({ children }: { children: ReactNode }) {
  const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
  const [status, setStatus] = useState<RosStatus>('connecting');

  useEffect(() => {
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const r = new ROSLIB.Ros({});
    setRos(r);

    const connect = () => {
      if (disposed) return;
      setStatus('connecting');
      r.connect(ROSBRIDGE_URL);
    };
    r.on('connection', () => setStatus('connected'));
    r.on('error', () => {
      /* 'close' fires right after; reconnect handled there */
    });
    r.on('close', () => {
      setStatus('closed');
      if (!disposed) retry = setTimeout(connect, 2000);
    });
    connect();

    return () => {
      disposed = true;
      if (retry) clearTimeout(retry);
      r.close();
    };
  }, []);

  const value = useMemo<RosCtx>(() => ({ ros, status, url: ROSBRIDGE_URL }), [ros, status]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
