import { NavLink } from 'react-router-dom';
import { ConnectionStatus } from './ConnectionStatus';

export function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold">NavHub</h1>
        <div className="flex gap-2">
          <NavLink
            to="/teleop"
            className={({ isActive }) =>
              `rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
              }`
            }
          >
            Teleoperation
          </NavLink>
          <NavLink
            to="/mapping"
            className={({ isActive }) =>
              `rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
              }`
            }
          >
            Mapping
          </NavLink>
        </div>
      </div>
      <ConnectionStatus />
    </nav>
  );
}
