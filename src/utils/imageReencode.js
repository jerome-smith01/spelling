/**
 * Homework photo import: re-encode the photo in the browser before upload.
 * Decoding + drawing to a canvas + exporting a fresh JPEG proves the file is a real
 * image, strips EXIF/GPS and drops anything appended to it (polyglots). The server
 * still validates everything, since its API can be called directly.
 */
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024; // before re-encoding
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;  // server limit
export const LONG_EDGE = 1600;

export class PhotoError extends Error {}

/** Friendly reason a picked file can't be used, or '' if it may be. */
export function photoProblem(file) {
  if (!file) return 'Choose a photo first.';
  const type = (file.type || '').toLowerCase();
  if (/hei[cf]/.test(type) || /\.hei[cf]$/i.test(file.name || '')) {
    return 'iPhone HEIC photos can\'t be read here. In the Camera settings choose "Most Compatible", or take a screenshot of the photo and upload that.';
  }
  if (!ALLOWED_TYPES.includes(type)) return 'Please choose a JPEG, PNG or WebP photo.';
  if (file.size === 0) return 'That file is empty.';
  if (file.size > MAX_SOURCE_BYTES) return 'That photo is too large. Try a smaller one.';
  return '';
}

/** Size that fits `longEdge` on the longer side, never upscaling. */
export function fitSize(width, height, longEdge = LONG_EDGE) {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decode -> canvas -> fresh JPEG Blob. Throws PhotoError with a friendly message. */
export async function reencodePhoto(file) {
  const problem = photoProblem(file);
  if (problem) throw new PhotoError(problem);
  let src;
  try {
    src = await decode(file);
  } catch {
    throw new PhotoError("That photo couldn't be opened. Try taking it again.");
  }
  const { width, height } = fitSize(src.width, src.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // transparent PNGs become white, not black
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(src, 0, 0, width, height);
  src.close?.();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new PhotoError("That photo couldn't be prepared. Please try again.");
  if (blob.size > MAX_UPLOAD_BYTES) throw new PhotoError('That photo is too large. Try a smaller one.');
  return blob;
}
