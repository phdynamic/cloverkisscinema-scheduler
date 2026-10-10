import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Queue from './components/Queue';
import Composer from './components/Composer';
import Calendar from './components/Calendar';
import Templates from './components/Templates';
import Accounts from './components/Accounts';

const THEMES = [
  { id: 'blue', label: 'Blue' },
  { id: 'red', label: 'Red' },
  { id: 'purple', label: 'Purple' },
  { id: 'teal', label: 'Teal' },
  { id: 'orange', label: 'Orange' },
  { id: 'emerald', label: 'Emerald' },
];

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('skyqueue-theme') || 'blue'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('skyqueue-theme', theme);
  }, [theme]);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h1>SkyQueue</h1>
        <nav>
          <NavLink to="/" end>
            Queue
          </NavLink>
          <NavLink to="/compose">Compose</NavLink>
          <NavLink to="/calendar">Calendar</NavLink>
          <NavLink to="/templates">Templates</NavLink>
          <NavLink to="/accounts">Accounts</NavLink>
        </nav>
        <div className="theme-switcher">
          <div className="theme-switcher-label">Theme</div>
          <div className="theme-dots">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-dot theme-dot-${t.id} ${theme === t.id ? 'active' : ''}`}
                onClick={() => setTheme(t.id)}
                title={t.label}
              />
            ))}
          </div>
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Queue />} />
          <Route path="/compose" element={<Composer />} />
          <Route path="/compose/:id" element={<Composer />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/accounts" element={<Accounts />} />
        </Routes>
      </main>
    </div>
  );
}
