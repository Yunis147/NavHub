import re

with open('/home/yunis__147/NavHub/frontend/src/pages/PointsPage.tsx', 'r') as f:
    text = f.read()

# Let's remove the block exactly
target = """  const handleSetGoalPose = useCallback((pose: Pose2D) => {
    if (ros && navigating) {
      // Cancel existing if any
      if (cancelGoalRef.current) cancelGoalRef.current();

      const cancel = (ros, pose, (status) => {
        setNavGoalStatus(status);
        if (['Succeeded', 'Aborted', 'Canceled'].includes(status)) {
          // keep track
        }
      });
      cancelGoalRef.current = cancel;
      setNavGoalStatus('Sending...');
      setInteractMode('view');
    }
  }, [ros, navigating]);"""

target2 = """  const handleDispatchWaypoint = (wp: WaypointInfo) => {
    // Only view in Points page
  };"""

text = text.replace(target, '')
text = text.replace(target2, '')

with open('/home/yunis__147/NavHub/frontend/src/pages/PointsPage.tsx', 'w') as f:
    f.write(text)

with open('/home/yunis__147/NavHub/frontend/src/pages/NavigationPage.tsx', 'r') as f:
    navText = f.read()
    
navText = navText.replace('const { ros, status } = useRos();', 'const { ros } = useRos();')

with open('/home/yunis__147/NavHub/frontend/src/pages/NavigationPage.tsx', 'w') as f:
    f.write(navText)
