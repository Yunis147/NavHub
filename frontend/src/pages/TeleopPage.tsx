import { useCallback } from 'react';
import { useRos } from '../services/ros';
import { useControl } from '../hooks/useControl';
import { useServerState } from '../hooks/useServerState';
import { useTeleopContext } from '../contexts/TeleopContext';
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
  const teleop = useTeleopContext();

  const onEStop = useCallback(() => {
    teleop.stop();
    void give();
  }, [teleop, give]);

  return (
    <div className="flex min-h-[calc(100vh-57px)] bg-slate-950">
      <div className="mx-auto flex w-full max-w-6xl gap-8 p-6 lg:flex-row flex-col items-start">

        {/* Left Column: Context, Connection, and Instructions */}
        <div className="flex w-full lg:w-5/12 xl:w-1/3 flex-col gap-6">
          <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl">
            <h2 className="mb-2 text-2xl font-bold text-white">Remote Control</h2>
            <p className="text-sm text-slate-400">
              Direct teleoperation of the robot using keyboard or on-screen controls
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-6 py-4 shadow-lg">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              System Status
            </div>
            <ConnectionStatus />
          </div>

          <ControlBanner
            hasControl={hasControl}
            server={server}
            error={error}
            onTake={() => void take()}
            onRelease={() => void give()}
          />

          <TeleopInstructions />
        </div>

        {/* Right Column: Controls and Stop */}
        <div className="flex w-full flex-1 flex-col gap-6">
          <WASDControls enabled={canDrive} />

          {canDrive && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-green-900/50 bg-green-950/30 py-3 text-sm font-medium text-green-400 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-green-500 status-pulse" />
              Ready to drive — press a direction once; X stops
            </div>
          )}

          <EStopButton onStop={onEStop} />
        </div>

      </div>
    </div>
  );
}
