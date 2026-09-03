# System Architecture — NavHub

> **Read this banner first.** Sections 1 and 3 below describe the
> robot-side structure as best established across this project's
> history. Two specific facts in them are **unconfirmed** as of this
> writing: (a) whether `teleop.py`, `goto.py`, and any Nav2 bringup
> launch file exist on disk, and (b) whether the path is
> `robot_ws/src/nav2/...` or `robot_ws/src/src/nav2/...`. Phase 0 in
> PHASES.md exists specifically to resolve both before any code depends
> on them. Treat everything below as "best known, pending verification,"
> per RULES.md Rule 7 — not as settled fact.

## 1. Robot-Side Directory Structure (pending Phase 0 confirmation)

```text
XLeRobot/
├── nav2/                       # ament_python package
│   ├── package.xml
│   ├── setup.py
│   ├── setup.cfg
│   ├── resource/
│   └── nav2/                   # python module — same name as the package
│       ├── __init__.py
│       ├── odom.py             # motor control + wheel odometry — CONFIRMED
│       ├── teleop.py           # terminal WASD teleop — UNCONFIRMED, may not exist
│       ├── goto.py             # UNCONFIRMED, may not exist — read fully if present
│       ├── launch/
│       │   ├── slam.py         # SLAM bringup — CONFIRMED
│       │   └── <nav file?>     # Nav2 bringup — UNCONFIRMED, name and
│       │                       # existence both open, see PRD §8
│       ├── params/
│       │   ├── nav2_params.yaml       # confirmed to exist
│       │   └── laser_filter.yaml      # confirmed to exist
│       └── map/                # default map location — see multi-map note
└── rplidar_ros/                 # ament_cmake package, RPLiDAR SDK + driver
```

**Naming note:** the package itself is named `nav2` — identical to the
ROS 2 Nav2 framework. `ros2 launch nav2 slam.py` refers to *this* custom
package, not the framework. Keep this straight in backend code and
comments; it's an easy source of confusion.

**Path depth:** write paths as `robot_ws/src/nav2/nav2/...` until Phase 0
confirms otherwise against the real, copied workspace on disk.

## 2. NavHub App Directory Structure

```text
navhub/
├── docs/                       # PRD.md, ARCHITECTURE.md, RULES.md, PHASES.md, DECISIONS.md (append-only)
├── backend/                    # Express.js API & process manager
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js           # DB connection
│   │   │   └── robot.js        # hardcoded launch commands, this robot only
│   │   ├── routes/             # REST API: Process, Maps, Waypoints
│   │   └── services/
│   │       └── processManager.js  # spawn/kill wrappers, mode tracking,
│   │                               # full-process-tree cleanup (RULES Rule 11)
│   ├── maps/                   # working set of saved .pgm / .yaml files
│   └── package.json
├── frontend/                   # React + TypeScript + Tailwind UI
│   ├── src/
│   │   ├── components/         # Joystick, MapCanvasEditor, Scene3D, WaypointList, EStopButton
│   │   └── services/           # roslibjs Ros connection context, ActionClient wrapper, REST client
│   └── package.json
└── robot_ws/                   # copied ROS 2 workspace (copy, not submodule — see §5)
    └── src/
        ├── nav2/                # copy of ~/XLeRobot/nav2, paths fixed (see §6)
        └── rplidar_ros/         # copy of ~/XLeRobot/rplidar_ros
```

This is a starting structure, not a fixed contract — change it as the app
grows, but log the change and why in `docs/DECISIONS.md` per RULES.md
Rule 1, so the doc doesn't quietly drift from what's actually there.

## 3. Process Execution Flow

`backend/src/services/processManager.js` uses Node's
`child_process.spawn()` against the internal `robot_ws`. Every command
below is a fixed string in `config/robot.js` — nothing generated
dynamically.

