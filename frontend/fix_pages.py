import re

print("Processing PointsPage.tsx...")
with open('/home/yunis__147/NavHub/frontend/src/pages/PointsPage.tsx', 'r') as f:
    points = f.read()

# For PointsPage:
# 1. Rename component to PointsPage (already done)
# 2. Change "Autonomous Navigation" to "Map Localization" or "Map Mode"
# 3. Remove "Send Nav Goal" button
# 4. Remove goal_pose from interactMode
# 5. Remove "Go ->" button in waypoints

points = points.replace("Autonomous Navigation", "Map Active (For Points)")
points = points.replace("sendNavGoal", "")
points = points.replace("onSetGoalPose={handleSetGoalPose}", "")

# Remove Send Nav Goal interaction mode block entirely
import textwrap

points = re.sub(
    r'<button\s+onClick=\{\(\) => setInteractMode\(\'goal_pose\'\)\}.*?🎯 Send Nav Goal\s*</button>',
    '',
    points,
    flags=re.DOTALL
)

# Remove the 'Go ->' dispatch button
points = re.sub(
    r'<button\s+onClick=\{\(\) => handleDispatchWaypoint\(wp\)\}.*?<span>Go</span> <span>→</span>\s*</button>',
    '',
    points,
    flags=re.DOTALL
)

# Replace 'navigating' related stuff or just keep it simple since we're deleting NavGoalStatus.
# Change "Start Nav2" text to "Start Map Mode"
points = points.replace("Start Nav2", "Start Map Mode")
points = points.replace("Stop Navigation", "Stop Map Mode")

with open('/home/yunis__147/NavHub/frontend/src/pages/PointsPage.tsx', 'w') as f:
    f.write(points)

print("Processing NavigationPage.tsx...")
with open('/home/yunis__147/NavHub/frontend/src/pages/NavigationPage.tsx', 'r') as f:
    nav = f.read()

# For NavigationPage:
# 1. Remove KeyboardTeleop import and usage
# 2. Remove Waypoint recording UI (+ Record Here, the input field for New Waypoint)
# 3. Remove handleDeleteWaypoint button (Optional, maybe they still want to delete from this page? We can leave delete, but remove Record)

nav = re.sub(r'import \{ KeyboardTeleop \} from \'../components/KeyboardTeleop\';\n?', '', nav)
nav = re.sub(r'<KeyboardTeleop[\s\S]*?/>', '', nav)

# Remove "+ Record Here" button line
nav = re.sub(
    r'\{!recordingWaypoint && \(\s*<button.*?onClick=\{\(\) => setRecordingWaypoint\(true\)\}.*?\+\s*Record\s*Here\s*</button>\s*\)\}',
    '',
    nav,
    flags=re.DOTALL
)

# Remove the actual recording UI logic box 
nav = re.sub(
    r'\{recordingWaypoint && \([\s\S]*?saving current pose[\s\S]*?Cancel</button>\s*</div>\s*</div>\s*\)\}',
    '',
    nav,
    flags=re.DOTALL
)

with open('/home/yunis__147/NavHub/frontend/src/pages/NavigationPage.tsx', 'w') as f:
    f.write(nav)

print("Done.")
