import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPosts, deletePost, updatePost, approvePost, rejectPost } from '../api';
import { STATUS_LABELS, TAB_ORDER, TAB_HINTS, formatWhen, toLocalInput, fromLocalInput } from '../labels';
import Modal from './Modal';

export default function Queue({ me, counts, onChange }) {
  const isAdmin = me.user.role === 'admin';
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TAB_ORDER.includes(params.get('tab')) ? params.get('tab') : isAdmin && counts.pending ? 'pending' : 'scheduled';
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null); // { type: 'approve' | 'reject', post }
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await getPosts({ status: tab }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    await load();
    onChange();
  };

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      setDialog(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const remove = (post) => {
    if (!confirm('Delete this post?')) return;
    run(() => deletePost(post.id));
  };
  const postNow = (post) => {
    if (!confirm('Send this to Bluesky within the next minute?')) return;
    run(() => updatePost(post.id, { status: 'scheduled', scheduledAt: new Date().toISOString() }));
  };

  const openApprove = (post) => {
    setWhen(toLocalInput(post.scheduledAt && new Date(post.scheduledAt) > new Date() ? post.scheduledAt : undefined));
    setDialog({ type: 'approve', post });
  };
  const openReject = (post) => {
    setNote('');
    setDialog({ type: 'reject', post });
  };

  const imageCount = (p) => p.threads.reduce((n, t) => n + (t.images?.length || 0), 0);

  const actions = (p) => {
    const edit = (label = 'Edit') => (
      <button key="edit" className="btn-small" onClick={() => navigate(`/compose/${p.id}`)}>
        {label}
      </button>
    );
    const del = (
      <button key="del" className="btn-danger btn-small" onClick={() => remove(p)}>
        Delete
      </button>
    );
    switch (p.status) {
      case 'pending':
        return isAdmin
          ? [
              <button key="ok" className="btn-primary btn-small" onClick={() => openApprove(p)}>
                Approve
              </button>,
              edit(),
              <button key="no" className="btn-amber btn-small" onClick={() => openReject(p)}>
                Send back
              </button>,
              del,
            ]
          : [edit(), del];
      case 'scheduled':
        return isAdmin
          ? [
              edit(),
              <button key="now" className="btn-amber btn-small" onClick={() => postNow(p)}>
                Post now
              </button>,
              del,
            ]
          : [edit('Edit (needs re-approval)')];
      case 'draft':
        return isAdmin
          ? [
              edit(),
              <button key="now" className="btn-amber btn-small" onClick={() => postNow(p)}>
                Post now
              </button>,
              del,
            ]
          : [edit(), del];
      case 'rejected':
        return [edit('Revise'), del];
      case 'failed':
        return isAdmin
          ? [
              edit(),
              <button key="retry" className="btn-amber btn-small" onClick={() => postNow(p)}>
                Retry
              </button>,
              del,
            ]
          : [];
      case 'sent':
        return isAdmin ? [del] : [];
      default:
        return [];
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">{isAdmin ? 'All crew' : 'Your posts'}</p>
          <h2 className="display">Now Showing</h2>
        </div>
        <button className="btn-primary" onClick={() => navigate('/compose')}>
          + New post
        </button>
      </div>

      <div className="tabs" role="tablist">
        {TAB_ORDER.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            title={TAB_HINTS[t]}
            className={tab === t ? 'active' : ''}
            onClick={() => setParams({ tab: t })}
          >
            {STATUS_LABELS[t]}
            {counts[t] > 0 && <span className="count">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {error && (
        <div className="note" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="empty">Nothing here. {TAB_HINTS[tab]}.</p>
      ) : (
        posts.map((p) => (
          <div key={p.id} className={`card post-card ${p.status === 'pending' ? 'amber' : ''}`}>
            <div className="post-info">
              <div className="post-meta">
                <span className={`badge badge-${p.status}`}>{STATUS_LABELS[p.status]}</span>
                {isAdmin && p.submittedBy && <span>by @{p.submittedBy.handle}</span>}
                <span>{formatWhen(p.sentAt || p.scheduledAt)}</span>
                {p.threads.length > 1 && <span>{p.threads.length}-post thread</span>}
                {imageCount(p) > 0 && <span>{imageCount(p)} image{imageCount(p) > 1 ? 's' : ''}</span>}
              </div>
              <div className="post-preview">{p.threads[0]?.text?.slice(0, 100) || '(image only)'}</div>
              {p.status === 'rejected' && p.reviewNote && (
                <div className="note">
                  <span className="label">The manager says</span>
                  {p.reviewNote}
                </div>
              )}
              {p.status === 'failed' && p.errorMsg && (
                <div className="note">
                  <span className="label">What happened</span>
                  {p.errorMsg}
                  {!isAdmin && ' The manager will take a look.'}
                </div>
              )}
            </div>
            <div className="post-actions">{actions(p)}</div>
          </div>
        ))
      )}

      {dialog?.type === 'approve' && (
        <Modal title="Approve this post" onClose={() => setDialog(null)}>
          <p style={{ marginBottom: 12 }}>“{dialog.post.threads[0]?.text?.slice(0, 120)}”</p>
          <div className="form-group">
            <label className="label" htmlFor="approve-when">
              Goes out at
            </label>
            <input id="approve-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          {dialog.post.scheduledAt && new Date(dialog.post.scheduledAt) < new Date() && (
            <div className="note info">The time they asked for has already passed. Pick a new one.</div>
          )}
          <div className="button-row">
            <button onClick={() => setDialog(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={busy || !when}
              onClick={() => run(() => approvePost(dialog.post.id, fromLocalInput(when)))}
            >
              Approve
            </button>
          </div>
        </Modal>
      )}

      {dialog?.type === 'reject' && (
        <Modal title="Send it back" onClose={() => setDialog(null)}>
          <div className="form-group">
            <label className="label" htmlFor="reject-note">
              What should they change? (they'll see this)
            </label>
            <textarea id="reject-note" rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="button-row">
            <button onClick={() => setDialog(null)}>Cancel</button>
            <button
              className="btn-amber"
              disabled={busy || !note.trim()}
              onClick={() => run(() => rejectPost(dialog.post.id, note.trim()))}
            >
              Send back
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