| Trigger | Backend Action | Status |
|---|---|---|
| App boot | `bash start_navhub.sh` → DB, Express `:5000`, `rosbridge_server` `:9090`. Does **not** start `odom.py` or the RPLiDAR node — those come up independently via systemd. | confirmed |
| Click "Start Mapping" | `ros2 launch nav2 slam.py` | confirmed — file exists on disk |
| Click "Save Map" | `ros2 run nav2_map_server map_saver_cli -f backend/maps/<name>` | confirmed |
| Click "Start Navigation" | `ros2 launch nav2 <file>` | **open — filename and existence unconfirmed, see PRD §8 / PHASES Phase 0. Do not wire until resolved.** |
| Click "E-Stop" | Cancel active `/navigate_to_pose` goal via action client + publish zero `Twist` to `/cmd_vel` | new logic, not wrapping an existing script |
| Set Initial Pose (canvas click) | Publish `PoseWithCovarianceStamped` → `/initialpose` | new interaction, replaces RViz's "2D Pose Estimate" drag |
| Set Goal Pose (canvas click) | Send goal via `roslibjs.ActionClient` → `/navigate_to_pose` | new interaction, replaces RViz's "2D Goal Pose" drag; action client, not raw topic publish (RULES Rule 12) |
| Teleop (joystick / keys) | roslibjs publishes `Twist` directly to `/cmd_vel` from the browser | replaces terminal teleop workflow (existing script status open, see PRD §8) |
| Map editor save | Overwrite the `.pgm` in place; `.yaml` untouched | file edit, not a live topic publish — see §7 |
| Record Waypoint | Read `/amcl_pose` once, compute yaw, store `{x, y, yaw, mapId, name}` | automated version of manual `ros2 topic echo /amcl_pose --once` |
| Dispatch Waypoint | Load stored pose, send via action client | one-click version of drive-and-click flow |
| Stop / cleanup | `SIGINT` (or kill the process group) on any active spawned process tree | required on every Stop click, E-Stop, and backend shutdown — see RULES Rule 11 |

## 4. ROS 2 Topics, Services & Actions Reference

| Name | Type | Direction | Used By |
|---|---|---|---|
| `/cmd_vel` | `geometry_msgs/Twist` | publish | joystick, keyboard teleop, E-Stop |
| `/map` | `nav_msgs/OccupancyGrid` | subscribe | live SLAM view, nav view |
| `/tf` | `tf2_msgs/TFMessage` | subscribe | robot pose overlay, both views |
| `/scan` | `sensor_msgs/LaserScan` | subscribe | live LiDAR points |
| `/initialpose` | `geometry_msgs/PoseWithCovarianceStamped` | publish | AMCL localization trigger |
| `/navigate_to_pose` | `nav2_msgs/action/NavigateToPose` | action client | goal dispatch, live status, cancellation |
| `/amcl_pose` | `geometry_msgs/PoseWithCovarianceStamped` | subscribe | waypoint recording |
| `/plan` | `nav_msgs/Path` | subscribe | planned route overlay |
| `/global_costmap/costmap` | `nav_msgs/OccupancyGrid` | subscribe | costmap overlay |
| `/local_costmap/costmap` | `nav_msgs/OccupancyGrid` | subscribe | costmap overlay (rolling window) |
| `map_saver_cli` | service / CLI | invoke | "Save Map" |

## 5. Robot Workspace Integration Strategy: Copy, Not Submodule

**Decision:** plain copy of `~/XLeRobot/{nav2,rplidar_ros}` into
`navhub/robot_ws/src/`, not a git submodule.

**Reasoning:** these are the live, currently-running files on the
physical Pi. If they contain hand-tuning (PID constants, wheel
calibration, param values) not pushed upstream to
`KMTI-ROBOPARADIGM/mobile-manipulator` (`xlerobot` branch), a submodule
would silently pull the pristine upstream version instead, discarding
that tuning. A plain copy preserves exactly what's actually running.
Revisit as a submodule only after explicitly confirming the local files
match upstream (PRD.md §8).

Before committing the copy: remove `__pycache__`, `log`, and `temp`
directories and add them to `.gitignore` rather than tracking them.

## 6. Path Fixes Required After Copying

Run before the first `colcon build` inside `navhub/robot_ws`:

```bash
grep -rn "/home/\|xlerobot\|XLeRobot" navhub/robot_ws/src/ --include="*.py" --include="*.yaml"
```

How to interpret hits:

- `get_package_share_directory('nav2') + <relative path>` → **safe,
  leave untouched.** Resolves through ROS's package index at runtime,
  correctly finds the new location after `colcon build`, regardless of
  where the workspace lives.
