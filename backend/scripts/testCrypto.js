import { encrypt, decrypt } from '../utils/cryptoUtils.js';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

// Testa a criptografia e descriptografia com um userId fictício
const testCrypto = () => {
  console.log('=== Testando Criptografia ===');
  
  const userId = '123';
  const sensitiveData = [
    'usuario@exemplo.com',
    'informação sensível',
    '123456789',
    'Nome Completo do Usuário'
  ];
  
  console.log('Valores Originais:');
  sensitiveData.forEach((data, index) => {
    console.log(`${index + 1}. ${data}`);
    
    // Criptografa o valor
    const encrypted = encrypt(data, userId);
    console.log(`   Criptografado: ${encrypted}`);
    
    // Descriptografa o valor
    const decrypted = decrypt(encrypted, userId);
    console.log(`   Descriptografado: ${decrypted}`);
    
    // Verifica se o valor descriptografado corresponde ao original
    if (decrypted === data) {
      console.log(`   ✅ Teste passou: O valor original foi recuperado.`);
    } else {
      console.error(`   ❌ Teste falhou: O valor recuperado não corresponde ao original.`);
    }
    
    console.log('---');
  });
  
  // Testa com userIds diferentes
  console.log('\nTestar isolamento de dados entre usuários:');
  const data = 'Informação confidencial';
  const userId1 = '123';
  const userId2 = '456';
  
  const encrypted1 = encrypt(data, userId1);
  console.log(`Valor criptografado com userId=${userId1}: ${encrypted1}`);
  
  // Tentativa de descriptografar com userId diferente deve falhar
  const decrypted2 = decrypt(encrypted1, userId2);
  
  if (decrypted2 === null) {
    console.log(`✅ Teste passou: Não foi possível descriptografar com userId diferente.`);
  } else {
    console.error(`❌ Teste falhou: O valor foi descriptografado com userId errado: ${decrypted2}`);
  }
  
  // Descriptografar com userId correto deve funcionar
  const decrypted1 = decrypt(encrypted1, userId1);
  if (decrypted1 === data) {
    console.log(`✅ Teste passou: O valor foi descriptografado corretamente com o userId original.`);
  } else {
    console.error(`❌ Teste falhou: O valor não foi descriptografado corretamente com o userId original.`);
  }
  
  console.log('=== Testes Concluídos ===');
};

// Executa os testes
testCrypto(); 