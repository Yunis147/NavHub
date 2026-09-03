# AI Development Rules — NavHub

These rules apply to any AI assistant (Claude or otherwise) working on
this codebase. Each one exists because of a specific reason, stated
alongside it — several were learned the hard way during planning. If a
situation isn't covered exactly, reason from the "why," don't look for a
loophole in the "what."

## Rule 1 — Decision Logging (Mandatory)

Before modifying `package.json`, changing a ROS message type, introducing
a new dependency, establishing an architectural pattern, writing a
coordinate conversion, or picking a layout structure not already
specified in PRD/ARCHITECTURE/PHASES, append a dated entry to
`docs/DECISIONS.md`. This file is append-only — never edit or delete a
past entry, only add new ones.

**Format:**
```markdown
### [YYYY-MM-DD] Decision Title
- **Context:** Why was this decision needed?
- **Choice Made:** What was decided?
- **Reasoning & Trade-offs:** Why this over the alternatives?
```

**Why:** docs go stale the moment an implementation decision is made that
isn't written down. A running log is the only way anyone — human or AI,
including a future Claude Code session — can tell why the code looks the
way it does, instead of reverse-engineering intent from diffs.

## Rule 2 — Strict File Isolation — No Regeneration

Do **not** rewrite, refactor, "clean up," or regenerate `odom.py`,
`slam.py`, or any confirmed-to-exist `teleop.py` / `goto.py` / Nav2
launch file. These live inside `robot_ws/` and either directly control
physical hardware or its state estimate — they are launch files and
scripts inside a real ROS 2 package (`ros2 launch nav2 slam.py`, not
`python3 slam.py`), found via colcon's build/install system, not
standalone scripts to "clean up."

If a file must move, or a path inside it must change, **copy exactly and
change only the specific line that must differ for the new location** —
never regenerate the logic, even if a rewrite looks cleaner. A small
deviation (a changed QoS setting, a different topic remap, a different
default param) can produce a robot that drives or localizes differently
than the version already tested on hardware.

**This rule protects code that already exists and has been tested — it
does not block writing something that Phase 0 confirms doesn't exist
yet** (for example, a Nav2 bringup launch file, if none is found). New
code gets written, tested against the real robot, and only then falls
under this rule's protection going forward — log that transition in
`docs/DECISIONS.md`.

**Exception:** the terminal teleop workflow is intentionally *replaced*
(not modified) by the web joystick in Phase 1 — a deliberate swap, not a
violation, because `odom.py` only consumes `/cmd_vel` regardless of
where it comes from.

## Rule 3 — No Dynamic ROS Configuration UI

Do not build settings forms for LiDAR height, footprint radius, or
similar physical parameters. This is a personal tool for one
already-tuned robot — those values are hardcoded in the launch/params
files and stay there. Keep the web UI focused on teleop, mapping, map
editing, and navigation.

**Why:** an earlier draft of this project spent real effort designing a
generic hardware-config wizard for a tool that will only ever run on one
known robot. Every hour spent there is an hour not spent on the four
features that actually matter.

## Rule 4 — Coordinate Math

Always explicitly convert canvas pixels `(u, v)` to map metric
coordinates `(X_m, Y_m)` using the `.yaml` file's `resolution` and
`origin` before publishing any pose or goal derived from a click.
Calculate yaw from quaternion `(z, w)` using:

```js
yaw = 2 * Math.atan2(z, w)
```

**Why:** every click-to-navigate and click-to-edit feature depends on
this being exactly right. A silent off-by-one here doesn't crash
anything — it sends the robot to a slightly (or very) wrong place,
which is much harder to notice than a thrown exception.

## Rule 5 — Type Safety

Use strict TypeScript interfaces for all ROS 2 messages
(`geometry_msgs/Twist`, `nav_msgs/OccupancyGrid`,
`geometry_msgs/PoseStamped`, `geometry_msgs/PoseWithCovarianceStamped`,
etc.). Do not use `any`.

**Why:** rosbridge messages are JSON with no compile-time guarantee they
match what's expected. Typing them is the only static check standing
between a malformed message and a runtime failure that only shows up
once the robot is already moving.

## Rule 6 — Safety First — E-Stop

The E-Stop must, on every press, **both** cancel any active
`/navigate_to_pose` goal via the action client **and** publish a
zero-velocity `Twist` (`vx=0, vy=0, wz=0`) to `/cmd_vel`. Every screen
with active teleop or navigation controls must keep E-Stop reachable —
not confined to one panel. Mode exclusivity (`idle`/`mapping`/
`navigating`) is enforced server-side, not only disabled in the UI — a
stale browser tab must not be able to start Nav2 while SLAM is running.

**Why:** this and Rules 9–12 are the actual physical-safety surface of
the app. Everything else — map editing, waypoints, the 3D view — is
convenience. These are the places where a bug means the robot keeps
moving when a human expects it to stop.

## Rule 7 — Verify Before Wiring

Before connecting any UI button to a `ros2 launch` command or script
path, read the actual file on disk and confirm it exists and does what's
assumed. Do not trust a prior guide, doc, or transcript's claimed
filenames over the real filesystem — this project's docs have disagreed
with each other about which files exist more than once. Log the finding
in `docs/DECISIONS.md` once confirmed, and update PRD/ARCHITECTURE if
what's on disk differs from what they currently say.

**Why:** docs describe intent; they drift from disk the moment a file is
renamed, added, or removed and not every doc that mentions it gets
updated. Treat every filename in these docs as "best known, verify once
before depending on it" — including `slam.py`, `odom.py`, and anything
else, not just the ones flagged as currently uncertain.

## Rule 8 — Map Editing Is File Editing, Not Live Topic Publishing

The map editor reads and overwrites the saved `.pgm` on disk. It must
never publish edited data back onto the live `/map` topic while SLAM is
running — `slam_toolbox` will overwrite it on the next scan, so this
would silently do nothing and waste debugging time.

## Rule 9 — Teleop Fallback Requirement

Any teleop control (joystick or keyboard) must include deadman/watchdog
behavior: if the browser tab loses connection mid-drive, the robot stops
automatically rather than continuing the last received command. Safety
requirement, not optional polish.

## Rule 10 — Single-Controller Arbitration

If more than one browser session could be open at once, only one may
hold teleop or navigation control at a time. Don't let two clients race
to publish conflicting `/cmd_vel` commands or navigation goals.

## Rule 11 — Zombie Process Cleanup

The Express backend must properly clean up every `child_process.spawn`
it starts. On a "Stop" click, on E-Stop, or on Express server shutdown,
use `SIGINT` (or kill the process group) to cleanly terminate the entire
ROS 2 process tree spawned by a `ros2 launch` command — not just the
immediate child process.

**Why:** `ros2 launch` spawns a tree of child nodes under itself. Killing
only the top-level process can leave that tree running as orphans, which
then hold ports/topics open and break the *next* launch attempt in a
confusing way that looks unrelated to the actual cause.

## Rule 12 — Action Clients Over Topics for Navigation

Long-running operations — specifically navigation goals — must use a
`roslibjs.ActionClient` against the `/navigate_to_pose` action server.
Do not just publish raw messages to a goal topic.

**Why:** the action interface is the only way to get live goal status
(Pending / Active / Succeeded / Aborted) in the UI, and the only reliable
way to send a cancellation request when E-Stop is pressed. A raw topic
publish can start a goal but can't tell you how it's going or stop it
cleanly.
