import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-for-development';

export const encrypt = (value) => {
  if (value === null || value === undefined) return null;
  const stringValue = String(value);
  return CryptoJS.AES.encrypt(stringValue, ENCRYPTION_KEY).toString();
};

export const decrypt = (value) => {
  if (!value) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(value, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // Tenta converter para número se for um número
    const num = Number(decrypted);
    return isNaN(num) ? decrypted : num;
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    return null;
  }
};

export const hash = (text) => {
  if (!text) return null;
  return CryptoJS.SHA256(text).toString();
}; 