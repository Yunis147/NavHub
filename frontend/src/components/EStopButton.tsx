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
      className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-red-600 to-red-700 px-6 py-6 shadow-2xl ring-4 ring-red-900/40 transition-all hover:from-red-500 hover:to-red-600 hover:shadow-red-500/20 active:scale-[0.98]"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      <div className="relative flex items-center justify-center gap-3">
        <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
        <div className="text-left">
          <div className="text-2xl font-black tracking-wide text-white">EMERGENCY STOP</div>
          <div className="text-xs font-medium text-red-200 opacity-90">Press to halt immediately</div>
        </div>
      </div>
    </button>
  );
}
