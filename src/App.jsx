import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Auth } from './AuthContext';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Students, Departments, Exams, Schedules, Halls, Invigilators } from './pages/Manage';
import Allocate from './pages/Allocate';
import Seating from './pages/Seating';
import Reports from './pages/Reports';
import AssignedHalls from './pages/AssignedHalls';
import { MyExams, MyHall, Profile } from './pages/StudentPages';

// Menu + pages for each role
const MENUS = {
  ADMIN: [['/dashboard', 'Dashboard', <Dashboard />], ['/students', 'Students', <Students />],
    ['/departments', 'Departments', <Departments />], ['/exams', 'Exams', <Exams />],
    ['/schedule', 'Exam Schedule', <Schedules />], ['/halls', 'Halls', <Halls />],
    ['/invigilators', 'Invigilators', <Invigilators />], ['/allocate', 'Hall Allocation', <Allocate />],
    ['/seating', 'Seating Arrangement', <Seating />], ['/reports', 'Reports', <Reports />]],
  STUDENT: [['/dashboard', 'Dashboard', <Dashboard />], ['/my-exams', 'My Exams', <MyExams />],
    ['/my-hall', 'My Hall & Seat', <MyHall />], ['/profile', 'Profile', <Profile />]],
  INVIGILATOR: [['/dashboard', 'Dashboard', <Dashboard />], ['/halls', 'Assigned Halls', <AssignedHalls />],
    ['/seating', 'Seating Arrangement', <Seating mine />], ['/profile', 'Profile', <Profile />]],
  COORDINATOR: [['/dashboard', 'Dashboard', <Dashboard />], ['/students', 'Department Students', <Students coord />],
    ['/exams', 'Exams', <Exams coord />], ['/schedule', 'Exam Schedule', <Schedules coord />]],
};

export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const login = (u) => { localStorage.setItem('user', JSON.stringify(u)); setUser(u); };
  const logout = () => { localStorage.removeItem('user'); setUser(null); };

  if (!user) return <Auth.Provider value={{ login }}><Login /></Auth.Provider>;
  const menu = MENUS[user.role];
  return (
    <Auth.Provider value={{ user, login, logout }}>
      <Routes>
        <Route element={<Layout menu={menu.map(([path, label]) => ({ path, label }))} />}>
          {menu.map(([path, , el]) => <Route key={path} path={path} element={el} />)}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </Auth.Provider>
  );
}
