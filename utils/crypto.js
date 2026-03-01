/**
 * Simple AES-256-GCM encryption/decryption for secrets stored in DB.
 * Uses ENCRYPTION_KEY env var (hex, 64 chars = 32 bytes).
 * Falls back to a derived key from SESSION_SECRET if ENCRYPTION_KEY is not set.
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derive a 32-byte key from a string (SESSION_SECRET fallback)
 */
function getKey() {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  // Derive from SESSION_SECRET using scrypt-like hash
  const secret = process.env.SESSION_SECRET || 'nexushub-default-key';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string → "iv:authTag:ciphertext" (hex encoded)
 */
function encrypt(plaintext) {
  if (!plaintext) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

/**
 * Decrypt "iv:authTag:ciphertext" (hex) → plaintext string.
 * Returns empty string on failure (corrupted or wrong key).
 */
function decrypt(encryptedStr) {
  if (!encryptedStr) return '';
  // If it doesn't look encrypted (no colons), return as-is (legacy plain text)
  if (!encryptedStr.includes(':')) return encryptedStr;
  try {
    const parts = encryptedStr.split(':');
    if (parts.length !== 3) return encryptedStr;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = parts[2];
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    // If decryption fails, return as-is (could be plain text from before encryption was added)
    return encryptedStr;
  }
}

module.exports = { encrypt, decrypt };
