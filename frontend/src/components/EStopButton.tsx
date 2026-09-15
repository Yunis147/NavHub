import { useRos } from '../services/ros';
import { publishZero } from '../services/cmdVel';

// Rule 6: E-Stop is ALWAYS available. Phase 1 = publish zero /cmd_vel + drop control.
// Phase 4 adds action-client goal cancellation here (cancel AND zero, both, always).
export function EStopButton({ onStop }: { onStop: () => void }) {
  const { ros, status } = useRos();
  const stop = () => {
    if (ros && status === 'connected') publishZero(ros);
    onStop();
  };
  return (
    <button
      type="button"
      onClick={stop}
      className="group relative w-full overflow-hidden rounded-xl bg-slate-800 border-2 border-red-900/50 px-6 py-4 shadow-lg transition-all hover:bg-slate-700 hover:border-red-500/50 active:scale-[0.98]"
    >
      <div className="relative flex items-center justify-center gap-3">
        <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
        <div className="text-left">
          <div className="text-lg font-bold tracking-wide text-red-100">Stop Robot</div>
          <div className="text-xs font-medium text-slate-400">Halt motion immediately</div>
        </div>
      </div>
    </button>
  );
}
