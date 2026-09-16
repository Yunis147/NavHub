// LAN deployment (docs/DECISIONS.md "Deployment model"): the app runs on the Pi and
// laptops connect over the network, so URLs must be Pi-addressable — never localhost.
// Default: derive the Pi host from the browser URL (open http://<pi>:<port> and the rest
// follows). Override via Vite env for laptop-side `vite dev` pointed at the Pi.
const host = import.meta.env.VITE_ROBOT_HOST || window.location.hostname;

export const ROSBRIDGE_URL = import.meta.env.VITE_ROSBRIDGE_URL || `ws://${host}:9090`;
export const API_URL = import.meta.env.VITE_API_URL || `http://${host}:5000`;

export const CMD_VEL_TOPIC = '/cmd_vel';

// Teleop tuning. Conservative caps for Phase 1 — these are the physical-speed knobs
// (Note: leave the constants; a real base needs tuning a minimal model can't see).
export const PUBLISH_HZ = 30;
export const MAX_LINEAR = 0.25; // m/s
export const MAX_ANGULAR = 0.8; // rad/s

// Control-token heartbeat cadence. Must be well under the backend's 3 s token TTL.
export const HEARTBEAT_MS = 1000;

// SLAM live viewer (Phase 2). Robot pose is resolved through the TF chain
// map -> odom -> base_footprint -> base_link (odom.py + slam_toolbox publish these).
export const MAP_TOPIC = '/map';
export const TF_TOPIC = '/tf';
export const TF_STATIC_TOPIC = '/tf_static';
export const MAP_FRAME = 'map';
export const ROBOT_FRAME = 'base_link';
export const MAP_THROTTLE_MS = 1000; // cap /map redraw rate over the LAN
