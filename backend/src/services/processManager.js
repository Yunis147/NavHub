import { spawn } from 'node:child_process';

// Spawns and reliably tears down child process TREES (Rule 11). ros2 launch (Phase 2/4)
// forks a whole tree of nodes; killing just the launch PID orphans them. We start each
// child as its own process-group leader (detached) and signal the whole group with -PID.
//
// Phase 1 uses this only for the cmd_vel watchdog; the API is the reusable foundation
// Phase 2/4 build the slam/nav launches on.

const children = new Map(); // name -> { child, killTimer }

export function start(name, command, args = [], { env = process.env } = {}) {
  if (children.has(name)) {
    throw new Error(`process '${name}' already running`);
  }
  const child = spawn(command, args, {
    detached: true, // new process group => we can kill the whole tree
    stdio: ['ignore', 'inherit', 'inherit'],
    env,
  });
  children.set(name, { child, killTimer: null });

  child.on('exit', (code, signal) => {
    console.log(`[proc] '${name}' exited (code=${code}, signal=${signal})`);
    const entry = children.get(name);
    if (entry?.killTimer) clearTimeout(entry.killTimer);
    children.delete(name);
  });
  child.on('error', (err) => {
    console.error(`[proc] '${name}' failed to start: ${err.message}`);
    children.delete(name);
  });

  console.log(`[proc] started '${name}' (pid ${child.pid}): ${command} ${args.join(' ')}`);
  return child;
}

export function isRunning(name) {
  return children.has(name);
}

// Graceful group stop (SIGINT lets ros2 launch / rclpy shut down cleanly), with a
// SIGKILL backstop if the tree ignores it.
export function stop(name, { signal = 'SIGINT', forceAfterMs = 5000 } = {}) {
  const entry = children.get(name);
  if (!entry) return false;
  const { child } = entry;
  killGroup(child.pid, signal);
  entry.killTimer = setTimeout(() => {
    if (children.has(name)) {
      console.warn(`[proc] '${name}' ignored ${signal}, sending SIGKILL`);
      killGroup(child.pid, 'SIGKILL');
    }
  }, forceAfterMs);
  return true;
}

export function stopAll(opts) {
  for (const name of [...children.keys()]) stop(name, opts);
}

function killGroup(pid, signal) {
  try {
    process.kill(-pid, signal); // negative pid => the whole process group
  } catch (err) {
    if (err.code !== 'ESRCH') console.error(`[proc] kill(${-pid}, ${signal}): ${err.message}`);
  }
}
