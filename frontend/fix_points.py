import re

with open('/home/yunis__147/NavHub/frontend/src/pages/PointsPage.tsx', 'r') as f:
    text = f.read()

# Remove unused variables and functions
text = re.sub(r'const handleDispatchWaypoint = \(.*?\}?;', '', text, flags=re.DOTALL)
text = re.sub(r'const handleSetGoalPose = useCallback\(.*?\}\], \[.*?\]\);', '', text, flags=re.DOTALL)

with open('/home/yunis__147/NavHub/frontend/src/pages/PointsPage.tsx', 'w') as f:
    f.write(text)

with open('/home/yunis__147/NavHub/frontend/src/pages/NavigationPage.tsx', 'r') as f:
    navText = f.read()

navText = re.sub(r'const canDrive = hasControl .*?;', '', navText)

with open('/home/yunis__147/NavHub/frontend/src/pages/NavigationPage.tsx', 'w') as f:
    f.write(navText)

print("Fixed")
