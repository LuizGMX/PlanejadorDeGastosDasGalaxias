import { sequelize } from '../models/index.js';
import { encrypt } from '../utils/encryption.js';

async function encryptExistingData() {
  try {
    console.log('Iniciando criptografia dos dados existentes...');

    // Criptografar dados dos usuários
    const users = await sequelize.models.User.findAll();
    console.log(`Encontrados ${users.length} usuários para criptografar`);
    for (const user of users) {
      await user.update({
        name: user.name,
        email: user.email,
        telegram_chat_id: user.telegram_chat_id,
        telegram_username: user.telegram_username
      });
    }
    console.log('Dados dos usuários criptografados com sucesso');

    // Criptografar dados dos bancos
    const banks = await sequelize.models.Bank.findAll();
    console.log(`Encontrados ${banks.length} bancos para criptografar`);
    for (const bank of banks) {
      await bank.update({
        name: bank.name,
        code: bank.code
      });
    }
    console.log('Dados dos bancos criptografados com sucesso');

    // Criptografar dados das despesas
    const expenses = await sequelize.models.Expense.findAll();
    console.log(`Encontradas ${expenses.length} despesas para criptografar`);
    for (const expense of expenses) {
      await expense.update({
        description: expense.description,
        payment_method: expense.payment_method
      });
    }
    console.log('Dados das despesas criptografados com sucesso');

    // Criptografar dados das receitas
    const incomes = await sequelize.models.Income.findAll();
    console.log(`Encontradas ${incomes.length} receitas para criptografar`);
    for (const income of incomes) {
      await income.update({
        description: income.description
      });
    }
    console.log('Dados das receitas criptografados com sucesso');

    console.log('Criptografia concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro durante a criptografia:', error);
    process.exit(1);
  }
}

encryptExistingData(); 