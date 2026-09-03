# Decision Log — NavHub

Append-only (RULES.md Rule 1). Newest entries at the bottom. One entry per
non-trivial decision. Never edit or delete a past entry — only add.

Format:

### [YYYY-MM-DD] Decision Title
- **Context:** Why was this decision needed?
- **Choice Made:** What was decided?
- **Reasoning & Trade-offs:** Why this over the alternatives?

---

### [2026-09-02] Database: MongoDB (operator directive, final)
- **Context:** ARCHITECTURE.md §10 flagged MongoDB as arguably overkill for this
  scale (a handful of maps/waypoints, single robot) and noted a JSON file or
  SQLite would suffice. A definitive call was needed before Phase 1 scaffolds a
  datastore dependency.
- **Choice Made:** Use MongoDB (with the Map/Waypoint schemas in ARCHITECTURE.md
  §11). Final — not to be re-litigated.
- **Reasoning & Trade-offs:** Operator's explicit decision. Trade-off accepted: a
  separate service to run/back up vs. a zero-dependency embedded store. Operator
  is comfortable with Mongo; consistency with the documented schemas outweighs the
  minimalism argument here.

### [2026-09-02] Phase 0 verification findings & branch outcomes
- **Context:** PRD §8 / PHASES Phase 0 required a fresh, literal on-disk inventory
  to resolve every open item before app code depends on it. Ground truth taken
  from the actual filesystem, overriding all prior docs (RULES Rule 7).
