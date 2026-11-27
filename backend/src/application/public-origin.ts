export function publicOrigin() {
  const configured =
    process.env.APP_ORIGIN ||
    process.env.RENDER_EXTERNAL_URL ||
    'http://localhost:5173';
  const origin = new URL(configured);
  if (
    !['https:', 'http:'].includes(origin.protocol) ||
    origin.username ||
    origin.password
  ) {
    throw new Error('APP_ORIGIN must be an HTTP(S) origin');
  }
  return new URL(origin.origin);
}
