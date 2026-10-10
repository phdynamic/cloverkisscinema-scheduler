import React, { useState, useEffect } from 'react';
import { getUsers, addUser, removeUser } from '../api';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setUsers(await getUsers());
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await addUser(handle);
      setHandle('');
      await load();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const remove = async (u) => {
    if (!confirm(`Remove @${u.handle} from the guest list? They'll be signed out right away. Their posts stay.`)) return;
    try {
      await removeUser(u.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Manager's office</p>
          <h2 className="display">The Guest List</h2>
        </div>
      </div>

      <form className="card teal" onSubmit={add} style={{ marginBottom: 20 }}>
        <label className="label" htmlFor="new-handle">
          Approve someone by Bluesky handle
        </label>
        <div className="add-user" style={{ marginTop: 8 }}>
          <input
            id="new-handle"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="friend.bsky.social"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
          <button className="btn-primary" type="submit" disabled={busy || !handle.trim()}>
            {busy ? 'Checking…' : 'Add to list'}
          </button>
        </div>
        {error && (
          <div className="note" role="alert">
            {error}
          </div>
        )}
        <p className="muted" style={{ marginTop: 10, fontSize: '0.95rem' }}>
          Approved people can write posts and submit them. Nothing goes out until you approve it.
        </p>
      </form>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        users.map((u) => (
          <div key={u.id} className="card user-row">
            {u.avatar ? <img className="avatar" src={u.avatar} alt="" /> : <div className="avatar" />}
            <div className="info">
              <div className="name">
                {u.displayName || u.handle}{' '}
                <span className={`badge ${u.role === 'admin' ? 'badge-pending' : 'badge-info'}`}>
                  {u.role === 'admin' ? 'Manager' : 'Crew'}
                </span>
              </div>
              <div className="label" style={{ textTransform: 'none', letterSpacing: '0.05em' }}>
                @{u.handle} · {u._count.submitted} post{u._count.submitted === 1 ? '' : 's'} ·{' '}
                {u.lastLoginAt ? `last in ${new Date(u.lastLoginAt).toLocaleDateString()}` : 'never signed in'}
              </div>
            </div>
            {u.role !== 'admin' && (
              <button className="btn-danger btn-small" onClick={() => remove(u)}>
                Remove
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
