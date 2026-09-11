import { useCallback } from 'react';
import { useRos } from '../services/ros';
import { useControl } from '../hooks/useControl';
import { useServerState } from '../hooks/useServerState';
import { useTeleop } from '../hooks/useTeleop';
import { ControlBanner } from '../components/ControlBanner';
import { WASDControls } from '../components/WASDControls';
import { TeleopInstructions } from '../components/TeleopInstructions';
import { EStopButton } from '../components/EStopButton';

export default function TeleopPage() {
  const { status } = useRos();
  const server = useServerState();
  const { hasControl, take, give, error } = useControl();

  const canDrive = hasControl && server.teleopAllowed && status === 'connected';
  const teleop = useTeleop(canDrive);

  const onEStop = useCallback(() => {
    teleop.stop();
    void give();
  }, [teleop, give]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Main content area */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="mx-auto max-w-md space-y-4">
          {/* Control banner */}
          <ControlBanner
            hasControl={hasControl}
            server={server}
            error={error}
            onTake={() => void take()}
            onRelease={() => void give()}
          />

          {/* Instructions */}
          <TeleopInstructions />

          {/* WASD Controls */}
          <WASDControls enabled={canDrive} />

          {/* E-Stop button */}
          <EStopButton onStop={onEStop} />
        </div>
      </div>
    </div>
  );
}
