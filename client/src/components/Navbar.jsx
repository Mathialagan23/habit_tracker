import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Flame, LogOut, Settings } from 'lucide-react';
import useAuthStore from '../store/authStore';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <nav className="navbar">
      <span className="navbar-brand">Habit Tracker</span>
      <div className="navbar-links">
        <NavLink to="/" end>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink to="/streaks">
          <Flame size={16} /> Streaks
        </NavLink>
      </div>
      <div className="navbar-right">
        <ThemeToggle />
        <NavLink to="/settings" className="btn-icon" title="Settings">
          <Settings size={18} />
        </NavLink>
        <span className="navbar-user">{user?.name}</span>
        <button className="btn btn-ghost" onClick={logout}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
}
