import { useRos } from '../services/ros';
import { publishZero } from '../services/cmdVel';
import { Icon } from './Icon';

export function EStopButton({ onStop }: { onStop: () => void }) {
  const { ros, status } = useRos();
  const stop = () => {
    if (ros && status === 'connected') publishZero(ros);
    onStop();
  };
  return <button type="button" onClick={stop} className="emergency-stop"><span className="emergency-icon"><Icon name="stop" size={23} /></span><span><strong>Stop Robot</strong><small>Halt motion immediately</small></span><span className="emergency-tag">E-STOP</span></button>;
}