- **Choice Made:** Recorded facts and the resulting phase branches:
  - **Path depth = single-`src`:** `robot_ws/src/nav2/nav2/...`. No double-`src`
    anywhere. ARCHITECTURE §1/§3 path guidance is correct as written.
  - **`teleop.py` EXISTS** — valid WASD omni teleop (WASD = vx/vy, QE = wz),
    publishes `geometry_msgs/Twist` → `/cmd_vel`, zero-Twist on exit. Not a
    console_script (run as `python3 teleop.py`). → **Phase 1 replaces it** with the
    web joystick (Rule 2 exception, deliberate swap; `odom.py` consumes `/cmd_vel`
    regardless of source).
  - **`goto.py` EXISTS** — terminal waypoint navigator using an rclpy
    `ActionClient` on `navigate_to_pose` (already Rule-12-aligned). Hardcoded
    `LOCATIONS` dict; `yaw→quat = (sin(yaw/2), cos(yaw/2))`; result status
    `4=SUCCEEDED`, `6=CANCELED`; cancels the prior goal before sending a new one.
    → **Phase 5 reuses this action-client pattern** (port to the TS ActionClient
    wrapper), replacing the hardcoded dict with MongoDB waypoints scoped by mapId.
  - **Nav2 bringup launch file EXISTS = `launch/nav2.py`** → command
    `ros2 launch nav2 nav2.py`. Read in full: brings up rplidar + laser_filter +
    two static TFs (base_link→laser `0.01 0 0.6 1.57 0 0`; base_footprint→base_link
    identity) and **includes `nav2_bringup/launch/bringup_launch.py`** with
    `nav2_params.yaml`. `nav2_params.yaml` confirms the full stack: AMCL
    (`OmniMotionModel`), SmacPlanner2D, MPPI controller (Omni), local+global
    costmaps, `bt_navigator` exposing `navigate_to_pose`. → **Phase 4 WIRES this
    existing file** (the "author new" branch does NOT apply). File is
    Rule-2-protected.
  - **`slam.py` confirmed** — `ros2 launch nav2 slam.py`; includes slam_toolbox
    `online_async_launch.py` + rplidar + laser_filter + static TF. Confirms the
    slam_toolbox assumption (ARCHITECTURE §10).
  - **`odom.py`** — consumes `/cmd_vel`; publishes `/odom` + TF
    `odom→base_footprint→base_link`; ST3215 servos (IDs 7/8/9) on `/dev/ttyACM0`;
    calibration constants (`ROBOT_RADIUS=0.16`, `wheel_radius=0.05`,
    `heading_offset=120°`, `CMD_YAW_SIGN`, `YAW_SIGN`). Rule-2-protected — not
    touched.
  - **TF chain** (for Phase 2/4 viewers): `map`→`odom` (AMCL) → `base_footprint`
    (odom.py) → `base_link` → `laser` (static in the launch files).
  - **Saved map** `map/xle_room_map.yaml`: resolution `0.05`, origin
    `[-0.774, -18.170, 0]` — reference for canvas↔metric math (Rule 4). No
    `map:=`/`yaml_filename` path inside `nav2_params.yaml`; map is supplied via the
    launch arg in `nav2.py`.
  - **`/cmd_vel` ownership during navigation:** Nav2 chain is
    controller → velocity_smoother → `collision_monitor` (`cmd_vel_in=cmd_vel_smoothed`,
    `cmd_vel_out=cmd_vel`). So Nav2 actively publishes `/cmd_vel` while navigating —
    validates Rules 6/10/12: teleop must not publish `/cmd_vel` in `navigating`
    mode, and E-Stop must cancel the goal (to stop the chain) AND publish zero.
  - **AMCL `set_initial_pose: true`** (initial_pose ≈ origin): AMCL self-localizes
    at the origin on boot, so nav isn't fully dead without the in-app pose click —
    the click corrects an otherwise-wrong origin assumption. (Mild nuance vs. PRD
    §6.4's "AMCL never localizes" wording; the operational point — wrong pose ⇒
    wrong goals — stands.)
  - **Hardware NOT present on this host:** no `/dev/ttyACM0`, no `/dev/ttyUSB0`,
    `st3215` lib absent. This machine is not the robot Pi → PHASES Phase 0 step 7
    (drive/map/navigate on hardware) is DEFERRED to the operator on the robot.
  - **Dependency `laser_filters` MISSING on this host** — required by BOTH
    `slam.py` and `nav2.py` (`laser_filters/scan_to_scan_filter_chain`). Present:
    nav2_bringup, slam_toolbox, rplidar_ros, nav2_amcl, nav2_mppi_controller,
    nav2_smac_planner, nav2_map_server. Install `ros-jazzy-laser-filters` wherever
    the launches actually run.
  - **`setup.py` console_scripts are stale:** `odom = nav2.base_odom:main` and
    `laser_node = nav2.laser:main` reference modules that no longer exist (current
    motor node is `odom.py:MotorOdom`; there is no `laser.py`). `ros2 run nav2
    odom` would fail. NOT modified — `odom.py` starts via systemd outside NavHub
    (PRD §7), so this is not on NavHub's path, and editing package metadata for the
    hardware boot is out of Phase 0 / NavHub scope. Flagged for the operator.
- **Reasoning & Trade-offs:** Written record per PHASES step 8 — the point is a
  durable inventory, not just correct guesses. Branch outcomes drive Phases 1/4/5.

### [2026-09-02] Localized broken absolute paths in nav2.py and slam.py
- **Context:** `launch/nav2.py` (lines 11–13: map, laser_filter, nav2_params) and
  `launch/slam.py` (line 17: laser_filter) hardcoded absolute paths under
  `/home/rpd/xlerobot/src/XLeRobot/nav2/nav2/...` — a different machine (user
  `rpd`). Broken on this host; would fail silently at launch (ARCHITECTURE §6). The
  stale `install/` tree also still held the pre-rename files (`opus_launch.py`,
  `xle.slam.py`).
