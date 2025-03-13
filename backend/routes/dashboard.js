import { Sequelize } from 'sequelize';
import express from 'express';
import { Expense, Income, Category, SubCategory, Bank, Budget, User } from '../models/index.js';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Função auxiliar para construir condições de data
const buildDateConditions = (months, years, dateField = 'expense_date') => {
  if (!months?.length && !years?.length) return {};

  const conditions = { [Op.or]: [] };

  if (months?.length > 0 && years?.length > 0) {
    years.forEach(year => {
      conditions[Op.or].push({
        [Op.and]: [
          Sequelize.where(Sequelize.fn('YEAR', Sequelize.col(dateField)), year),
          {
            [Op.or]: months.map(month => 
              Sequelize.where(Sequelize.fn('MONTH', Sequelize.col(dateField)), month)
            )
          }
        ]
      });
    });
  }

  return conditions;
};

// Função auxiliar para calcular totais
const calculateTotals = (items) => {
  return items.reduce((sum, item) => {
    const parsedAmount = parseFloat(item.amount);
    return sum + (isNaN(parsedAmount) ? 0 : parsedAmount);
  }, 0);
};

// Função auxiliar para agrupar por categoria
const groupByCategory = (items) => {
  return items.reduce((acc, item) => {
    const category = item.Category.category_name;
    const existing = acc.find(i => i.category_name === category);
    if (existing) {
      existing.total += parseFloat(item.amount);
    } else {
      acc.push({ category_name: category, total: parseFloat(item.amount) });
    }
    return acc;
  }, []);
};

