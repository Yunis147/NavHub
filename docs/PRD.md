# Product Requirements Document (PRD) — NavHub

## 1. Executive Summary

NavHub is a self-contained, browser-based mission control application built
for one specific robot: the XLeRobot (3-wheel ST3215 omni base + RPLiDAR,
ROS 2 Jazzy). It replaces a multi-terminal, multi-tool workflow with a
single browser tab: teleoperation, live SLAM map building, in-browser map
editing, autonomous navigation, and named waypoint dispatch.

This is a personal tool for one robot and one operator, not a generic
multi-robot product. That framing drives several decisions below: no
dynamic hardware config UI, no multi-tenant auth, hardcoded launch
commands rather than a general orchestration layer.

## 2. Problem Statement

Today, running the robot end to end requires:

- **Mapping:** 3 terminals on the Pi (`odom.py`, teleop, the SLAM launch
  command) plus a laptop running `rviz2` with `ROS_DOMAIN_ID` matched,
  with displays (Map, TF, LaserScan) added by hand every session.
- **Navigation:** 2 terminals (`odom.py` + the nav launch command) plus
  RViz with 6+ displays added manually, plus manual "2D Pose Estimate"
  and "2D Goal Pose" toolbar drags before every run.
- **Waypoints:** either `ros2 topic echo /clicked_point --once` (position
  only) or driving to a spot and reading `ros2 topic echo /amcl_pose
  --once`, then hand-converting the quaternion to yaw.
- **Map editing:** exporting the `.pgm` and painting over it in an image
  editor, respecting the white=free / black=obstacle / gray=unknown
  convention by hand.

None of this is hard, but all of it is manual and easy to get subtly
wrong — wrong `ROS_DOMAIN_ID`, wrong durability policy, forgetting the
initial pose before sending a goal. NavHub's job is to collapse this into
buttons, without reimplementing or diverging from the ROS 2 logic that
already works.

## 3. Goals

- Zero-terminal operation for normal use: teleop, mapping, editing,
  navigation, and waypoint dispatch all happen from a browser.
- Reuse existing, already-tested hardware-facing code exactly as it is —
  NavHub orchestrates it, it does not reimplement it (see RULES.md Rule
  2). Where something genuinely doesn't exist yet (see §8), build it
  once, test it like any new robot code, and bring it under the same
  protection going forward.
- Persist maps and named waypoints across sessions so re-mapping a space
  is only needed once.
- Feel like a real product — status visibility, a reliable stop — without
  becoming a second RViz.

## 4. Non-Goals (v1)

- **No dynamic hardware configuration UI.** No forms for LiDAR mounting
  height, footprint radius, or similar. This robot's physical parameters
  are fixed and belong in code, not a settings screen.
- **No live map editing over the running `/map` topic.** SLAM Toolbox
  republishes and overwrites `/map` on every scan while active; an edit
  published back mid-mapping is lost on the next update. Editing only
  happens on the *saved* `.pgm`/`.yaml`, after mapping stops (see
  ARCHITECTURE.md §7).
- **No multi-user auth/roles.** Single local operator, local network.
  Becomes a real requirement only if this is ever exposed outside the
  LAN — future work, not built now.
- **No support for other robot models.** Motor driver assumptions,
  package names, and coordinate math are all specific to this XLeRobot.
- **No debugging/deep-inspection tooling.** When something is broken at
  the ROS graph level, the answer is RViz or Foxglove, not making NavHub
  double as a debugger. NavHub stays focused on the operational path.

## 5. Target User & Environment

You, as sole operator, running NavHub against one physical XLeRobot on
the local network. No onboarding flow, no per-user settings.

- **Screen size:** optimized for laptop/tablet (min width 1024px). The
  SLAM and navigation views use a dense split-screen layout — responsive
  phone layouts are explicitly out of scope for v1.
- **Browser:** modern Chromium-based browsers (Chrome, Edge), for
  reliable WebGL (Three.js) and Canvas support.

## 6. Functional Requirements

### 6.1 Teleoperation
- Virtual 2D joystick publishing `geometry_msgs/msg/Twist` to `/cmd_vel`
  over rosbridge. Keyboard fallback: WASD translation, QE rotation
  (3-wheel omni base needs `vx`, `vy`, and `wz` — not just forward/turn).
- Fully replaces the terminal teleop workflow for normal operation.
  `odom.py` only consumes `/cmd_vel`; it doesn't care where the message
  came from, so this is a clean swap. Whether there is an existing
  `teleop.py` file to formally deprecate, or nothing at all to replace,
  is resolved in Phase 0 (§8) — either way, the requirement is the same.
- **Deadman/watchdog stop:** losing the websocket connection or stopping
  joystick input without an explicit release must publish zero velocity
  before/on disconnect. Safety requirement, not polish.
- **Single-controller arbitration:** if more than one browser session
  could be open, only one may hold teleop or navigation control at a
  time — no racing `/cmd_vel` publishers.

### 6.2 Live SLAM Map Building
- "Start Mapping" runs the confirmed SLAM launch command
  (`ros2 launch nav2 slam.py` — confirmed to exist on disk).
- 2D split-screen canvas subscribing to `/map` and `/tf`, live, alongside
  teleop controls in the same view.
- "Save Map" runs `map_saver_cli`, writing `.pgm` + `.yaml` into the
  backend's own maps directory.

### 6.3 2D Map Canvas Editor
- Brush tool (HTML5 Canvas / Konva.js) painting black (obstacle) or white
  (free space) over a **saved** `.pgm`.
