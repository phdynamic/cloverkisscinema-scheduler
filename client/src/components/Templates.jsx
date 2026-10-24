import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTemplates, deleteTemplate } from '../api';

export default function Templates({ me }) {
  const isAdmin = me.user.role === 'admin';
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    try {
      setTemplates(await getTemplates());
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteTemplate(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Reusable posts</p>
          <h2 className="display">Templates</h2>
        </div>
      </div>

      {error && (
        <div className="note" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="empty">No templates yet. Save a post as a template from the New post page.</p>
      ) : (
        templates.map((t) => (
          <div key={t.id} className="card post-card">
            <div className="post-info">
              <div className="cream" style={{ fontWeight: 600 }}>
                {t.name}
              </div>
              <div className="post-preview muted">
                {t.threads[0]?.text || '(empty)'}
                {t.threads.length > 1 && ` (+${t.threads.length - 1} more)`}
              </div>
            </div>
            <div className="post-actions">
              <button className="btn-primary btn-small" onClick={() => navigate('/compose', { state: { template: t } })}>
                Use
              </button>
              {isAdmin && (
                <button className="btn-danger btn-small" onClick={() => remove(t.id)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
