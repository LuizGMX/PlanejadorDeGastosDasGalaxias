// cryptoUtil.mjs
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const key = Buffer.from(process.env.KEY, 'hex');
const defaultIv = Buffer.from(process.env.IV, 'hex');

export function encrypt(text, iv = defaultIv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { encryptedData: encrypted, iv: iv.toString('hex') };
}

export function decrypt(encryptedData, ivHex) {
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}