- Save overwrites the `.pgm` in place; the paired `.yaml` (resolution,
  origin) is never touched by the editor.
- Operates strictly on saved files, never the live `/map` topic (§4,
  ARCHITECTURE.md §7).

### 6.4 Autonomous Navigation & Visualization
- "Start Navigation" launches the robot's Nav2 bringup. **Which file this
  is, and whether it needs to be written first, is an open item — see
  §8. Do not wire this button until Phase 0 resolves it.**
- Three.js / `ros3djs` viewport: base map, TF axes, live LiDAR
  (`/scan`), Nav2's global/local costmaps, planned path.
- Click-to-set **Initial Pose** (`PoseWithCovarianceStamped` →
  `/initialpose`) and **Goal Pose** — both new interactions built from
  scratch (there is no existing script to wrap), replacing RViz's manual
  toolbar drags. Without the initial pose step, AMCL never localizes and
  every goal after it is wrong.
- **Navigation goals use an action client, not a raw topic publish** —
  `roslibjs.ActionClient` against `/navigate_to_pose`, so the UI can show
  live status (Pending / Active / Succeeded / Aborted) and reliably
  cancel on E-Stop (RULES.md Rule 12).
- **Global E-Stop:** cancels any active Nav2 goal *and* publishes
  zero-velocity to `/cmd_vel`. Reachable from every teleop/nav screen,
  not confined to one panel.

### 6.5 Waypoints & Multi-Map
- **Map Manager:** stores map metadata and file paths; switch between
  saved maps before launching navigation.
- **Record Point:** drive to a spot, click "Record Point," name it. The
  app reads `/amcl_pose` once, computes yaw from the orientation
  quaternion, saves `{x, y, yaw, mapId, name}`.
- **One-Click Dispatch:** select a saved waypoint, send it as a Nav2 goal
  via the same action client as §6.4.
- Before building this, check whatever Phase 0 found about `goto.py`
  (§8) — don't duplicate logic that may already exist.

### 6.6 Process Reliability
- The backend must track a single mode (`idle` / `mapping` /
  `navigating`) and reject conflicting transitions server-side, not only
  in the UI (RULES.md Rule 6 area).
- Every `child_process.spawn` the backend starts must be cleanly
  terminated — full process tree, not just the immediate child — on
  Stop, on E-Stop, and on backend shutdown, so no orphaned SLAM/Nav2
  nodes survive to break the next launch (RULES.md Rule 11).

## 7. Hardware & Boot Assumptions

- The motor driver (`odom.py`) and the RPLiDAR driver start automatically
  on boot via systemd, outside NavHub's control.
- NavHub does not start the motors or the sensor. It only orchestrates
  the higher-level SLAM/Nav2 launch layer from the copied workspace
  inside `navhub/robot_ws/`.

## 8. Open Questions / Risks (Blocking — resolved in PHASES.md Phase 0)

- **File inventory is not fully confirmed.** `odom.py` and `slam.py` are
  confirmed to exist and be correct. `teleop.py` and `goto.py` are
  *unconfirmed* — they appeared in an earlier directory listing but
  haven't been reconfirmed since. **Whether any Nav2 bringup launch file
  exists at all is unconfirmed** — earlier docs disagree with each other
  on this. Phase 0 must run a fresh, literal directory listing on the
  actual robot and treat that as ground truth over anything written in
  any prior doc or conversation, including this one.
  - If a Nav2 launch file exists under any name: read it, confirm it
    performs AMCL + planner + controller + costmap bringup, record the
    real filename, proceed as "wire the existing file."
  - If no such file exists: Phase 4 becomes "author a new Nav2 bringup
    launch file," using `nav2_params.yaml` and `laser_filter.yaml`
    (confirmed to exist) as the params source. This is new development,
    not covered by RULES.md Rule 2's copy-exact protection — it gets
    written, tested against the real robot, and only *then* treated as
    protected, tested code going forward.
  - If `teleop.py` doesn't exist: §6.1 has nothing to formally replace —
    the requirement is unchanged, just framed as new build rather than
    swap.
  - If `goto.py` doesn't exist: §6.5 has no legacy logic to check
    against — skip that gate, proceed directly.
- **Path depth is unconfirmed.** One doc in this project's history shows
  `robot_ws/src/nav2/...` (single `src`), another shows
  `robot_ws/src/src/nav2/...` (double `src`). Confirm which is real
  against the actual copied workspace before any path is hardcoded into
  `config/robot.js`.
- **Local tuning vs. upstream repo is unconfirmed.** Whether the local
  `~/XLeRobot` files diverge from the upstream
  `KMTI-ROBOPARADIGM/mobile-manipulator` repo (`xlerobot` branch) decides
  copy vs. submodule (ARCHITECTURE.md §5) — a submodule would silently
  discard any local-only tuning if it exists.
- **Map path is hardcoded today.** Confirmed: navigation currently runs
  with no `map:=` argument. Supporting multi-map switching (§6.5) means
  either adding a launch argument or having the app overwrite the active
  map file before each nav launch — decide and log in Phase 4.

## 9. Success Criteria

- Complete a full mapping session (drive, watch the map build live, save
  it) with zero terminal commands.
- Edit a saved map's obstacles from the browser and have navigation
  respect the edit on the next launch.
- Navigate to a named, previously recorded waypoint with one click from a
  cold boot, with only the one in-app initial-pose click as manual input.
- E-Stop reliably halts motion and cancels any active nav goal, and
  leaves no orphaned ROS processes behind.
- Losing the browser connection mid-teleop stops the robot rather than
  leaving it moving.
