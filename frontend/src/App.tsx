import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import TeleopPage from './pages/TeleopPage';
import MappingPage from './pages/MappingPage';
import NavigationPage from './pages/NavigationPage';
import MapsPage from './pages/MapsPage';
import { KeyboardTeleop } from './components/KeyboardTeleop';
import { useRos } from './services/ros';
import { useControl } from './hooks/useControl';
import { useServerState } from './hooks/useServerState';
import { useTeleop } from './hooks/useTeleop';

export default function App() {
  const { status } = useRos();
  const server = useServerState();
  const { hasControl } = useControl();
  const canDrive = hasControl && server.teleopAllowed && status === 'connected';
  const teleop = useTeleop(canDrive);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {/* Global keyboard handler for teleop (works on both pages) */}
      <KeyboardTeleop enabled={canDrive} onTwist={teleop.setTwist} />
      <Routes>
        <Route path="/teleop" element={<TeleopPage />} />
        <Route path="/mapping" element={<MappingPage />} />
        <Route path="/navigation" element={<NavigationPage />} />
        <Route path="/maps" element={<MapsPage />} />
        <Route path="/" element={<Navigate to="/teleop" replace />} />
      </Routes>
    </div>
  );
}
