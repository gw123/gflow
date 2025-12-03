/**
 * Crypto Utils - 加密工具
 * 用于加密存储敏感数据 (密钥、存储配置等)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * 获取加密密钥
 * 优先从环境变量读取，否则生成警告
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.warn('[Crypto] WARNING: ENCRYPTION_KEY not set, using default key. This is insecure for production!');
    // 开发环境默认密钥 (生产环境必须设置 ENCRYPTION_KEY)
    return crypto.scryptSync('default-dev-key-do-not-use-in-production', 'salt', KEY_LENGTH);
  }

  // 如果密钥是 base64 编码
  if (key.length === 44) {
    return Buffer.from(key, 'base64');
  }

  // 使用 scrypt 派生密钥
  return crypto.scryptSync(key, 'workflow-encryption-salt', KEY_LENGTH);
}

/**
 * 加密数据
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // 格式: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 解密数据
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 加密 JSON 对象
 */
export function encryptJson(data: any): string {
  return encrypt(JSON.stringify(data));
}

/**
 * 解密 JSON 对象
 */
export function decryptJson<T = any>(ciphertext: string): T {
  const plaintext = decrypt(ciphertext);
  return JSON.parse(plaintext) as T;
}

/**
 * 哈希密码
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const hash = Buffer.from(hashHex, 'hex');
  const derivedHash = crypto.scryptSync(password, salt, 64);

  return crypto.timingSafeEqual(hash, derivedHash);
}

/**
 * 生成随机 Token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成 API Key
 */
export function generateApiKey(): string {
  const prefix = 'wf';
  const key = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${key}`;
}
