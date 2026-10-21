import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startLogin } from '../api';
import { Hero } from './Marquee';

const ERRORS = {
  not_approved:
    "That Bluesky account isn't on the approved list yet. Ask the manager (@professorkiosk.wtf) to add you.",
  cancelled: 'Sign-in was cancelled.',
  failed: "Sign-in didn't go through. Please try again.",
};

export default function Login() {
  const [params] = useSearchParams();
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(ERRORS[params.get('error')] || '');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      window.location.href = await startLogin(handle);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <Hero />
      <div className="card login-card">
        <p className="eyebrow">Sign in</p>
        <p style={{ marginTop: 8 }}>
          Approved crew members sign in with Bluesky. Your password stays with Bluesky; we only learn who you are.
        </p>
        <form onSubmit={submit}>
          {error && (
            <div className="note" role="alert">
              {error}
            </div>
          )}
          <div className="form-group">
            <label className="label" htmlFor="handle">
              Your Bluesky handle
            </label>
            <input
              id="handle"
              type="text"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="you.bsky.social"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={busy || !handle.trim()}>
            {busy ? 'Opening Bluesky…' : 'Sign in with Bluesky'}
          </button>
        </form>
      </div>
    </div>
  );
}
