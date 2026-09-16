import { useCallback } from 'react';
import { useRos } from '../services/ros';
import { useControlContext } from '../contexts/ControlContext';
import { useServerState } from '../hooks/useServerState';
import { useTeleopContext } from '../contexts/TeleopContext';
import { useSlamMap } from '../hooks/useSlamMap';
import { ControlBanner } from '../components/ControlBanner';
import { MappingControls } from '../components/MappingControls';
import { MapViewer } from '../components/MapViewer';
import { EStopButton } from '../components/EStopButton';
import { ConnectionStatus } from '../components/ConnectionStatus';

export default function MappingPage() {
  const { ros } = useRos();
  const server = useServerState();
  const { hasControl, token, take, give, error } = useControlContext();
  const { grid, robotPose } = useSlamMap(ros);

  const teleop = useTeleopContext();

  const onEStop = useCallback(() => {
    teleop.stop();
    void give();
  }, [teleop, give]);

  return (
    <div className="flex h-[calc(100vh-57px)] bg-slate-950">
      {/* Left sidebar - Controls */}
      <div className="w-96 flex-shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900">
        <div className="space-y-4 p-4">
          {/* Connection status at top */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              System Status
            </div>
            <ConnectionStatus />
          </div>

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

          {/* Drive instructions */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-4">
            <div className="mb-3 text-sm font-semibold text-blue-400">
              Drive While Mapping
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-slate-700 px-2 py-1 font-mono text-xs font-semibold">W/S</kbd>
                <span>Forward / Backward</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-slate-700 px-2 py-1 font-mono text-xs font-semibold">A/D</kbd>
                <span>Strafe Left / Right</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-slate-700 px-2 py-1 font-mono text-xs font-semibold">Q/E</kbd>
                <span>Rotate Left / Right</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-red-900/50 px-2 py-1 font-mono text-xs font-semibold text-red-300">X</kbd>
                <span className="text-red-300">Emergency Stop</span>
              </div>
            </div>
          </div>

          {/* E-Stop */}
          <EStopButton onStop={onEStop} />

          {/* Map stats */}
          {grid && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Map Info
              </div>
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Resolution:</span>
                  <span className="font-mono font-semibold">{grid.info.resolution.toFixed(3)} m/px</span>
                </div>
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span className="font-mono font-semibold">
                    {grid.info.width} × {grid.info.height}
                  </span>
                </div>
                {robotPose && (
                  <>
                    <div className="mt-2 border-t border-slate-700 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Robot Pose
                    </div>
                    <div className="flex justify-between">
                      <span>X:</span>
                      <span className="font-mono font-semibold">{robotPose.x.toFixed(2)} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Y:</span>
                      <span className="font-mono font-semibold">{robotPose.y.toFixed(2)} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Yaw:</span>
                      <span className="font-mono font-semibold">{(robotPose.yaw * 180 / Math.PI).toFixed(1)}°</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Full-size map viewer */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 p-4">
          <MapViewer grid={grid} robotPose={robotPose} />
        </div>
      </div>
    </div>
  );
}
