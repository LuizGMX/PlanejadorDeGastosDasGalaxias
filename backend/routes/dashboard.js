import { Sequelize } from 'sequelize';
import express from 'express';
import { Expense, Category, SubCategory, Bank, Budget, User } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { month, year, payment_method } = req.query;
    const whereClause = {
      user_id: req.user.id
    };

    // Adiciona filtros de data apenas se não for 'all'
    if (month !== 'all' && year !== 'all') {
      const parsedMonth = parseInt(month) || new Date().getMonth() + 1;
      const parsedYear = parseInt(year) || new Date().getFullYear();

      whereClause.expense_date = {
        [Op.and]: [
          month !== 'all' ? Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('expense_date')), parsedMonth) : {},
          year !== 'all' ? Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('expense_date')), parsedYear) : {}
        ].filter(condition => Object.keys(condition).length > 0)
      };

      // Remove o filtro de data se não houver condições
      if (whereClause.expense_date[Op.and].length === 0) {
        delete whereClause.expense_date;
      }
    }

    if (payment_method) {
      whereClause.payment_method = payment_method;
    }

    const expenses = await Expense.findAll({
      where: whereClause,
      include: [
        { model: Category, as: 'Category' },
        { model: SubCategory, as: 'SubCategory' },
        { model: Bank, as: 'Bank' }
      ],
      order: [['expense_date', 'DESC']]
    });

    // Se não houver despesas, retorna uma mensagem amigável
    if (!expenses || expenses.length === 0) {
      return res.json({
        message: "Você ainda não possui despesas cadastradas neste período!",
        suggestion: "Que tal começar a registrar suas despesas agora?",
        expenses_by_category: [],
        expenses_by_date: [],
        expenses_by_bank: [],
        budget_info: null,
        current_filters: {
          month: month,
          year: year,
          payment_method
        }
      });
    }

    console.log(`Total de despesas encontradas: ${expenses.length}`);
    if (expenses.length > 0) {
      console.log('Primeira despesa:', {
        id: expenses[0].id,
        date: expenses[0].expense_date,
        category: expenses[0].Category.category_name
      });
    }

    // Agrupa despesas por categoria
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const category = expense.Category.category_name;
      const existing = acc.find((item) => item.category_name === category);
      if (existing) {
        existing.total += parseFloat(expense.amount);
      } else {
        acc.push({ category_name: category, total: parseFloat(expense.amount) });
      }
      return acc;
    }, []);

    // Agrupa despesas por data
    const expensesByDate = expenses.reduce((acc, expense) => {
      const date = expense.expense_date.toISOString().split('T')[0];
      const existing = acc.find((item) => item.date === date);
      if (existing) {
        existing.total += parseFloat(expense.amount);
      } else {
        acc.push({ date, total: parseFloat(expense.amount) });
      }
      return acc;
    }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Agrupa despesas por banco
    const expensesByBank = expenses.reduce((acc, expense) => {
      if (!expense.Bank) return acc;
      const bank = expense.Bank.name;
      const existing = acc.find((item) => item.bank_name === bank);
      if (existing) {
        existing.total += parseFloat(expense.amount);
      } else {
        acc.push({ bank_name: bank, total: parseFloat(expense.amount) });
      }
      return acc;
    }, []);

    // Calcula informações de orçamento se mês e ano específicos
    let budgetInfo = null;
    if (month !== 'all' && year !== 'all') {
      const parsedMonth = parseInt(month);
      const parsedYear = parseInt(year);
      const today = new Date();
      const lastDayOfMonth = new Date(parsedYear, parsedMonth, 0).getDate();
      const remainingDays = parsedMonth === today.getMonth() + 1 && parsedYear === today.getFullYear()
        ? lastDayOfMonth - today.getDate()
        : 0;

      const totalSpent = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

      // Busca o orçamento do usuário (você precisará criar esta tabela e relacionamento)
      const budget = await Budget.findOne({
        where: {
          user_id: req.user.id,
          month: parsedMonth,
          year: parsedYear
        }
      });

      // Usa o net_income do usuário como orçamento total se não houver um orçamento específico
      const totalBudget = budget ? budget.amount : req.user.net_income;
      const remainingBudget = totalBudget - totalSpent;
      const suggestedDailySpend = remainingDays > 0 ? remainingBudget / remainingDays : 0;

      budgetInfo = {
        total_budget: totalBudget,
        total_spent: totalSpent,
        remaining_budget: remainingBudget,
        remaining_days: remainingDays,
        suggested_daily_spend: suggestedDailySpend,
        percentage_spent: (totalSpent / totalBudget) * 100
      };
    }

    res.json({ 
      expenses_by_category: expensesByCategory,
      expenses_by_date: expensesByDate,
      expenses_by_bank: expensesByBank,
      budget_info: budgetInfo,
      total_expenses: expenses.length,
      current_filters: {
        month: month,
        year: year,
        payment_method
      },
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        net_income: req.user.net_income
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ message: 'Erro ao buscar dados do dashboard' });
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
