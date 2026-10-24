import { useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Auth } from '../AuthContext';

// Sidebar + top navbar shared by every role. menu = [{ path, label }]
export default function Layout({ menu }) {
  const { user, logout } = useContext(Auth);
  return (
    <div className="shell">
      <aside className="sidebar no-print">
        <h1>Exam Hall<br />Allocation</h1>
        <nav>{menu.map((m) => <NavLink key={m.path} to={m.path}>{m.label}</NavLink>)}</nav>
      </aside>
      <div className="main">
        <header className="navbar no-print">
          <span>{user.role.charAt(0) + user.role.slice(1).toLowerCase()} panel</span>
          <span>{user.name} <button className="btn sm ghost" onClick={logout}>Logout</button></span>
        </header>
        <main><Outlet /></main>
      </div>
    </div>
  );
}
