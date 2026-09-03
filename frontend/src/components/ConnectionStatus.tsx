import { useRos } from '../services/ros';

const LABEL: Record<string, { text: string; dot: string }> = {
  connected: { text: 'Connected', dot: 'bg-green-500' },
  connecting: { text: 'Connecting…', dot: 'bg-amber-500 animate-pulse' },
  closed: { text: 'WebSocket Disconnected', dot: 'bg-red-500' },
};

export function ConnectionStatus() {
  const { status, url } = useRos();
  const { text, dot } = LABEL[status];
  return (
    <div className="flex items-center gap-2 text-sm text-slate-300" title={url}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
      {text}
    </div>
  );
}
