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
      className="w-full rounded-lg bg-red-600 px-6 py-5 text-2xl font-black tracking-wide text-white shadow-lg ring-4 ring-red-900/40 active:bg-red-700"
    >
      ■ E-STOP
    </button>
  );
}
