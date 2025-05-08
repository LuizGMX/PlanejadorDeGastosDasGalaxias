import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Chave e IV para criptografia
const key = process.env.ENCRYPTION_KEY || 'uma_chave_secreta_de_32_caracteres';
const iv = process.env.ENCRYPTION_IV || '1234567890123456';

// Cache para evitar descriptografia repetida
const decryptCache = new Map();
const CACHE_MAX_SIZE = 1000;

// Função para encriptar dados
export const encrypt = (text) => {
  if (!text) return null;
  
  try {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv));
    let encrypted = cipher.update(text.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('Erro ao encriptar:', error);
    return text; // Em caso de erro, retorna o texto original
  }
};

// Função para decriptar dados com cache
export const decrypt = (text) => {
  if (!text) return null;
  
  // Verificar se o valor já está no cache
  if (decryptCache.has(text)) {
    return decryptCache.get(text);
  }
  
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv));
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Adicionar ao cache
    if (decryptCache.size >= CACHE_MAX_SIZE) {
      // Limpar o primeiro item se o cache estiver cheio
      const firstKey = decryptCache.keys().next().value;
      decryptCache.delete(firstKey);
    }
    decryptCache.set(text, decrypted);
    
    return decrypted;
  } catch (error) {
    console.error('Erro ao decriptar:', error);
    return text; // Em caso de erro, retorna o texto original
  }
};

// Função para limpar o cache 
export const clearDecryptCache = () => {
  decryptCache.clear();
};

export default { encrypt, decrypt, clearDecryptCache }; 