import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { getMe, getPostCounts, logout } from './api';
import { Logo, LoreStats } from './components/Marquee';
import Login from './components/Login';
import Queue from './components/Queue';
import Composer from './components/Composer';
import Calendar from './components/Calendar';
import Templates from './components/Templates';
import Admin from './components/Admin';

export default function App() {
  const [me, setMe] = useState(undefined); // undefined = loading, null = signed out
  const [counts, setCounts] = useState({});

  const refreshCounts = useCallback(() => {
    getPostCounts().then(setCounts).catch(() => {});
  }, []);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => setMe(null));
    const onUnauthorized = () => setMe(null);
    window.addEventListener('ckc:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ckc:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (me) refreshCounts();
  }, [me, refreshCounts]);

  if (me === undefined) {
    return (
      <div className="page">
        <p className="empty">Dimming the lights…</p>
      </div>
    );
  }
  if (me === null) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const { user, postingAs } = me;
  const isAdmin = user.role === 'admin';

  return (
    <div className="page">
      <header className="marquee">
        <div className="app-top">
          <Logo />
          <div className="titles">
            <p className="eyebrow">Now showing, at sundown</p>
            <h1 className="display">
              <span className="green">The Projection</span> <span className="cream">Booth</span>
            </h1>
          </div>
          <div className="user-chip">
            <div className="who">
              <div className="cream">{user.displayName || user.handle}</div>
              <div className="muted">{isAdmin ? 'The manager' : 'Crew'}</div>
            </div>
            {user.avatar ? <img src={user.avatar} alt="" /> : <div className="avatar" />}
            <button
              className="btn-small"
              onClick={async () => {
                await logout();
                setMe(null);
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        <LoreStats />
      </header>

      <nav className="site-nav" aria-label="Main">
        <NavLink to="/" end title="Everything in the pipeline">
          Now Showing
          {isAdmin && counts.pending > 0 && <span className="nav-count">{counts.pending}</span>}
        </NavLink>
        <NavLink to="/compose" title="Write a new post">
          The Booth
        </NavLink>
        <NavLink to="/calendar" title="Calendar view">
          Showtimes
        </NavLink>
        <NavLink to="/templates" title="Saved post templates">
          Prop Room
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" title="Manage who can sign in">
            Manager's Office
          </NavLink>
        )}
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Queue me={me} counts={counts} onChange={refreshCounts} />} />
          <Route path="/compose" element={<Composer me={me} onChange={refreshCounts} />} />
          <Route path="/compose/:id" element={<Composer me={me} onChange={refreshCounts} />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/templates" element={<Templates me={me} />} />
          <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
