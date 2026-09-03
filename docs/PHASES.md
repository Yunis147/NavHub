# Implementation Phases — NavHub

Follow these in order. Each phase's dependency on the one before it is
stated explicitly — don't start a phase whose dependency isn't actually
satisfied yet, even if the code would technically run.

## Phase 0 — Full Verification (blocking, do first, no exceptions)

**Depends on:** nothing. This resolves every open item in PRD.md §8
before any application code is written.

1. **Get a fresh, literal file inventory — don't trust any prior doc,
   guide, or conversation about what exists.** Run `ls -la` (or `find`)
   across the actual `robot_ws/src/nav2/nav2/`,
   `robot_ws/src/nav2/nav2/launch/`, and `robot_ws/src/nav2/nav2/params/`
   on the real robot (or the freshly copied workspace). This resolves,
   in one step:
   - whether `teleop.py` and `goto.py` exist,
   - whether any Nav2 bringup launch file exists, under any name,
   - the real path depth — confirm `robot_ws/src/nav2/...` vs.
     `robot_ws/src/src/nav2/...` against what's actually there, since
     this project's docs have shown both.
2. **Branch on what's found:**
   - **Nav2 launch file exists (any name):** open and read it fully.
     Confirm it performs AMCL + planner + controller + costmap bringup —
     don't assume from the filename alone. Record the real filename;
     Phase 4 wires this file.
   - **No Nav2 launch file exists:** Phase 4 is now "author a new Nav2
     bringup launch file" using `nav2_params.yaml` and
     `laser_filter.yaml` as the params source, modeled on standard
     `nav2_bringup` launch patterns. This is new development — RULES.md
     Rule 2's copy-exact protection doesn't apply until this new file
     has been written and tested on the real robot, at which point it
     does.
   - **`teleop.py` exists:** confirm it still works as a WASD teleop
     node (skim, don't rewrite) before Phase 1 designs its replacement.
   - **`teleop.py` doesn't exist:** Phase 1's teleop is a fresh build,
     not a replacement — no behavior-parity target, nothing to diverge
     from.
   - **`goto.py` exists:** read it fully, document what it does — this
     shapes how Phase 5 builds waypoint dispatch.
   - **`goto.py` doesn't exist:** Phase 5 has no legacy logic to check
     against, proceed directly.
3. Copy `nav2/` and `rplidar_ros/` into `navhub/robot_ws/src/` (using
   whichever path depth was confirmed in step 1), preserving package
   structure exactly.
4. `colcon build` from `robot_ws/`, then `source install/setup.bash`.
5. Grep for hardcoded absolute paths per ARCHITECTURE.md §6, fix only
   what's actually broken (leave `get_package_share_directory(...)`
   usage alone), log every fix in `docs/DECISIONS.md`.
6. Confirm whether the local `~/XLeRobot` files diverge from the
   upstream `KMTI-ROBOPARADIGM/mobile-manipulator` repo (`xlerobot`
   branch) — decides copy-stays-copy vs. later-becomes-submodule
   (ARCHITECTURE.md §5). Log the finding either way.
7. Manually re-run the original robot workflow once from the new
   `robot_ws` location — drive with `odom.py`, build+save a map with
   `slam.py`, and (if a nav launch file exists) localize and navigate —
   to confirm the copy didn't break anything before app code depends on
   it.
8. Log every finding from steps 1–2 and 6 in `docs/DECISIONS.md` before
   moving to Phase 1, even the ones that confirm the original
   assumption was right — the point is a written record, not just a
   correct guess.

**Exit criteria:** a complete, confirmed, written inventory of what
actually exists on disk, the real path depth, the copy-vs-submodule
answer, and the original manual workflow still working unchanged from
the new location.

## Phase 1 — Foundation & Teleop

**Depends on:** Phase 0's confirmation of the workspace being live,
`/cmd_vel` being read by `odom.py` from the new location, and whether
`teleop.py` exists (changes framing, not scope — see Phase 0 branch).

1. Scaffold `backend` (Express, DB per ARCHITECTURE §10) and `frontend`
   (React, Tailwind).
2. Set up the `roslibjs` connection context in the frontend.
3. Build the omni joystick (`vx`, `vy`, `wz`) and keyboard fallback
   (WASD/QE), publishing to `/cmd_vel`.
4. Implement the deadman/watchdog stop (Rule 9) and single-controller
   arbitration (Rule 10) here, at the foundation — not bolted on later.

