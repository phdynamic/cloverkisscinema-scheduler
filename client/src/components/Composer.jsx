import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { getPost, createPost, updatePost, uploadImages, getTemplates, createTemplate } from '../api';
import { STATUS_LABELS, graphemeLength, toLocalInput, fromLocalInput } from '../labels';
import Modal from './Modal';
import { prepareImage } from '../imageUtils';

const MAX_SOURCE_BYTES = 40 * 1024 * 1024; // what we'll try to decode and shrink
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

let uidCounter = 0;
const newSegment = (text = '', images = []) => ({ uid: ++uidCounter, text, images });

export default function Composer({ me, onChange }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const isAdmin = me.user.role === 'admin';

  const [threads, setThreads] = useState(() => [newSegment()]);
  const [status, setStatus] = useState(null); // existing post's status
  const [reviewNote, setReviewNote] = useState('');
  const [when, setWhen] = useState('');
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(!id);
  const [templates, setTemplates] = useState(null);
  const fileInputs = useRef({});

  // Prefill from: an existing post, a chosen template, or a calendar day.
  useEffect(() => {
    if (id) {
      getPost(id)
        .then((post) => {
          setStatus(post.status);
          setReviewNote(post.status === 'rejected' ? post.reviewNote || '' : '');
          setThreads(post.threads.map((t) => newSegment(t.text, t.images || [])));
          if (post.scheduledAt) setWhen(toLocalInput(post.scheduledAt));
          setLoaded(true);
        })
        .catch((err) => {
          setError(err.message);
          setLoaded(true);
        });
      return;
    }
    const template = location.state?.template;
    if (template) setThreads([newSegment(template.threads[0]?.text || '')]);
    const date = search.get('date');
    if (date) setWhen(`${date}T09:00`);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (uid, fields) =>
    setThreads((prev) => prev.map((t) => (t.uid === uid ? { ...t, ...fields } : t)));

  const move = (index, dir) => {
    const to = index + dir;
    if (to < 0 || to >= threads.length) return;
    setThreads((prev) => {
      const copy = [...prev];
      [copy[index], copy[to]] = [copy[to], copy[index]];
      return copy;
    });
  };

  const addImages = async (segment, fileList) => {
    setError('');
    const room = 4 - segment.images.length;
    const files = Array.from(fileList).slice(0, room);
    const rejected = files.find((f) => !IMAGE_TYPES.includes(f.type) || f.size > MAX_SOURCE_BYTES);
    if (rejected) {
      setError(`${rejected.name}: images must be JPEG, PNG, GIF or WebP (and not enormous).`);
      return;
    }
    if (!files.length) return;
    setPreparing(true);
    try {
      // Bluesky's limit is 1MB per image and it won't resize for us.
      const ready = [];
      for (const f of files) ready.push(await prepareImage(f));
      const uploaded = await uploadImages(ready);
      patch(segment.uid, {
        images: [...segment.images, ...uploaded.map((u) => ({ path: u.path, filename: u.filename, altText: '' }))],
      });
    } catch (err) {
      setError(err.message);
    }
    setPreparing(false);
  };

  // mode: 'submit' (crew) | 'draft' | 'schedule' | 'now' | 'keep' (manager editing, status unchanged)
  const save = async (mode) => {
    setError('');
    // Crew never choose a time: the manager assigns one, or posts now.
    const scheduledAt = isAdmin ? fromLocalInput(when) : null;
    if (mode === 'schedule' && !scheduledAt) {
      setError('Pick a date and time first, or use Post now.');
      return;
    }
    if (mode === 'now' && !confirm('Post this to Bluesky now?')) return;
    setSaving(true);
    try {
      const payload = {
        threads: threads.map((t) => ({
          text: t.text,
          images: t.images.map((img) => ({ path: img.path, altText: img.altText || '' })),
        })),
      };
      if (mode === 'draft') payload.status = 'draft';
      if (mode === 'submit') payload.status = 'pending';
      if (mode === 'schedule') payload.status = 'scheduled';
      if (mode === 'now') payload.postNow = true;
      if (isAdmin) payload.scheduledAt = scheduledAt;
      const saved = id ? await updatePost(id, payload) : await createPost(payload);
      onChange();
      navigate(`/?tab=${saved.status}`);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const openTemplates = async () => {
    try {
      setTemplates(await getTemplates());
    } catch (err) {
      setError(err.message);
    }
  };

  const saveTemplate = async () => {
    const name = prompt('Template name:');
    if (!name?.trim()) return;
    try {
      await createTemplate({ name: name.trim(), threads: threads.map((t, i) => ({ position: i, text: t.text })) });
      alert('Saved as a template.');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!loaded) return <p className="empty">Loading…</p>;

  const editingApproved = !isAdmin && (status === 'scheduled' || status === 'pending');

  return (
    <div>
      <div className="page-header">
        <div>
          {id && <p className="eyebrow">{`Status: ${STATUS_LABELS[status] || ''}`}</p>}
          <h2 className="display">{id ? 'Edit post' : 'New post'}</h2>
        </div>
        <span className="posting-as">
          <span className="label">Posting as</span> @{me.postingAs}
        </span>
      </div>

      {reviewNote && (
        <div className="note" style={{ marginBottom: 14 }}>
          <span className="label">Sent back by the manager</span>
          {reviewNote}
        </div>
      )}
      {status === 'scheduled' && !isAdmin && (
        <div className="note info" style={{ marginBottom: 14 }}>
          This post is approved. Saving changes sends it back to the manager, who will set the time again.
        </div>
      )}
      {status === 'pending' && isAdmin && (
        <div className="note info" style={{ marginBottom: 14 }}>
          This post is awaiting approval. Schedule or Post now approves it; Save changes keeps it waiting.
        </div>
      )}
      {error && (
        <div className="note" role="alert" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}

      {threads.length > 1 && (
        <div className="note info" style={{ marginBottom: 14 }}>
          Multi-post threads are no longer supported. Remove the extra posts (×) to save changes to this one.
        </div>
      )}

      <div className="composer-form">
        {threads.map((seg, index) => {
          const count = graphemeLength(seg.text);
          return (
            <div key={seg.uid} className="seat">
              {/* Posts are single now; this header only shows for a legacy multi-post thread. */}
              {threads.length > 1 && (
                <div className="seat-header">
                  <span className="seat-number display">{index + 1}</span>
                  <span className="label">{threads.length > 1 ? `Post ${index + 1} of ${threads.length}` : 'Post'}</span>
                  <div className="seat-tools">
                    <button className="btn-small" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                      ↑
                    </button>
                    <button
                      className="btn-small"
                      onClick={() => move(index, 1)}
                      disabled={index === threads.length - 1}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      className="btn-danger btn-small"
                      onClick={() => setThreads((prev) => prev.filter((t) => t.uid !== seg.uid))}
                      disabled={threads.length <= 1}
                      aria-label="Remove this post"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              <textarea
                value={seg.text}
                onChange={(e) => patch(seg.uid, { text: e.target.value })}
                placeholder="Write your post"
                aria-label={`Text for post ${index + 1}`}
              />
              <div className={`char-count ${count > 300 ? 'over' : count > 280 ? 'warn' : ''}`}>{count}/300</div>

              <div className="image-uploads">
                {seg.images.map((img, i) => (
                  <div key={img.path} className="image-upload-item">
                    <img src={`/uploads/${img.filename || img.path.split('/').pop()}`} alt={img.altText || ''} />
                    <button
                      className="remove-img"
                      aria-label="Remove image"
                      onClick={() => patch(seg.uid, { images: seg.images.filter((_, j) => j !== i) })}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {seg.images.length < 4 && (
                  <button
                    className="image-upload-item image-add"
                    aria-label="Add images"
                    disabled={preparing}
                    onClick={() => fileInputs.current[seg.uid]?.click()}
                  >
                    {preparing ? '…' : '+'}
                  </button>
                )}
                <input
                  ref={(el) => (fileInputs.current[seg.uid] = el)}
                  type="file"
                  accept={IMAGE_TYPES.join(',')}
                  multiple
                  hidden
                  onChange={(e) => {
                    addImages(seg, e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {seg.images.map((img, i) => (
                <div key={img.path} className="alt-row">
                  <input
                    type="text"
                    placeholder={`Alt text for image ${i + 1}`}
                    aria-label={`Alt text for image ${i + 1}`}
                    value={img.altText}
                    onChange={(e) =>
                      patch(seg.uid, {
                        images: seg.images.map((x, j) => (j === i ? { ...x, altText: e.target.value } : x)),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          );
        })}

        {isAdmin && (
          <div className="schedule-row">
            <div className="form-group">
              <label className="label" htmlFor="when">
                Goes out at (your local time) — or leave empty and use Post now
              </label>
              <input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
          </div>
        )}

        <div className="button-row">
          {isAdmin ? (
            <>
              <button className="btn-primary" onClick={() => save('schedule')} disabled={saving}>
                {saving ? 'Saving…' : 'Schedule'}
              </button>
              <button className="btn-amber" onClick={() => save('now')} disabled={saving}>
                Post now
              </button>
              <button onClick={() => save(id ? 'keep' : 'draft')} disabled={saving}>
                {id ? 'Save changes' : 'Save draft'}
              </button>
            </>
          ) : (
            <>
              <button className="btn-primary" onClick={() => save('submit')} disabled={saving}>
                {saving ? 'Saving…' : editingApproved ? 'Re-submit for approval' : 'Submit for approval'}
              </button>
              <button onClick={() => save('draft')} disabled={saving}>
                Save draft
              </button>
            </>
          )}
          <button onClick={openTemplates}>Load template</button>
          <button onClick={saveTemplate}>Save as template</button>
        </div>
        {!isAdmin && (
          <p className="muted" style={{ fontSize: '0.95rem' }}>
            The manager reviews everything and picks when it goes out. You'll see their note here if it comes back.
          </p>
        )}
      </div>

      {templates && (
        <Modal title="Load template" onClose={() => setTemplates(null)}>
          {templates.length === 0 ? (
            <p className="muted">No templates saved yet.</p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                className="card"
                style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, textTransform: 'none', letterSpacing: 0 }}
                onClick={() => {
                  setThreads([newSegment(t.threads[0]?.text || '')]);
                  setTemplates(null);
                }}
              >
                <strong className="cream">{t.name}</strong>
                <div className="muted" style={{ fontFamily: 'var(--serif)', fontWeight: 400 }}>
                  {t.threads[0]?.text || '(empty)'}
                </div>
              </button>
            ))
          )}
          <div className="button-row">
            <button onClick={() => setTemplates(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
