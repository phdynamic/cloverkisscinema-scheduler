import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPosts } from '../api';
import { STATUS_LABELS, authorOf } from '../labels';
import PostPreview from './PostPreview';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDay + 1, current: false });
  return cells;
}

export default function Calendar() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [posts, setPosts] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    getPosts({ from, to }).then(setPosts).catch(console.error);
  }, [year, month]);

  const postsByDay = {};
  posts.forEach((p) => {
    if (!p.scheduledAt) return;
    const d = new Date(p.scheduledAt);
    (postsByDay[d.getDate()] ||= []).push(p);
  });

  const step = (delta) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDay(null);
  };

  const monthName = new Date(year, month).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const isoDay = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayPosts = selectedDay ? postsByDay[selectedDay] || [] : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Scheduled posts</p>
          <h2 className="display">Calendar</h2>
        </div>
      </div>

      <div className="calendar-nav">
        <button onClick={() => step(-1)}>← Prev</button>
        <h3 className="display">{monthName}</h3>
        <button onClick={() => step(1)}>Next →</button>
      </div>

      <div className="calendar-grid">
        {DAY_NAMES.map((d) => (
          <div key={d} className="day-header label">
            {d}
          </div>
        ))}
        {monthCells(year, month).map((cell, i) => {
          const isToday = cell.current && year === now.getFullYear() && month === now.getMonth() && cell.day === now.getDate();
          const list = cell.current ? postsByDay[cell.day] : null;
          return (
            <button
              key={i}
              disabled={!cell.current}
              className={`day-cell ${cell.current ? '' : 'other-month'} ${isToday ? 'today' : ''} ${
                cell.current && selectedDay === cell.day ? 'selected' : ''
              }`}
              onClick={() => setSelectedDay(cell.day)}
            >
              <span className="day-number">{cell.day}</span>
              {list && (
                <>
                  <span className="badge badge-pending">
                    {list.length} post{list.length > 1 ? 's' : ''}
                  </span>
                  <span className="dot" aria-label={`${list.length} posts`} />
                </>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div style={{ marginTop: 24 }}>
          <div className="page-header" style={{ marginTop: 0 }}>
            <h3 className="display cream" style={{ fontSize: '1.5rem' }}>
              {new Date(year, month, selectedDay).toLocaleDateString(undefined, { dateStyle: 'full' })}
            </h3>
            <button className="btn-primary btn-small" onClick={() => navigate(`/compose?date=${isoDay(selectedDay)}`)}>
              + Compose for this day
            </button>
          </div>
          {dayPosts.length === 0 ? (
            <p className="muted">Nothing booked.</p>
          ) : (
            dayPosts.map((p) => (
              <button
                key={p.id}
                className="card post-card"
                style={{ width: '100%', textAlign: 'left', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}
                onClick={() => navigate(`/compose/${p.id}`)}
              >
                <div className="post-info">
                  <div className="post-meta">
                    <span className={`badge badge-${p.status}`}>{STATUS_LABELS[p.status]}</span>
                    <span>{new Date(p.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                    {authorOf(p) && <span>@{authorOf(p).handle}</span>}
                  </div>
                  <PostPreview post={p} />
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
