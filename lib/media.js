import path from 'path';

// Media files live in data/uploads (on the persistent volume in production).
// URLs look like /api/media/<relative-path> and are served by app/api/media.

export const MEDIA_DIR = () => path.join(process.cwd(), 'data', 'uploads');

// Converts a stored media_path (URL form) to an absolute file path.
// Supports legacy '/uploads/...' paths (old public-dir storage) too.
export function mediaPathToFile(mediaPath) {
  const rel = String(mediaPath || '').replace(/^\/api\/media\//, '').replace(/^\/uploads\//, '');
  if (rel.includes('..')) throw new Error('Bad media path');
  const modern = path.join(MEDIA_DIR(), rel);
  return modern;
}
