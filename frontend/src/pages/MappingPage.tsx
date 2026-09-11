import { useCallback } from 'react';
import { useRos } from '../services/ros';
import { useControl } from '../hooks/useControl';
import { useServerState } from '../hooks/useServerState';
import { useTeleop } from '../hooks/useTeleop';
import { useSlamMap } from '../hooks/useSlamMap';
import { ControlBanner } from '../components/ControlBanner';
import { MappingControls } from '../components/MappingControls';
import { MapViewer } from '../components/MapViewer';
import { EStopButton } from '../components/EStopButton';

export default function MappingPage() {
  const { ros, status } = useRos();
  const server = useServerState();
  const { hasControl, token, take, give, error } = useControl();
  const { grid, robotPose } = useSlamMap(ros);

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

          {/* Mapping controls with save */}
          <MappingControls hasControl={hasControl} token={token} mode={server.mode} />

          {/* Map viewer */}
          <MapViewer grid={grid} robotPose={robotPose} />

          {/* Teleop controls for driving while mapping */}
          <div className="rounded-lg bg-slate-800 px-4 py-3">
            <div className="mb-2 text-sm font-semibold">Drive (while mapping)</div>
            <div className="text-xs text-slate-400">
              Use WASD keys to drive while building the map. Focus this window first.
            </div>
          </div>

          {/* E-Stop */}
          <EStopButton onStop={onEStop} />
        </div>
      </div>
    </div>
  );
}