- **Choice Made:** Rewrote ONLY those 4 lines to
  `/home/yunis__147/NavHub/robot_ws/src/nav2/nav2/...`. Left all
  `get_package_share_directory(...)` usages untouched; did NOT convert the
  hardcoded paths to `get_package_share_directory`. Left the `goto.py` "XLeRobot"
  strings (print text, not paths). Cleaned `__pycache__`/`src log`, removed the
  stale `build/nav2` + `install/nav2`, added `robot_ws/.gitignore`
  (build/install/log/pycache/temp), then rebuilt `nav2` — verified no `/home/rpd`
  remains and the rewritten targets exist. Fix applied BEFORE the rebuild so the
  install tree is correct.
- **Reasoning & Trade-offs:** Rule 2 (copy exact, change only the differing line)
  + ARCHITECTURE §6 (rewrite hardcoded absolute → new path; leave
  get_package_share alone). Absolute-to-src-absolute preserves the original
  behavior (launch reads yaml from the `src` tree) with the smallest diff.
  Converting to `get_package_share_directory` would change which copy is read
  (install/share vs. src) — a behavioral change reserved for a deliberate later
  decision, not a silent Phase 0 refactor. The map path specifically is revisited
  in Phase 4 for multi-map switching (launch arg vs. overwrite-before-launch, PRD
  §8).

### [2026-09-02] robot_ws stays a plain copy, not a git submodule (confirmed)
- **Context:** ARCHITECTURE §5 provisionally chose copy-over-submodule pending
  Phase 0 confirmation of whether local files diverge from upstream
  `KMTI-ROBOPARADIGM/mobile-manipulator` (`xlerobot` branch).
- **Choice Made:** Keep `navhub/robot_ws` as a plain copy. Confirmed, not
  provisional.
- **Reasoning & Trade-offs:** `~/XLeRobot` is clean and identical to
  `upstream/xlerobot` (`git rev-list --left-right --count` = 0/0). But the NavHub
  copy (`robot_ws/src/nav2`) diverges from both: launch files renamed
  (`opus_launch.py`→`nav2.py`, `xle.slam.py`→`slam.py`), params renamed
  (`opus_params.yaml`→`nav2_params.yaml`), `odom.py` modified, and machine-specific
  paths. Those NavHub-specific files are not in upstream, so a submodule tracking
  `upstream/xlerobot` would not contain them and would discard the divergence. A
  copy preserves exactly what NavHub needs. Revisit only if the workspace is ever
  reconciled against an upstream that carries these changes.

### [2026-09-02] OPEN — RPLiDAR ownership: launch files vs. systemd (doc↔disk conflict)
- **Context:** PRD §7 states the RPLiDAR driver "starts automatically on boot via
  systemd" and "NavHub does not start the motors or the sensor." But on disk, BOTH
  `slam.py` (includes `rplidar_a1_launch`) and `nav2.py` (a `rplidar_node`) start
  the RPLiDAR themselves. If systemd already holds `/dev/ttyUSB0`, the launch's
  rplidar node will fail to open the port (double-open) — and vice-versa. Rule 7
  finding: disk differs from PRD §7.
- **Choice Made:** UNRESOLVED — flagged to operator. Not editing PRD or the launch
  files until the operator confirms their actual systemd setup (does boot start
  rplidar, or only `odom.py`?).
- **Reasoning & Trade-offs:** Two consistent end-states are possible: (a) systemd
  starts only `odom.py` and the SLAM/Nav2 launches own the lidar — then PRD §7's
  "RPLiDAR via systemd" line is wrong and should be corrected; or (b) systemd owns
  the lidar and the `rplidar` node must be removed from the launches — but that is
  a Rule-2 edit to protected launch files, so it needs explicit confirmation. This
  also bears on Rule 11 cleanup (stopping a launch that owns the lidar releases the
  port; stopping one that doesn't, doesn't). Resolve before Phase 2/4 wire these.

### [2026-09-02] Deployment model: app on the Pi, browser clients over the LAN
- **Context:** Operator runs NavHub on the robot Pi and connects from any laptop
  browser on the LAN; the laptop is only a client, not the host. Nothing in the
  frontend may assume it runs on the same machine as the user.
