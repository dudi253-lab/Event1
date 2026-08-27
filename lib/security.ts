import crypto from 'node:crypto';

export const SESSION_COOKIE = 'digi_staff';
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const IMAGE_TYPES = new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif']);

export function sha256(value:string) { return crypto.createHash('sha256').update(value).digest('hex'); }
export function randomToken() { return crypto.randomBytes(32).toString('base64url'); }
export function safeName(value:string) { return value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(-100) || 'photo.jpg'; }
export function requestFingerprint(headers:Headers) {
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
  return sha256(ip);
}
