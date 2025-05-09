import crypto from 'crypto';

/**
 * Gera uma chave de criptografia segura com o tamanho especificado em bytes
 * @param {number} sizeBytes - Tamanho da chave em bytes
 * @returns {string} - Chave em formato hexadecimal
 */
const generateEncryptionKey = (sizeBytes = 32) => {
  const keyBuffer = crypto.randomBytes(sizeBytes);
  return keyBuffer.toString('hex');
};

// Gera e exibe uma chave de 32 bytes (256 bits)
const key = generateEncryptionKey();
console.log('\n=== Chave de Criptografia Gerada ===');
console.log(key);
console.log('\nAdicione esta chave ao seu arquivo .env como:');
console.log(`ENCRYPTION_KEY=${key}`);
console.log('\nIMPORTANTE: Mantenha esta chave segura e não a compartilhe.');
console.log('Se você perder esta chave, não poderá descriptografar os dados existentes.\n'); 