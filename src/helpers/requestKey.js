// Idempotency keys for writes (BR-02, BR-22). Generate one when a form or wizard
// opens, resend the same key on retry, and replace it only after success. The
// server accepts 16 to 64 characters of [A-Za-z0-9_-].

const fallback = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const newRequestKey = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* insecure context: fall through */
  }
  return fallback();
};

export default newRequestKey;
