import { User, UserBank, Payment, VerificationCode } from '../models/index.js';
import { encrypt } from './cryptoUtils.js';
import sequelize from '../config/db.js';

/**
 * Script para criptografar dados sensíveis existentes no banco de dados
 * Deve ser executado apenas uma vez durante a migração para o novo sistema
 */
const encryptExistingData = async () => {
  console.log('Iniciando criptografia de dados existentes...');
  
  const t = await sequelize.transaction();
  
  try {
    // 1. Criptografar dados de usuários
    console.log('Criptografando dados de usuários...');
    const users = await User.findAll({ transaction: t });
    
    for (const user of users) {
      // Lista de campos a serem criptografados
      const fieldsToEncrypt = [
        'email',
        'telegram_chat_id',
        'telegram_username',
        'financial_goal_name'
      ];
      
      // Cria um objeto com os dados atualizados
      const updates = {};
      
      for (const field of fieldsToEncrypt) {
        if (user[field]) {
          // Usamos o getDataValue para obter o valor não criptografado
          const originalValue = user.getDataValue(field);
          // Criptografamos o valor
          updates[field] = encrypt(originalValue, user.id.toString());
        }
      }
      
      // Atualiza o usuário diretamente no banco para evitar hooks
      await User.update(updates, {
        where: { id: user.id },
        transaction: t
      });
    }
    
    // 2. Criptografar dados de pagamentos
    console.log('Criptografando dados de pagamentos...');
    const payments = await Payment.findAll({ transaction: t });
    
    for (const payment of payments) {
      const fieldsToEncrypt = [
        'mp_payment_id',
        'mp_preference_id',
        'payment_method'
      ];
      
      const updates = {};
      
      for (const field of fieldsToEncrypt) {
        if (payment[field]) {
          const originalValue = payment.getDataValue(field);
          updates[field] = encrypt(originalValue, payment.id.toString());
        }
      }
      
      await Payment.update(updates, {
        where: { id: payment.id },
        transaction: t
      });
    }
    
    // 3. Criptografar códigos de verificação
    console.log('Criptografando códigos de verificação...');
    const codes = await VerificationCode.findAll({ transaction: t });
    
    for (const code of codes) {
      const fieldsToEncrypt = ['email', 'code', 'user_data'];
      
      const updates = {};
      
      for (const field of fieldsToEncrypt) {
        if (code[field]) {
          const originalValue = code.getDataValue(field);
          updates[field] = encrypt(originalValue, code.id.toString());
        }
      }
      
      await VerificationCode.update(updates, {
        where: { id: code.id },
        transaction: t
      });
    }
    
    // Commit da transação
    await t.commit();
    console.log('Criptografia de dados existentes concluída com sucesso!');
    
  } catch (error) {
    // Rollback em caso de erro
    await t.rollback();
    console.error('Erro ao criptografar dados existentes:', error);
    throw error;
  }
};

// Adiciona um método para executar o script via linha de comando
if (process.argv[1].endsWith('encryptExistingData.js')) {
  encryptExistingData()
    .then(() => {
      console.log('Script de criptografia concluído.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao executar script de criptografia:', error);
      process.exit(1);
    });
}

export default encryptExistingData; 