- **Choice Made:** Backend (Express :5000) and `rosbridge_server` (:9090) bind
  `0.0.0.0` on the Pi. The frontend never hardcodes `localhost` — rosbridge and
  REST targets derive from `window.location.hostname` (overridable via Vite env
  `VITE_ROBOT_HOST` / `VITE_ROSBRIDGE_URL` / `VITE_API_URL` for laptop-side
  `vite dev` against the Pi). In production Express serves the built frontend so
  UI + API + websocket are one origin from the laptop's view (`start_navhub.sh`,
  Phase 6). `ROS_DOMAIN_ID` matters only for direct RViz/CLI debugging on the ROS
  graph, not for browser clients (they speak rosbridge).
- **Reasoning & Trade-offs:** "Connect from any laptop" == LAN-addressable.
  Deriving from `window.location.hostname` means zero per-laptop config — open
  `http://<pi>:<port>` and rosbridge/API follow the same host automatically. Env
  overrides keep laptop-side dev usable. API CORS is opened for the LAN origin.

### [2026-09-02] Deadman/watchdog: native rclpy node, always-on, silence-triggered (Rule 9)
- **Context:** `odom.py` applies the last `/cmd_vel` indefinitely — no timeout,
  Rule-2-protected (confirmed by reading it). A browser that dies mid-drive
  without sending zero leaves the robot moving. Operator chose "watchdog node +
  client zero."
