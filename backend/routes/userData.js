import express from 'express';
import { sequelize } from '../models/index.js';
import { auditLogMiddleware } from '../middleware/auditLog.js';
import { maskSensitiveData } from '../middleware/dataMasking.js';

const router = express.Router();

// Exportar dados pessoais
router.get('/export', maskSensitiveData, auditLogMiddleware('EXPORT_PERSONAL_DATA'), async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar todos os dados do usuário
    const user = await sequelize.models.User.findByPk(userId);
    const expenses = await sequelize.models.Expense.findAll({ where: { user_id: userId } });
    const incomes = await sequelize.models.Income.findAll({ where: { user_id: userId } });
    const banks = await sequelize.models.Bank.findAll({
      include: [{
        model: sequelize.models.UserBank,
        where: { user_id: userId }
      }]
    });

    // Organizar dados para exportação
    const exportData = {
      user: user.toJSON(),
      expenses: expenses.map(e => e.toJSON()),
      incomes: incomes.map(i => i.toJSON()),
      banks: banks.map(b => b.toJSON())
    };

    res.json(exportData);
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({ error: 'Erro ao exportar dados pessoais' });
  }
});

// Excluir dados pessoais (direito ao esquecimento)
router.delete('/delete', auditLogMiddleware('DELETE_PERSONAL_DATA'), async (req, res) => {
  try {
    const userId = req.user.id;

    // Excluir dados relacionados
    await sequelize.models.Expense.destroy({ where: { user_id: userId } });
    await sequelize.models.Income.destroy({ where: { user_id: userId } });
    await sequelize.models.UserBank.destroy({ where: { user_id: userId } });
    
    // Anonimizar dados do usuário
    await sequelize.models.User.update({
      name: 'Usuário Excluído',
      email: `deleted_${userId}@deleted.com`,
      telegram_chat_id: null,
      telegram_username: null,
      telegram_verified: false
    }, { where: { id: userId } });

    res.json({ message: 'Dados pessoais excluídos com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir dados:', error);
    res.status(500).json({ error: 'Erro ao excluir dados pessoais' });
  }
});

export default router; 