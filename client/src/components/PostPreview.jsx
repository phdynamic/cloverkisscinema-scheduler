import React from 'react';

// A post's complete text (every segment of a legacy thread) and all of its images.
export default function PostPreview({ post, className = '', showImages = true }) {
  const text = post.threads.map((t) => t.text).filter(Boolean).join('\n\n');
  const images = post.threads.flatMap((t) => t.images || []);
  return (
    <>
      <div className={`post-preview ${className}`}>{text || (images.length ? '' : '(empty)')}</div>
      {showImages && images.length > 0 && (
        <div className="preview-images">
          {images.map((img) => (
            <img
              key={img.id ?? img.path}
              src={`/uploads/${img.filename || img.path.split('/').pop()}`}
              alt={img.altText || ''}
            />
          ))}
        </div>
      )}
    </>
  );
}