// Função auxiliar para agrupar por data
const groupByDate = (items, dateField) => {
  return items.reduce((acc, item) => {
    const date = item[dateField].toISOString().split('T')[0];
    const existing = acc.find(i => i.date === date);
    if (existing) {
      existing.total += parseFloat(item.amount);
    } else {
      acc.push({ date, total: parseFloat(item.amount) });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Função auxiliar para agrupar por banco
const groupByBank = (items) => {
  return items.reduce((acc, item) => {
    if (!item.Bank) return acc;
    const bank = item.Bank.name;
    const existing = acc.find(i => i.bank_name === bank);
    if (existing) {
      existing.total += parseFloat(item.amount);
    } else {
      acc.push({ bank_name: bank, total: parseFloat(item.amount) });
    }
    return acc;
  }, []);
};

// Função auxiliar para calcular informações do orçamento
const calculateBudgetInfo = (totalBudget, totalExpenses, netIncome) => {
  const balance = totalBudget - totalExpenses;
  const percentageSpent = ((totalExpenses / (totalBudget || 1)) * 100);
  const remainingDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();

  return {
    total_budget: totalBudget,
    total_spent: totalExpenses,
    balance,
    percentage_spent: percentageSpent,
    remaining_days: remainingDays,
    suggested_daily_spend: remainingDays > 0 ? balance / remainingDays : 0
  };
};

router.get('/', authenticate, async (req, res) => {
  try {
    const { months, years } = req.query;
    const whereExpenses = {
      user_id: req.user.id,
      ...buildDateConditions(months, years, 'expense_date')
    };
    const whereIncomes = {
      user_id: req.user.id,
      ...buildDateConditions(months, years, 'date')
    };

    const user = await User.findByPk(req.user.id);
    const netIncome = user ? parseFloat(user.net_income || 0) : 0;

    const [expenses, incomes] = await Promise.all([
      Expense.findAll({
        where: whereExpenses,
        include: [
          { model: Category, where: { type: 'expense' } },
          { model: SubCategory },
          { model: Bank }
        ],
        order: [['expense_date', 'ASC']]
      }),
      Income.findAll({
        where: whereIncomes,
        include: [
          { model: Category, where: { type: 'income' } },
          { model: SubCategory },
          { model: Bank }
        ],
        order: [['date', 'ASC']]
      })
    ]);

    const totalIncomes = calculateTotals(incomes);
    const totalExpenses = calculateTotals(expenses);
    const totalBudget = totalIncomes + netIncome;

    const responseData = {
      expenses_by_category: groupByCategory(expenses),
      incomes_by_category: groupByCategory(incomes),
      expenses_by_date: groupByDate(expenses, 'expense_date'),
      incomes_by_date: groupByDate(incomes, 'date'),
      expenses_by_bank: groupByBank(expenses),
      incomes_by_bank: groupByBank(incomes),
      budget_info: calculateBudgetInfo(totalBudget, totalExpenses, netIncome),
      total_expenses: totalExpenses,
      total_incomes: totalIncomes,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        net_income: netIncome,
        total_income: totalIncomes
      }
    };

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar dados do dashboard' });
  }
});

router.get('/category-summary', async (req, res) => {
  const { start_date, end_date, type } = req.query;
  try {
    const Model = type === 'income' ? Income : Expense;
    const dateField = type === 'income' ? 'income_date' : 'expense_date';

    const summary = await Model.findAll({
      where: {
        user_id: req.user.id,
        [dateField]: { [Sequelize.Op.between]: [start_date, end_date] },
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
        message: `Não há ${type === 'income' ? 'ganhos' : 'despesas'} registrados para este período.`,
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
  const { period, type } = req.query; // 'month' ou 'year'
  try {
    const Model = type === 'income' ? Income : Expense;
    const dateField = type === 'income' ? 'income_date' : 'expense_date';
    const groupBy = period === 'month' ? 'MONTH' : 'YEAR';

    const summary = await Model.findAll({
      where: { user_id: req.user.id },
      attributes: [
        [Sequelize.fn(groupBy, Sequelize.col(dateField)), 'period'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'],
      ],
      group: ['period'],
      order: [['period', 'ASC']],
    });

    if (!summary || summary.length === 0) {
      return res.json({
        message: `Não há ${type === 'income' ? 'ganhos' : 'despesas'} registrados para este período.`,
        data: []
      });
    }

    res.json({ data: summary });
  } catch (error) {
    console.error('Erro ao buscar resumo por período:', error);
    res.status(500).json({ message: 'Erro ao buscar resumo por período' });
  }
});

router.get('/bank-balance-trend', authenticate, async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const projectionMonths = parseInt(months);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + projectionMonths);

    const [recurringExpenses, recurringIncomes, user] = await Promise.all([
      Expense.findAll({
        where: {
          user_id: req.user.id,
          is_recurring: true,
          end_date: { [Op.gte]: startDate }
        },
        include: [{ model: Category }, { model: Bank }]
      }),
      Income.findAll({
        where: {
          user_id: req.user.id,
          is_recurring: true,
          end_date: { [Op.gte]: startDate }
        },
        include: [{ model: Category }, { model: Bank }]
      }),
      User.findByPk(req.user.id)
    ]);

    const monthlyNetIncome = user ? parseFloat(user.net_income || 0) : 0;
    const projectionData = [];
    let currentBalance = 0;

    for (let i = 0; i <= projectionMonths; i++) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(currentDate.getMonth() + i);

      const monthlyExpenses = recurringExpenses.reduce((total, expense) => {
        if (!expense.end_date) return total;
        return currentDate <= new Date(expense.end_date) 
          ? total + parseFloat(expense.amount || 0)
          : total;
      }, 0);

      const monthlyIncomes = recurringIncomes.reduce((total, income) => {
        if (!income.end_date) return total;
        return currentDate <= new Date(income.end_date)
          ? total + parseFloat(income.amount || 0)
          : total;
      }, 0);

      const monthlyBalance = monthlyIncomes + monthlyNetIncome - monthlyExpenses;
      currentBalance += monthlyBalance;

      projectionData.push({
        date: currentDate.toISOString().split('T')[0],
        balance: Number(currentBalance.toFixed(2)),
        expenses: Number(monthlyExpenses.toFixed(2)),
        incomes: Number((monthlyIncomes + monthlyNetIncome).toFixed(2))
      });
    }

    const summary = {
      totalProjectedExpenses: Number(projectionData.reduce((sum, month) => sum + month.expenses, 0).toFixed(2)),
      totalProjectedIncomes: Number(projectionData.reduce((sum, month) => sum + month.incomes, 0).toFixed(2)),
      finalBalance: Number(currentBalance.toFixed(2))
    };

    res.json({ projectionData, summary });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao calcular tendência de saldo' });
  }
});

export default router;