**Exit criteria:** can drive the robot from the browser; losing the tab
or wifi stops the robot rather than leaving it moving.

## Phase 2 — SLAM Orchestration & Live Viewer

**Depends on:** Phase 0 confirming `slam.py`'s real path, Phase 1's
rosbridge connection.

1. Implement the Express route using `child_process.spawn` to
   start/stop `ros2 launch nav2 slam.py`, mode set to `mapping` while
   active, with process-tree cleanup on stop (Rule 11).
2. Build the SLAM dashboard: live 2D canvas on `/map` and `/tf`,
   alongside the Phase 1 teleop controls, same screen.

**Exit criteria:** "Start Mapping" + driving around produces a
live-updating map in the browser.

## Phase 3 — Map Persistence & Canvas Editor

**Depends on:** Phase 2 producing a map that can be saved.

1. Implement the `map_saver_cli` route, writing into `backend/maps/`,
   and the `Map` schema (ARCHITECTURE §11).
2. Build the Konva.js editor: load the saved `.pgm`, paint tool, save
   back to the same file — file editing only, never the live `/map`
   topic (Rule 8).
3. Confirm the `.yaml` resolution/origin survive an edit round-trip
   unchanged.

**Exit criteria:** a map can be edited and reloaded without its metric
scale drifting.

## Phase 4 — Navigation & Visualization

**Depends on:** Phase 0's branch outcome for the Nav2 launch file
(wire existing vs. author new), and a saved map from Phase 3.

1. If Phase 0 found an existing file: wire "Start Navigation" to it, mode
   `navigating`, rejected if `mapping` is active (Rule 6). If Phase 0
   found none: write the new bringup launch file first, test it manually
   against the real robot exactly like any other new robot code, *then*
   wire it — and note in `docs/DECISIONS.md` that it now falls under
   Rule 2's protection.
2. Build the 3D (`ros3djs`/Three.js) viewer: base map, live LiDAR,
   costmaps, planned path.
3. Build the initial-pose and goal-pose click interactions
   (`/initialpose`, and goal dispatch via the `/navigate_to_pose` action
   client — Rule 12, not a raw topic publish). Add live goal-status
   display (Pending/Active/Succeeded/Aborted) from the action feedback.
4. Wire E-Stop: cancel the active goal via the action client **and**
   publish zero velocity, both, always (Rule 6).
5. Decide and implement the multi-map path handling from PRD §8 —
   launch argument vs. overwrite-before-launch — log the decision.

**Exit criteria:** can localize, click a goal, watch the robot navigate
with live status shown, and stop it instantly from E-Stop.

## Phase 5 — Waypoint Database

**Depends on:** Phase 0's `goto.py` finding, and Phase 4's working
`/amcl_pose` + action-client goal dispatch.

1. Create the `Waypoint` schema (ARCHITECTURE §11), scoped by map ID.
2. Build "Record Point": reads `/amcl_pose` once, computes yaw (Rule 4).
3. Build the waypoint list with one-click dispatch via the same action
   client as Phase 4.
4. If Phase 0 found `goto.py` implements comparable logic, decide reuse
   vs. replace and log it; if it doesn't exist, skip this step.

**Exit criteria:** two named waypoints can be recorded and dispatched to
independently.

## Phase 6 — Hardening, Polish & Deployment

**Depends on:** all prior phases functionally working — this phase
proves the safety-critical parts hold up and finishes the zero-terminal
goal, it doesn't add features.

1. Deliberately test the teleop disconnect fail-safe (close the tab,
   kill wifi mid-drive) and confirm the robot actually stops.
2. Deliberately test mode exclusivity from two browser tabs at once —
   confirm the server rejects the conflicting transition, not just the
   UI.
3. Test E-Stop while a goal is actively in progress — confirm both the
   cancellation and the zero-velocity publish happen, and confirm no
   orphaned process is left behind (Rule 11) after repeated start/stop
   cycles.
4. UI polish: loading states for backend API calls, a connection-status
   indicator (e.g. "WebSocket Disconnected"), and clear visual states
   for Succeeded vs. Aborted navigation goals.
5. Write `start_navhub.sh` (DB, Express, `rosbridge_server`, together),
   and register it as a systemd service so NavHub comes up on boot
   alongside `odom.py` and the RPLiDAR driver — completing the
   zero-terminal requirement end to end.

**Exit criteria:** PRD.md's full success-criteria list passes, including
the failure-mode items, not just the happy path.
