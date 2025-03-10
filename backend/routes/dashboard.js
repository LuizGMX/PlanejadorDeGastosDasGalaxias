import { Sequelize } from 'sequelize';
import express from 'express';
import { Expense, Category, SubCategory, Bank, Budget, User } from '../models/index.js';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { months, years } = req.query;
    const where = { user_id: req.user.id };

    // Construindo a condição para múltiplos meses e anos
    if (months?.length > 0 && years?.length > 0) {
      where[Op.or] = years.map(year => ({
        [Op.and]: [
          Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('expense_date')), year),
          {
            [Op.or]: months.map(month => 
              Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('expense_date')), month)
            )
          }
        ]
      }));
    }

    const expenses = await Expense.findAll({
      where,
      include: [
        { model: Category },
        { model: SubCategory },
        { model: Bank }
      ],
      order: [['expense_date', 'ASC']]
    });

    // Processamento dos dados para o dashboard
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const category = expense.Category.category_name;
      const existing = acc.find(item => item.category_name === category);
      if (existing) {
        existing.total += parseFloat(expense.amount);
      } else {
        acc.push({ category_name: category, total: parseFloat(expense.amount) });
      }
      return acc;
    }, []);

    const expensesByDate = expenses.reduce((acc, expense) => {
      const date = expense.expense_date.toISOString().split('T')[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.total += parseFloat(expense.amount);
      } else {
        acc.push({ date, total: parseFloat(expense.amount) });
      }
      return acc;
    }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

    const expensesByBank = expenses.reduce((acc, expense) => {
      if (!expense.Bank) return acc;
      const bank = expense.Bank.name;
      const existing = acc.find(item => item.bank_name === bank);
      if (existing) {
        existing.total += parseFloat(expense.amount);
      } else {
        acc.push({ bank_name: bank, total: parseFloat(expense.amount) });
      }
      return acc;
    }, []);

    // Calculando informações de orçamento
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const netIncome = req.user.net_income || 0;
    const budget_info = {
      total_budget: netIncome,
      total_spent: totalExpenses,
      remaining_budget: netIncome - totalExpenses,
      percentage_spent: ((totalExpenses / (netIncome || 1)) * 100),
      remaining_days: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()
    };

    if (budget_info.remaining_days > 0) {
      budget_info.suggested_daily_spend = budget_info.remaining_budget / budget_info.remaining_days;
    }

    res.json({
      expenses_by_category: expensesByCategory,
      expenses_by_date: expensesByDate,
      expenses_by_bank: expensesByBank,
      budget_info,
      total_expenses: expenses.length,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        net_income: req.user.net_income
      }
    });
  } catch (error) {
    console.error('Erro ao carregar dados do dashboard:', error);
    res.status(500).json({ message: 'Erro ao carregar dados do dashboard' });
  }
});
  
router.get('/category-summary', async (req, res) => {
  const { start_date, end_date } = req.query;
  try {
    const summary = await Expense.findAll({
      where: {
        user_id: req.user.id,
        expense_date: { [Sequelize.Op.between]: [start_date, end_date] },
      },
      attributes: [
        'category_id',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'],
      ],
      group: ['category_id'],
      include: [{ model: Category, attributes: ['category_name'] }],
    });

    if (!summary || summary.length === 0) {
      return res.json({
        message: "Não há despesas registradas para este período.",
        data: []
      });
    }

    res.json({ data: summary });
  } catch (error) {
    console.error('Erro ao buscar resumo por categoria:', error);
    res.status(500).json({ message: 'Erro ao buscar resumo por categoria' });
  }
});

router.get('/period-summary', async (req, res) => {
  const { period } = req.query; // 'month' ou 'year'
  try {
    const groupBy = period === 'month' ? 'MONTH' : 'YEAR';
    const summary = await Expense.findAll({
      where: { user_id: req.user.id },
      attributes: [
        [Sequelize.fn(groupBy, Sequelize.col('expense_date')), 'period'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'],
      ],
      group: ['period'],
      order: [['period', 'ASC']],
    });

    if (!summary || summary.length === 0) {
      return res.json({
        message: "Não há despesas registradas para este período.",
        data: []
      });
    }

    res.json({ data: summary });
  } catch (error) {
    console.error('Erro ao buscar resumo por período:', error);
    res.status(500).json({ message: 'Erro ao buscar resumo por período' });
  }
});

router.get('/available-periods', async (req, res) => {
  try {
    // Busca anos disponíveis
    const years = await Expense.findAll({
      where: { user_id: req.user.id },
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.fn('YEAR', Sequelize.col('expense_date'))), 'year']
      ],
      order: [[Sequelize.fn('YEAR', Sequelize.col('expense_date')), 'DESC']]
    });

    if (!years || years.length === 0) {
      return res.json({
        message: "Você ainda não possui despesas cadastradas.",
        years: [],
        months: []
      });
    }

    // Se um ano específico foi fornecido, busca os meses disponíveis para aquele ano
    const { year } = req.query;
    let months = [];
    
    if (year) {
      months = await Expense.findAll({
        where: {
          user_id: req.user.id,
          expense_date: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('expense_date')), year)
        },
        attributes: [
          [Sequelize.fn('DISTINCT', Sequelize.fn('MONTH', Sequelize.col('expense_date'))), 'month']
        ],
        order: [[Sequelize.fn('MONTH', Sequelize.col('expense_date')), 'ASC']]
      });
    }

    res.json({
      years: years.map(y => y.getDataValue('year')),
      months: months.map(m => m.getDataValue('month'))
    });
  } catch (error) {
    console.error('Erro ao buscar períodos disponíveis:', error);
    res.status(500).json({ message: 'Erro ao buscar períodos disponíveis' });
  }
});

export default router;
