import { useCallback } from 'react';
import { useRos } from './services/ros';
import { useControl } from './hooks/useControl';
import { useServerState } from './hooks/useServerState';
import { useTeleop } from './hooks/useTeleop';
import { useSlamMap } from './hooks/useSlamMap';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ControlBanner } from './components/ControlBanner';
import { MappingControls } from './components/MappingControls';
import { MapViewer } from './components/MapViewer';
import { Joystick } from './components/Joystick';
import { KeyboardTeleop } from './components/KeyboardTeleop';
import { EStopButton } from './components/EStopButton';

export default function App() {
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
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">NavHub</h1>
        <ConnectionStatus />
      </header>

      <ControlBanner
        hasControl={hasControl}
        server={server}
        error={error}
        onTake={() => void take()}
        onRelease={() => void give()}
      />

      <MappingControls hasControl={hasControl} token={token} mode={server.mode} />

      <MapViewer grid={grid} robotPose={robotPose} />

      <div className="flex flex-col items-center gap-2 rounded-lg bg-slate-900 py-6 ring-1 ring-slate-800">
        <Joystick
          enabled={canDrive}
          onVector={teleop.setTranslate}
          onRelease={() => teleop.setTranslate(0, 0)}
        />
        <p className="text-center text-xs text-slate-400">
          Stick = move · <span className="font-mono">WASD</span> = move ·{' '}
          <span className="font-mono">Q/E</span> = rotate
        </p>
      </div>

      <KeyboardTeleop enabled={canDrive} onTwist={teleop.setTwist} />

      <EStopButton onStop={onEStop} />
    </div>
  );
}
