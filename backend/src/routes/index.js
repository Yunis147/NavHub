import { Router } from 'express';
import * as control from '../services/controlState.js';
import * as roslaunch from '../services/roslaunch.js';
import * as procs from '../services/processManager.js';
import { ROBOT } from '../config/robot.js';

export const router = Router();

// Current server-authoritative mode + whether someone holds control.
router.get('/state', (_req, res) => {
  res.json(control.publicState());
});

// --- Single-controller arbitration (Rule 10) ---

router.post('/control/acquire', (_req, res) => {
  const r = control.acquire();
  if (!r.ok) return res.status(409).json({ error: 'another client holds control' });
  res.json({ token: r.token, since: r.since });
});

router.post('/control/heartbeat', (req, res) => {
  const token = req.body?.token;
  if (!token) return res.status(400).json({ error: 'token required' });
  const r = control.heartbeat(token);
  if (!r.ok) return res.status(409).json({ error: 'not the current controller' });
  res.json({ ok: true });
});

router.post('/control/release', (req, res) => {
  control.release(req.body?.token);
  res.json({ ok: true });
});

// --- SLAM mapping (Phase 2) ---
// Mode is server-hard (Rule 6/10). Starting requires holding control; stopping is always
// allowed (safe direction, like E-Stop). slam.py is torn down as a process tree (Rule 11).

router.post('/mapping/start', (req, res) => {
  if (!control.isController(req.body?.token)) {
    return res.status(409).json({ error: 'take control before starting mapping' });
  }
  const r = control.startMapping();
  if (!r.ok) return res.status(409).json({ error: `cannot start mapping (${r.reason})` });
  try {
    const child = roslaunch.launch(ROBOT.slam.procName, ROBOT.slam.package, ROBOT.slam.launchFile);
    // Crash OR intentional stop -> process exits -> return to idle, so mode tracks reality.
    child.on('exit', () => control.stopMapping());
  } catch (e) {
    control.stopMapping();
    return res.status(500).json({ error: String(e?.message || e) });
  }
  res.json({ ok: true });
});

router.post('/mapping/stop', (_req, res) => {
  procs.stop(ROBOT.slam.procName); // Rule 11 group kill; the exit handler flips mode -> idle
  res.json({ ok: true });
});
