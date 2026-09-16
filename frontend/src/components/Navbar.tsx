import { NavLink } from 'react-router-dom';
import { ConnectionStatus } from './ConnectionStatus';

export function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3 shadow-xl">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">NavHub</h1>
            <p className="text-xs text-slate-400">Robot Mission Control</p>
          </div>
        </div>
        <div className="flex gap-2">
          <NavLink
            to="/teleop"
            className={({ isActive }) =>
              `rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
              }`
            }
          >
            Teleoperation
          </NavLink>
          <NavLink
            to="/mapping"
            className={({ isActive }) =>
              `rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
              }`
            }
          >
            Mapping
          </NavLink>
          <NavLink
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
          <NavLink
            to="/navigation"
            className={({ isActive }) =>
              `rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
              }`
            }
          >
            Navigation
          </NavLink>
          <NavLink
            to="/maps"
            className={({ isActive }) =>
              `rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
              }`
            }
          >
            Maps
          </NavLink>
        </div>
      </div>
      <ConnectionStatus />
    </nav>
  );
}