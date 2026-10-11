// Bluesky rejects image blobs over 1,000,000 bytes and does not resize them.
// We aim a little under that so the upload never lands on the edge.
export const BLUESKY_IMAGE_LIMIT = 1000000;
const TARGET_BYTES = 950000;
const MAX_EDGE = 2000;
const QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58];
const MAX_SHRINKS = 6;

const toBlob = (canvas, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

// Returns a File that is safe to upload: the original if it already fits,
// otherwise a JPEG re-encoded (and downscaled if needed) to fit.
// Throws an Error with a user-readable message when it can't be made to fit.
export async function prepareImage(file) {
  if (file.size <= TARGET_BYTES) return file;

  // Animated/static GIFs can't be re-encoded here without losing the format.
  if (file.type === 'image/gif') {
    throw new Error(`${file.name}: GIFs must be under 1MB. Try a smaller GIF or use a JPEG/PNG.`);
  }

  let bitmap;
  try {
    // 'from-image' applies EXIF rotation so phone photos don't come out sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`${file.name}: couldn't read this image.`);
  }

  let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  for (let shrink = 0; shrink <= MAX_SHRINKS; shrink++) {
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    // JPEG has no transparency: flatten onto white rather than black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of QUALITIES) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= TARGET_BYTES) {
        bitmap.close?.();
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      }
    }
    scale *= 0.8;
  }

  bitmap.close?.();
  throw new Error(`${file.name}: couldn't shrink this image under 1MB.`);
}
