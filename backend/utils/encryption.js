import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

export const encrypt = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Converte o valor para string se não for
  const stringValue = String(value);
  
  // Criptografa o valor
  const encrypted = CryptoJS.AES.encrypt(stringValue, ENCRYPTION_KEY).toString();
  
  return encrypted;
};

export const decrypt = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  
  try {
    // Descriptografa o valor
    const decrypted = CryptoJS.AES.decrypt(value, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
    
    // Tenta converter para número se for um número
    const numValue = Number(decrypted);
    if (!isNaN(numValue) && decrypted !== '') {
      return numValue;
    }
    
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar valor:', error);
    return null;
  }
};

export const hash = (text) => {
  if (!text) return null;
  return CryptoJS.SHA256(text).toString();
}; 