import { Expense } from '../models/index.js';

console.log('Iniciando limpeza das despesas...');

try {
  await Expense.destroy({ where: {} });
  console.log('Todas as despesas foram removidas com sucesso!');
  process.exit(0);
} catch (error) {
  console.error('Erro ao remover despesas:', error);
  process.exit(1);
} 