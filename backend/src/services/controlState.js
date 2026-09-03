import { randomUUID } from 'node:crypto';

// Server-side single source of truth for arbitration (Rules 6 & 10).
// See docs/DECISIONS.md "Arbitration: server-side single-controller token + mode lock".
//
// - mode: hard, server-enforced exclusivity. idle | mapping | navigating.
//   (Transitions for mapping/navigating are added in Phase 2/4; Phase 1 stays idle.)
// - controller: ONE control token. A client acquires it to drive; it must heartbeat
//   or the token expires, so a dead/stale tab automatically frees control.
//
// The raw /cmd_vel publish is browser-direct (ARCHITECTURE §3) and cannot be gated
// here; the frontend self-gates on holding a fresh token AND mode !== 'navigating'.

const TOKEN_TTL_MS = 3000; // no heartbeat within this window => token is stale/free

const state = {
  mode: 'idle',
  controller: null, // { token, since, lastBeat } | null
};

function isFresh(c, now) {
  return c != null && now - c.lastBeat <= TOKEN_TTL_MS;
}

// Drop an expired controller so reads/writes see a clean slate (lazy expiry — no timer).
function reap(now) {
  if (state.controller && !isFresh(state.controller, now)) {
    state.controller = null;
  }
}

export function publicState() {
  const now = Date.now();
  reap(now);
  return {
    mode: state.mode,
    controlled: state.controller != null,
    since: state.controller?.since ?? null,
    teleopAllowed: state.mode !== 'navigating',
  };
}

// Take control. Succeeds only if no fresh controller holds it.
export function acquire() {
  const now = Date.now();
  reap(now);
  if (state.controller) return { ok: false, reason: 'in-use' };
  state.controller = { token: randomUUID(), since: now, lastBeat: now };
  return { ok: true, token: state.controller.token, since: state.controller.since };
}

// Keep the token alive. Fails if the token isn't the current fresh holder.
export function heartbeat(token) {
  const now = Date.now();
  reap(now);
  if (!state.controller || state.controller.token !== token) {
    return { ok: false, reason: 'not-controller' };
  }
  state.controller.lastBeat = now;
  return { ok: true };
}

export function release(token) {
  if (state.controller && state.controller.token === token) {
    state.controller = null;
  }
  return { ok: true };
}

export function isController(token) {
  const now = Date.now();
  reap(now);
  return !!state.controller && state.controller.token === token;
}

// --- Mode transitions (Rule 6/10, server-hard exclusivity) ---
// mapping | navigating are mutually exclusive. Phase 2 adds mapping; Phase 4 adds navigating.

export function startMapping() {
  if (state.mode === 'navigating') return { ok: false, reason: 'navigating' };
  if (state.mode === 'mapping') return { ok: false, reason: 'already-mapping' };
  state.mode = 'mapping';
  return { ok: true };
}

// Safe direction — clears mapping mode. Always allowed (like E-Stop), so a stale/expired
// controller can never leave SLAM stuck running.
export function stopMapping() {
  if (state.mode === 'mapping') state.mode = 'idle';
  return { ok: true };
}
