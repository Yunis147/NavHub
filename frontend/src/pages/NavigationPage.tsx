import { useCallback, useEffect, useState, useRef } from 'react';
import { useRos } from '../services/ros';
import { useControl } from '../hooks/useControl';
import { useServerState } from '../hooks/useServerState';
import { useTeleop } from '../hooks/useTeleop';
import { useSlamMap } from '../hooks/useSlamMap';
import { startNavigation, stopNavigation, listMaps, type MapInfo } from '../services/api';
import { publishInitialPose, sendNavGoal } from '../services/nav';
import type { Pose2D } from '../lib/tf2d';
import { ControlBanner } from '../components/ControlBanner';
import { EStopButton } from '../components/EStopButton';
import { ConnectionStatus } from '../components/ConnectionStatus';
// We will build a NavViewer component shortly
import { NavViewer } from '../components/NavViewer';

// Navigation UI 
export default function NavigationPage() {
  const { ros, status } = useRos();
  const server = useServerState();
  const { hasControl, token, take, give, error } = useControl();
  
  // We reuse useSlamMap for the active grid and robot TF
  const { grid, robotPose } = useSlamMap(ros);

  const [maps, setMaps] = useState<MapInfo[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  const navigating = server.mode === 'navigating';
  const canDrive = hasControl && server.teleopAllowed && status === 'connected';
  const teleop = useTeleop(canDrive);

  useEffect(() => {
    listMaps().then(data => {
      setMaps(data);
      if (data.length > 0 && !selectedMap) setSelectedMap(data[0].name);
    }).catch(console.error);
  }, []);

  const onEStop = useCallback(() => {
    // Phase 4: cancel the goal in addition to zeroing velocity
    teleop.stop();
    if (cancelGoalRef.current) {
      cancelGoalRef.current();
      cancelGoalRef.current = null;
      setNavGoalStatus('Canceled via E-Stop');
    }
    void give();
  }, [teleop, give]);

  const handleStart = async () => {
    if (!token || !selectedMap) return;
    setBusy(true);
    setNavError(null);
    try {
      await startNavigation(token, selectedMap);
    } catch (e) {
      setNavError(e instanceof Error ? e.message : 'failed to start navigation');
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    setNavError(null);
    try {
      await stopNavigation();
    } finally {
      setBusy(false);
    }
  };

  // Nav modes for clicking on the canvas
  const [interactMode, setInteractMode] = useState<'view' | 'initial_pose' | 'goal_pose'>('view');
  const [navGoalStatus, setNavGoalStatus] = useState<string | null>(null);
  const cancelGoalRef = useRef<(() => void) | null>(null);

  const handleSetInitialPose = useCallback((pose: Pose2D) => {
    if (ros && navigating) {
      publishInitialPose(ros, pose);
      setInteractMode('view');
    }
  }, [ros, navigating]);

  const handleSetGoalPose = useCallback((pose: Pose2D) => {
    if (ros && navigating) {
      // Cancel existing if any
      if (cancelGoalRef.current) cancelGoalRef.current();

      const cancel = sendNavGoal(ros, pose, (status) => {
        setNavGoalStatus(status);
        if (['Succeeded', 'Aborted', 'Canceled'].includes(status)) {
          // keep track
        }
      });
      cancelGoalRef.current = cancel;
      setNavGoalStatus('Sending...');
      setInteractMode('view');
    }
  }, [ros, navigating]);

  return (
    <div className="flex h-[calc(100vh-57px)] bg-slate-950">
      {/* Left sidebar - Controls */}
      <div className="w-96 flex-shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900">
        <div className="space-y-4 p-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 shadow-lg">
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

          {/* Navigation Controls */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Autonomous Navigation
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="mb-1 flex items-center gap-2">
                {navigating ? (
                  <>
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-sm font-semibold text-blue-400">Nav2 Active</span>
                  </>
                ) : (
                  <>
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                    <span className="text-sm font-semibold text-slate-400">Idle</span>
                  </>
                )}
              </div>

              {!navigating && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Select Map to Load:</label>
                  <select
                    value={selectedMap}
                    onChange={(e) => setSelectedMap(e.target.value)}
                    disabled={busy || maps.length === 0}
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {maps.length === 0 ? <option value="">No maps available...</option> : null}
                    {maps.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {navigating ? (
                <button
                  type="button"
                  onClick={() => void handleStop()}
                  disabled={busy}
                  className="w-full rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 shadow-md hover:bg-slate-600 disabled:opacity-50 transition-colors"
                >
                  Stop Navigation
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleStart()}
                  disabled={!hasControl || server.mode !== 'idle' || busy || !selectedMap}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
                >
                  Start Nav2
                </button>
              )}
              {navError && <div className="text-xs text-red-400">{navError}</div>}
            </div>
          </div>

          {/* Interaction Mode */}
          {navigating && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 shadow-lg overflow-hidden">
               <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Interaction
                </div>
              </div>
              <div className="p-4 space-y-2">
                <button 
                  onClick={() => setInteractMode('view')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${interactMode === 'view' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  👁️ View Only
                </button>
                <button 
                  onClick={() => setInteractMode('initial_pose')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${interactMode === 'initial_pose' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  📍 Set Initial Pose
                </button>
                <button
                  onClick={() => setInteractMode('goal_pose')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${interactMode === 'goal_pose' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  🎯 Send Nav Goal
                </button>
                {navGoalStatus && (
                  <div className="mt-2 text-xs font-medium text-blue-400 bg-blue-900/20 px-3 py-2 rounded">
                    Goal Status: {navGoalStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          <EStopButton onStop={onEStop} />
        </div>
      </div>

      {/* Right side - Full-size advanced Nav2 viewer */}
      <div className="flex flex-1 flex-col p-4">
         <NavViewer
           grid={grid}
           robotPose={robotPose}
           interactMode={interactMode}
           onSetInitialPose={handleSetInitialPose}
           onSetGoalPose={handleSetGoalPose}
         />
      </div>
    </div>
  );
}
