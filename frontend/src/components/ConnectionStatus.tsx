import { useRos } from '../services/ros';

const LABEL: Record<string, { text: string; dot: string; ring?: string }> = {
  connected: { text: 'Connected', dot: 'bg-green-500', ring: 'ring-green-500/20' },
  connecting: { text: 'Connecting…', dot: 'bg-amber-500 animate-pulse', ring: 'ring-amber-500/20' },
  closed: { text: 'Disconnected', dot: 'bg-red-500', ring: 'ring-red-500/20' },
};

export function ConnectionStatus() {
  const { status, url } = useRos();
  const { text, dot, ring } = LABEL[status];
  return (
    <div className="flex items-center justify-between gap-3" title={url}>
      <div className="flex items-center gap-2 text-sm">
        <span className={`inline-block h-3 w-3 rounded-full ${dot} ring-4 ${ring} shadow-lg`} />
        <span className={status === 'connected' ? 'text-green-400 font-medium' : status === 'connecting' ? 'text-amber-400' : 'text-red-400'}>
          {text}
        </span>
      </div>
      <span className="text-xs font-mono text-slate-500">rosbridge</span>
    </div>
  );
}
