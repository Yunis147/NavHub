import { useCallback } from 'react';
import { useRos } from '../services/ros';
import { useControl } from '../hooks/useControl';
import { useServerState } from '../hooks/useServerState';
import { useTeleop } from '../hooks/useTeleop';
import { ControlBanner } from '../components/ControlBanner';
import { WASDControls } from '../components/WASDControls';
import { TeleopInstructions } from '../components/TeleopInstructions';
import { EStopButton } from '../components/EStopButton';
import { ConnectionStatus } from '../components/ConnectionStatus';

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
    <div className="flex min-h-[calc(100vh-57px)] bg-slate-950">
      {/* Centered card layout */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
        {/* Header */}
        <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl">
          <h2 className="mb-2 text-2xl font-bold text-white">Remote Control</h2>
          <p className="text-sm text-slate-400">
            Direct teleoperation of the XLeRobot using keyboard or on-screen controls
          </p>
        </div>

        {/* Connection status */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-6 py-4 shadow-lg">
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

        {/* Instructions card */}
        <TeleopInstructions />

        {/* WASD Controls */}
        <WASDControls enabled={canDrive} />

        {/* Status indicator */}
        {canDrive && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-green-900/50 bg-green-950/30 py-3 text-sm font-medium text-green-400">
            <div className="h-2 w-2 rounded-full bg-green-500 status-pulse" />
            Ready to drive — press and hold controls
          </div>
        )}

        {/* E-Stop button */}
        <EStopButton onStop={onEStop} />
      </div>
    </div>
  );
}
