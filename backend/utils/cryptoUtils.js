import crypto from 'crypto';

// A chave de criptografia deve ser armazenada em variável de ambiente
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-min-32-characters-long!';
const IV_LENGTH = 16; // AES bloco de 16 bytes
const AUTH_TAG_LENGTH = 16; // GCM tag de 16 bytes

/**
 * Criptografa um valor usando AES-256-GCM
 * @param {string} text - O texto a ser criptografado
 * @param {string} userId - ID do usuário (usado como salt adicional)
 * @returns {string} - Texto criptografado em formato base64
 */
export const encrypt = (text, userId) => {
  if (!text) return null;
  
  // Combina o ID do usuário com a chave para criar uma chave específica por usuário
  const userKey = crypto.createHash('sha256')
    .update(ENCRYPTION_KEY + userId)
    .digest();
  
  // Cria um IV aleatório
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Cria o cifrador
  const cipher = crypto.createCipheriv('aes-256-gcm', userKey, iv);
  
  // Criptografa o texto
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Obtém a tag de autenticação
  const authTag = cipher.getAuthTag();
  
  // Combina IV, texto cifrado e tag de autenticação para armazenamento
  const combined = Buffer.concat([
    iv,
    Buffer.from(encrypted, 'base64'),
    authTag
  ]);
  
  // Retorna o resultado em base64
  return combined.toString('base64');
};

/**
 * Descriptografa um valor usando AES-256-GCM
 * @param {string} encryptedData - O texto criptografado em formato base64
 * @param {string} userId - ID do usuário (usado como salt adicional)
 * @returns {string} - Texto descriptografado
 */
export const decrypt = (encryptedData, userId) => {
  if (!encryptedData) return null;
  
  try {
    // Combina o ID do usuário com a chave para criar uma chave específica por usuário
    const userKey = crypto.createHash('sha256')
      .update(ENCRYPTION_KEY + userId)
      .digest();
    
    // Converte o texto criptografado de base64 para Buffer
    const data = Buffer.from(encryptedData, 'base64');
    
    // Extrai IV, texto cifrado e tag de autenticação
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
    const encryptedText = data.subarray(IV_LENGTH, data.length - AUTH_TAG_LENGTH);
    
    // Cria o decifrador
    const decipher = crypto.createDecipheriv('aes-256-gcm', userKey, iv);
    decipher.setAuthTag(authTag);
    
    // Descriptografa o texto
    let decrypted = decipher.update(encryptedText, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Erro na descriptografia:', error);
    return null;
  }
}; 