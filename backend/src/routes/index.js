import { Router, raw } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as control from '../services/controlState.js';
import * as roslaunch from '../services/roslaunch.js';
import * as procs from '../services/processManager.js';
import { ROBOT } from '../config/robot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mapsDir = path.join(__dirname, '../../maps');

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

// --- Map persistence (Phase 3) ---

router.get('/maps', async (_req, res) => {
  try {
    const { Map } = await import('../models/Map.js');
    const maps = await Map.find({}, 'name createdAt resolution origin').sort({ createdAt: -1 });
    res.json(maps);
  } catch (err) {
    console.error('[api/maps] error listing maps:', err.message);
    res.status(500).json({ error: 'Database unavailable' });
  }
});

router.post('/maps/save', async (req, res) => {
  const { token, name } = req.body;
  if (!token || !name) {
    return res.status(400).json({ error: 'token and name required' });
  }

  // Must hold control (Rule 10)
  if (!control.isController(token)) {
    return res.status(409).json({ error: 'not the current controller' });
  }

  // Can only save while mapping is active or recently stopped (mode === 'mapping' or just 'idle')
  if (control.publicState().mode !== 'mapping' && control.publicState().mode !== 'idle') {
    return res.status(409).json({ error: 'cannot save map right now (wrong mode)' });
  }

  try {
    const { Map } = await import('../models/Map.js');
    // Check for duplicate name (unique index in schema)
    const existing = await Map.findOne({ name });
    if (existing) {
      return res.status(409).json({ error: `map '${name}' already exists` });
    }

    // Get absolute path to backend/maps/ directory
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const mapsDir = join(__dirname, '../../maps');
    const basePath = join(mapsDir, name);

    // Run map_saver_cli as a child process
    const { spawn } = await import('node:child_process');
    const { ROBOT } = await import('../config/robot.js');
    const { rosSetup, wsSetup } = ROBOT;

    const cmd = [
      `source '${rosSetup}'`,
      `source '${wsSetup}'`,
      `exec ros2 run nav2_map_server map_saver_cli -f ${basePath}`,
    ].join(' && ');

    console.log(`[api/maps/save] saving map as '${name}'`);
    const child = spawn('bash', ['-c', cmd], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    // Wait for the process to complete
    const exitCode = await new Promise((resolve) => {
      child.on('exit', (code) => resolve(code));
      child.on('error', (err) => {
        console.error(`[api/maps/save] spawn error: ${err.message}`);
        resolve(1);
      });
    });

    if (exitCode !== 0) {
      return res.status(500).json({ error: 'map_saver_cli failed' });
    }

    // Read the .yaml to extract metadata
    const { readFile } = await import('node:fs/promises');
    const yamlPath = `${basePath}.yaml`;
    const yamlText = await readFile(yamlPath, 'utf8');

    // Parse resolution: "resolution: 0.05"
    // Parse origin: "origin: [-0.774, -18.170, 0]"
    const resolution = parseFloat(yamlText.match(/resolution:\s*([0-9.]+)/)?.[1] || '0.05');
    const originMatch = yamlText.match(/origin:\s*\[([-\d.,\s]+)\]/);
    let origin = [-0.774, -18.170, 0];
    if (originMatch) {
      origin = originMatch[1].split(',').map(Number.parseFloat);
    }

    // Save to MongoDB
    const map = new Map({
      name,
      imagePath: `${basePath}.pgm`,
      yamlPath,
      resolution,
      origin,
      createdAt: new Date(),
    });
    await map.save();

    console.log(`[api/maps/save] saved map '${name}' (resolution ${resolution}, origin ${origin})`);
    res.json({ ok: true, name, resolution, origin });
  } catch (err) {
    console.error(`[api/maps/save] error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// --- Map Image Binary endpoints ---

router.get('/maps/:name/image', (req, res) => {
  const pgmPath = path.join(mapsDir, `${req.params.name}.pgm`);
  if (!fs.existsSync(pgmPath)) {
    return res.status(404).json({ error: 'Map image not found' });
  }
  res.setHeader('Content-Type', 'application/octet-stream');
  fs.createReadStream(pgmPath).pipe(res);
});

router.put('/maps/:name/image', raw({ type: 'application/octet-stream', limit: '50mb' }), (req, res) => {
  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: 'Expected binary body' });
  }
  
  // No strict token check here to allow map editing while idle. 
  // However, check that SLAM is not actively overwriting it (Rule 8).
  if (control.publicState().mode === 'mapping') {
    return res.status(409).json({ error: 'Cannot edit map while SLAM is actively running' });
  }

  const pgmPath = path.join(mapsDir, `${req.params.name}.pgm`);
  try {
    fs.writeFileSync(pgmPath, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[api/maps/image] save error:`, err);
    res.status(500).json({ error: 'Failed to write map image' });
  }
});

// --- Navigation (Phase 4) ---

router.post('/navigation/start', async (req, res) => {
  const { token, mapName } = req.body;
  
  if (!token || !mapName) {
    return res.status(400).json({ error: 'token and mapName required' });
  }

  if (!control.isController(token)) {
    return res.status(409).json({ error: 'take control before starting navigation' });
  }

  // Find the map to get its yaml path
  try {
    const { Map } = await import('../models/Map.js');
    const map = await Map.findOne({ name: mapName });
    if (!map) {
      return res.status(404).json({ error: 'map not found' });
    }

    const r = control.startNavigation();
    if (!r.ok) return res.status(409).json({ error: `cannot start navigation (${r.reason})` });
    
    try {
      // Pass the map parameter to the nav2.py launch file (Phase 4 multi-map support)
      const mapArg = `map:='${map.yamlPath}'`;
      const child = roslaunch.launch(ROBOT.nav2?.procName || 'nav2', ROBOT.nav2?.package || 'nav2', ROBOT.nav2?.launchFile || 'nav2.py', [mapArg]);
      
      child.on('exit', () => control.stopNavigation());
    } catch (e) {
      control.stopNavigation();
      return res.status(500).json({ error: String(e?.message || e) });
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error(`[api/navigation/start] error: ${err.message}`);
    res.status(500).json({ error: 'Failed to start navigation' });
  }
});

router.post('/navigation/stop', (_req, res) => {
  procs.stop(ROBOT.nav2?.procName || 'nav2'); 
  res.json({ ok: true });
});
