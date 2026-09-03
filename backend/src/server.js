import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { connectDb } from './config/db.js';
import { ROBOT } from './config/robot.js';
import { router as api } from './routes/index.js';
import * as procs from './services/processManager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5000;

const app = express();
app.use(cors()); // LAN, single-operator tool — any origin on the network may connect
app.use(express.json());
app.use('/api', api);

// In production the Pi serves the built frontend so the laptop gets UI + API + ws
// from one origin (see docs/DECISIONS.md "Deployment model"). Dev uses `vite dev`.
const dist = resolve(__dirname, '../../frontend/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}

await connectDb();

// Deadman node (Rule 9). Needs ROS sourced; on a laptop without it we skip and warn.
if (process.env.ROS_DISTRO) {
  procs.start('watchdog', 'python3', [ROBOT.watchdog.script]);
} else {
  console.warn('[watchdog] ROS not sourced (ROS_DISTRO unset) — deadman node NOT started.');
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[navhub] API on http://0.0.0.0:${PORT} — reachable across the LAN`);
});

// Rule 11: tear down every spawned process on shutdown.
let shuttingDown = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[navhub] ${sig} — stopping child processes...`);
    procs.stopAll();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 6000).unref(); // don't hang if a child lingers
  });
}
