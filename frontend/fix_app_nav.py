import re

with open('/home/yunis__147/NavHub/frontend/src/App.tsx', 'r') as f:
    app = f.read()

if 'import PointsPage' not in app:
    app = app.replace(
        "import NavigationPage from './pages/NavigationPage';",
        "import NavigationPage from './pages/NavigationPage';\nimport PointsPage from './pages/PointsPage';"
    )
    app = app.replace(
        '<Route path="/navigation" element={<NavigationPage />} />',
        '<Route path="/navigation" element={<NavigationPage />} />\n          <Route path="/points" element={<PointsPage />} />'
    )
    with open('/home/yunis__147/NavHub/frontend/src/App.tsx', 'w') as f:
        f.write(app)

with open('/home/yunis__147/NavHub/frontend/src/components/Navbar.tsx', 'r') as f:
    nav = f.read()

if 'to="/points"' not in nav:
    point_link = """          <NavLink
            to="/points"
            className={({ isActive }) =>
              `rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
              }`
            }
          >
            Points
          </NavLink>
"""
    nav = nav.replace('          <NavLink\n            to="/navigation"', point_link + '          <NavLink\n            to="/navigation"')
    with open('/home/yunis__147/NavHub/frontend/src/components/Navbar.tsx', 'w') as f:
        f.write(nav)

print("Done.")