- A plain hardcoded absolute string (e.g.
  `/home/yunis/XLeRobot/nav2/nav2/params/nav2_params.yaml`) → **broken,
  rewrite** to the new `navhub/robot_ws/...` path.
- The **map path** — confirmed hardcoded today (navigation currently runs
  with no `map:=` argument) — needs updating once the real nav bringup
  file is confirmed (Phase 0).
- Any `sys.path.append(...)` manual import hacks in `odom.py` or any
  confirmed-to-exist teleop/goto scripts — common in code that started
  standalone before being wrapped into a ROS package.
- Any `yaml_filename` key under a map-server section in
  `nav2_params.yaml` pointing at an old absolute path.
- `.bashrc` / systemd unit currently sourcing the old workspace's
  `install/setup.bash` → update to point at
  `navhub/robot_ws/install/setup.bash`.

Hardcoded-path bugs fail *silently* — the process starts, it just can't
find the map or params, producing a confusing runtime error instead of
an obvious one. Fix by reading, not by debugging a launch failure later.

## 7. Map Editing Semantics

Map editing is **file editing, not live topic editing**:

1. SLAM run finishes → "Save Map" → `map_saver_cli` writes `<name>.pgm`
   + `<name>.yaml`.
2. The editor loads that `.pgm` (white = free, black = obstacle, gray =
   unknown — standard OccupancyGrid convention).
3. Brush tool paints obstacles in or out.
4. Save overwrites the same `.pgm` in place. The paired `.yaml`
   (resolution, origin) is never modified by the editor.
5. The next navigation launch loads the edited file from disk.

A live "draw on the currently-running map" editor is explicitly out of
scope — `slam_toolbox` republishes and overwrites `/map` on every scan
while active, so any edit published back mid-mapping is immediately
lost. This is a fundamentally harder problem than editing a saved map,
and NavHub does not attempt it.

## 8. Coordinate Conversions

- **Canvas pixel → map metric:** convert `(u, v)` to `(X_m, Y_m)` using
  the `.yaml`'s `resolution` and `origin` before publishing any pose or
  goal derived from a canvas click.
- **Quaternion → yaw:** `yaw = 2 * Math.atan2(z, w)` — valid because the
  robot only rotates about Z (planar motion), so `x`/`y` orientation
  components are always zero.

## 9. Networking Prerequisites

- Laptop and the robot's Pi need the same `ROS_DOMAIN_ID` only for direct
  ROS 2 discovery — not required for NavHub itself (it talks over the
  rosbridge websocket), but still required if debugging with RViz2
  alongside NavHub.
- `rosbridge_server` on `:9090` (websocket, JSON) — fine at this scale
  for `/cmd_vel`, `/map`, `/tf`, and pose/goal-sized messages. JSON
  overhead only becomes a real problem for point clouds or camera feeds.
- Express REST API on `:5000`.
- Database on its default port (see §11).
- If a live camera feed is ever added, stream it separately (MJPEG or
  WebRTC over plain HTTP) rather than through rosbridge — that's
  specifically where the overhead bites.

## 10. Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, `roslibjs`,
  `ros3djs`/Three.js, `react-konva`, `nipplejs` (joystick).
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB (schemas below). Worth a one-line note: for the
  actual scale here — a handful of maps and waypoints, single robot — a
  plain JSON file or SQLite would do the same job without a separate
  service to run. MongoDB is a fine choice if already comfortable with
  it; noted here so it's a deliberate call, not an inherited default.
- **Robot core:** ROS 2 Jazzy, Nav2, `slam_toolbox` (presumed — confirm
  by reading `slam.py` in Phase 0, not yet directly verified).

## 11. MongoDB Schemas

```javascript
// Map Schema
const MapSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  imagePath: { type: String, required: true }, // Path to .pgm
  yamlPath: { type: String, required: true },  // Path to .yaml
  resolution: { type: Number, required: true },
  origin: { type: [Number], required: true },  // [x, y, yaw]
  createdAt: { type: Date, default: Date.now }
});

// Waypoint Schema
const WaypointSchema = new mongoose.Schema({
  mapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Map', required: true },
  name: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  yaw: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});
```