- **Choice Made:** Two layers.
  (1) **Client-side:** the browser publishes `Twist` at ~10 Hz only while a
  control is held, and publishes an explicit **zero** on pointer-release, key-up,
  window `blur`, tab-hide (`visibilitychange`), and rosbridge disconnect.
  (2) **Robot-side:** a new NavHub-owned **rclpy** node
  (`backend/ros/cmd_vel_watchdog.py` — deliberately NOT added to the vendored
  `nav2` package, keeping `robot_ws` pristine per Rule 2's spirit) subscribes
  `/cmd_vel` and publishes a single zero `Twist` when no message arrives for
  ~0.5 s. Run as a managed child process (Rule 11 cleanup); auto-started in
  `start_navhub.sh` (Phase 6).
  **Refinement of the approved design:** the node is **always-on and purely
  silence-triggered**, not mode-gated to "off during nav." This is strictly safer
  (also catches a canceled/aborted Nav2 goal that would otherwise coast) and does
  NOT fight Nav2 — during active navigation Nav2's `collision_monitor` fills
  `/cmd_vel` continuously, so the watchdog never sees silence; when idle the robot
  is already stopped, so a zero is a no-op.
- **Reasoning & Trade-offs:** A native rclpy node (vs. a Node-over-rosbridge
  watchdog) survives a rosbridge/websocket crash — the exact "lost connection"
  failure Phase 1 targets — because it speaks ROS directly, not through the same
  bridge the browser uses. Client-side zero gives instant graceful stops; the node
  is the backstop for crash / power-loss / wifi-drop where the client can send
  nothing. The client+node redundancy is deliberate — safety is not simplified away.

### [2026-09-02] Arbitration: server-side single-controller token + mode lock (Rule 6/10)
- **Context:** Rule 10 wants single-controller enforced server-side, but
  ARCHITECTURE §3 has the browser publishing `/cmd_vel` directly via roslibjs,
  which Express cannot intercept. Operator chose "token + server-side mode lock."
- **Choice Made:** Express holds the single source of truth in memory: `mode` ∈
  {`idle`, `mapping`, `navigating`} and one control token `{id, issuedAt,
  lastBeat}`.
  **Hard / server-side:** mode transitions (start/stop mapping, start/stop
  navigating) and — later — goal dispatch route through Express and are rejected on
  conflict (teleop/mapping refused while `navigating`; `navigating` refused while
  `mapping`).
  **Control token:** a client POSTs `/api/control/acquire` to become the
  controller; it heartbeats (~1 s); the token expires server-side after ~3 s of
  silence, so a dead/stale tab automatically frees control for another client.
  **Advisory:** the raw `/cmd_vel` publish is browser-direct, so the frontend
  self-gates (publishes only while it holds the token AND `mode ≠ navigating`).
  E-Stop is always allowed regardless of token.
- **Reasoning & Trade-offs:** Single-operator tool — the realistic threat is a
  forgotten/stale tab, not an adversary. A heartbeat-expiring token handles that
  without routing every joystick tick through Express (which would add
  websocket→backend→ROS latency and contradict ARCHITECTURE §3). The parts that
  must be authoritative (mode exclusivity, goal dispatch) ARE server-hard; only
  the direct-publish gate is advisory, which is acceptable because the browser is
  the sole intended `/cmd_vel` source during teleop and the always-on watchdog +
  Nav2 ownership bound the blast radius.

### [2026-09-02] Launch-file paths: resolve via package share, not absolute paths
- **Context:** Claude Code runs on the operator's laptop; the project runs on the
  Pi, where the username/checkout path differ. A grep of all source dirs found
  hardcoded absolute paths in exactly two files: `nav2.py` (map, laser-filter,
  nav2_params) and `slam.py` (laser-filter). Everything in `backend/` and
  `frontend/` is already path-independent (`resolve(__dirname, …)` and
  `window.location.hostname`). This revises the Phase-0 note that kept absolute
  `src/`-tree paths for editing convenience — the laptop-vs-Pi split makes
  portability a hard requirement that outweighs it.
- **Choice Made:** In both launch files, replace the absolute strings with
  `os.path.join(get_package_share_directory('nav2'), …)`. `setup.py` already
  installs `map/`, `params/`, and `launch/` into the package share dir, so this
  resolves correctly on any machine after a `colcon build`. Rule-2 scope: only the
  4 already-modified path lines changed; nothing else touched.
- **Reasoning & Trade-offs:** Standard ROS mechanism, zero per-machine hand-edits.
  Trade-off: config is now read from the installed copy, so editing a param yaml
  requires `colcon build` (standard ROS workflow) instead of taking effect live.
  Acceptable for static config.
- **Phase 4 note (multi-map, web-selected):** the map is the one path that must NOT
  stay fixed. When the operator records/saves multiple named maps and picks one to
  navigate on from the web UI, the backend must pass the chosen map's absolute path
  to `nav2.py` as a launch argument (`map:=…`), resolved by the backend on whatever
  machine it runs. The `get_package_share_directory` map path above becomes only the
  standalone-CLI default; the web selection overrides it. Never hardcode the nav map.

### [2026-09-02] roslib top-level `this` crash fixed at build time
- **Context:** `roslib/src/RosLib.js` begins `var ROSLIB = this.ROSLIB || {…}`.
  That relies on `this` being `window` (browser `<script>`) or `module.exports`
  (Node). Once bundled, top-level `this` is `undefined` and Vite's CommonJS plugin
  rewrites it to an exports var that is still `undefined` at that point, so the app
  threw `Cannot read properties of undefined (reading 'ROSLIB')` and rendered a
  blank page. Caught by previewing the built frontend on the laptop (Rule 7 in
  spirit — verify before wiring); it would have failed identically on the Pi.
- **Choice Made:** A one-line `enforce:'pre'` Vite transform rewrites that single
  occurrence in `RosLib.js` to `globalThis.ROSLIB` before bundling. `globalThis` is
  always defined and undefined-valued in an app bundle, so roslib initializes fresh.
- **Reasoning & Trade-offs:** Smallest fix that works in both dev and build; no
  runtime global pollution, no forked dependency, no CDN `<script>`. Scoped to the
  exact file by id match. Alternatives (Rollup `moduleContext`, aliasing to the
  browserify UMD) don't apply to a CJS module / don't expose an importable default.

### [2026-09-03] Phase 2 — mapping start/stop authority
- **Context:** Starting SLAM launches a real process on the robot and switches the
  server mode to `mapping`; stopping it must always work even if the caller isn't the
  current controller (same spirit as E-Stop, Rule 6).
- **Choice Made:** `POST /api/mapping/start` requires the control token (Rule 10) AND
  `mode === 'idle'`; it flips the server mode to `mapping`. `POST /api/mapping/stop`
  takes no token and is always allowed. The spawned child's `exit` handler reverts the
  mode to `idle`, so a crash or manual `ros2` kill self-heals the state.
- **Reasoning & Trade-offs:** Mode transitions live server-side (single source of truth
  for every browser). Stop-without-token means any operator can halt mapping; the only
  thing gated is *starting* work. Mode is reverted from the real process lifecycle, not
  optimistically, so the UI never claims "mapping" after the process is gone.

### [2026-09-03] Phase 2 — sourced `ros2 launch` via bash wrapper
- **Context:** The backend spawns `ros2 launch nav2 slam.py`, but `ros2` isn't on PATH
  until both `/opt/ros/<distro>/setup.bash` and the workspace `install/setup.bash` are
  sourced. Node's `spawn` doesn't run a login shell.
- **Choice Made:** `roslaunch.js` builds `source <ros> && source <ws> && exec ros2 launch …`
  and runs it under `bash -c`, spawned detached (Rule 11 tree-kill still applies via the
  process group). Setup paths come from `robot.js` (`ROS_SETUP` / `NAVHUB_WS_SETUP` env
  overrides, else sensible defaults).
- **Reasoning & Trade-offs:** `exec` replaces bash with `ros2` so the tracked PID is the
  real launch process group leader — SIGINT to `-pid` reaches the whole tree. Works
  identically under `npm start`, a systemd unit, or a future container; no PATH assumptions.

### [2026-09-03] Phase 2 — live map viewer renders client-side from /map + /tf
- **Context:** The dashboard needs a live 2D map with the robot's pose. slam_toolbox
  publishes `/map` (OccupancyGrid) and the `map->odom->…->base_link` TF chain separately;
  the robot's map-frame pose isn't published as one message.
- **Choice Made:** Subscribe `/map` (throttled ~1 Hz, queue 1) and `/tf`+`/tf_static`;
  keep a TF tree in the browser and resolve `base_link` in `map` with a small 2D rigid-
  transform walk (`tf2d.ts`, Rule 4, self-checked). `MapViewer` rasterizes the grid to an
  offscreen canvas then blits with a Y-flip (`scale(s, -s)`) so ROS +y points up; robot is
  an oriented arrow. `robotPose` is `null` until the full chain exists (before `map->odom`).
- **Reasoning & Trade-offs:** Pose math on the client avoids a robot-side pose publisher
  and keeps the map file untouched (Rule 8 — viewing only). Plain-JSON grid + full redraw
  is fine for a room map at 1 Hz; ceiling noted in `MapViewer.tsx` (switch to CBOR if a
  large map stutters over the LAN). Y-flip verified in-browser (occupied min-corner lands
  bottom-left).

### [2026-09-03] Phase 2 — setup.py odom entry-point fix
- **Context:** `nav2/setup.py` console_scripts had `odom = nav2.base_odom:main`, but the
  file is `odom.py` (module `nav2.odom`); `ros2 run nav2 odom` would fail. Phase 2's exit
  criterion needs odometry running (drive while mapping).
- **Choice Made:** Changed the one entry point to `odom = nav2.odom:main`. Left the other
  stale entry (`laser_node = nav2.laser:main`, no `laser.py`) untouched — out of scope,
  noted here so it's not mistaken for correct.
- **Reasoning & Trade-offs:** Minimal edit to make the existing `odom.py` runnable; Rule-2
  protected file itself unchanged.
