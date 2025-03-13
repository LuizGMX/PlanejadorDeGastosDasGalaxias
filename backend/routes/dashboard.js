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
  } else if (months?.length > 0) {
    conditions[Op.or] = months.map(month => 
      Sequelize.where(Sequelize.fn('MONTH', Sequelize.col(dateField)), month)
    );
  } else if (years?.length > 0) {
    conditions[Op.or] = years.map(year => 
      Sequelize.where(Sequelize.fn('YEAR', Sequelize.col(dateField)), year)
    );
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

    const [recurringExpenses, recurringIncomes, nonRecurringExpenses, nonRecurringIncomes, user] = await Promise.all([
      // Busca despesas recorrentes
      Expense.findAll({
        where: {
          user_id: req.user.id,
          is_recurring: true,
          start_date: { [Op.lte]: endDate },
          [Op.or]: [
            { end_date: { [Op.gte]: startDate } },
            { end_date: null }
          ]
        },
        include: [{ model: Category }, { model: Bank }]
      }),
      // Busca receitas recorrentes
      Income.findAll({
        where: {
          user_id: req.user.id,
          is_recurring: true,
          start_date: { [Op.lte]: endDate },
          [Op.or]: [
            { end_date: { [Op.gte]: startDate } },
            { end_date: null }
          ]
        },
        include: [{ model: Category }, { model: Bank }]
      }),
      // Busca despesas não recorrentes
      Expense.findAll({
        where: {
          user_id: req.user.id,
          is_recurring: false,
          expense_date: { [Op.between]: [startDate, endDate] }
        },
        include: [{ model: Category }, { model: Bank }]
      }),
      // Busca receitas não recorrentes
      Income.findAll({
        where: {
          user_id: req.user.id,
          is_recurring: false,
          date: { [Op.between]: [startDate, endDate] }
        },
        include: [{ model: Category }, { model: Bank }]
      }),
      User.findByPk(req.user.id)
    ]);

    const monthlyNetIncome = user ? parseFloat(user.net_income || 0) : 0;
    const projectionData = [];
    let currentBalance = 0;

    for (let i = 0; i < projectionMonths; i++) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(currentDate.getMonth() + i + 1);
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Calcula despesas recorrentes do mês
      const monthlyRecurringExpenses = recurringExpenses.reduce((total, expense) => {
        const expenseStartDate = new Date(expense.start_date);
        const expenseEndDate = expense.end_date ? new Date(expense.end_date) : null;
        
        const isActive = currentDate >= expenseStartDate && 
                        (!expenseEndDate || currentDate <= expenseEndDate);
        
        if (isActive) {
          return total + parseFloat(expense.amount || 0);
        }
        return total;
      }, 0);

      // Calcula receitas recorrentes do mês
      const monthlyRecurringIncomes = recurringIncomes.reduce((total, income) => {
        const incomeStartDate = new Date(income.start_date);
        const incomeEndDate = income.end_date ? new Date(income.end_date) : null;
        
        const isActive = currentDate >= incomeStartDate && 
                        (!incomeEndDate || currentDate <= incomeEndDate);
        
        if (isActive) {
          return total + parseFloat(income.amount || 0);
        }
        return total;
      }, 0);

      // Calcula despesas não recorrentes do mês
      const monthlyNonRecurringExpenses = nonRecurringExpenses.reduce((total, expense) => {
        const expenseDate = new Date(expense.expense_date);
        if (expenseDate >= currentMonthStart && expenseDate <= currentMonthEnd) {
          return total + parseFloat(expense.amount || 0);
        }
        return total;
      }, 0);

      // Calcula receitas não recorrentes do mês
      const monthlyNonRecurringIncomes = nonRecurringIncomes.reduce((total, income) => {
        const incomeDate = new Date(income.date);
        if (incomeDate >= currentMonthStart && incomeDate <= currentMonthEnd) {
          return total + parseFloat(income.amount || 0);
        }
        return total;
      }, 0);

      // Calcula totais do mês
      const monthlyTotalExpenses = monthlyRecurringExpenses + monthlyNonRecurringExpenses;
      const monthlyTotalIncomes = monthlyRecurringIncomes + monthlyNonRecurringIncomes + monthlyNetIncome;
      const monthlyBalance = monthlyTotalIncomes - monthlyTotalExpenses;
      currentBalance += monthlyBalance;

      projectionData.push({
        date: currentDate.toISOString().split('T')[0],
        balance: currentBalance,
        expenses: monthlyTotalExpenses,
        incomes: monthlyTotalIncomes
      });
    }

    // Calcula os totais projetados
    const totalProjectedExpenses = projectionData.reduce((total, data) => total + data.expenses, 0);
    const totalProjectedIncomes = projectionData.reduce((total, data) => total + data.incomes, 0);
    const finalBalance = totalProjectedIncomes - totalProjectedExpenses;

    console.log('Dados de Projeção:', {
      recurringExpenses: recurringExpenses.map(e => ({
        description: e.description,
        amount: e.amount,
        start_date: e.start_date,
        end_date: e.end_date
      })),
      nonRecurringExpenses: nonRecurringExpenses.map(e => ({
        description: e.description,
        amount: e.amount,
        expense_date: e.expense_date
      })),
      projectionData,
      summary: {
        totalProjectedExpenses,
        totalProjectedIncomes,
        finalBalance
      }
    });

    res.json({
      projectionData,
      summary: {
        totalProjectedExpenses,
        totalProjectedIncomes,
        finalBalance
      }
    });
  } catch (error) {
    console.error('Erro ao calcular tendência de saldo:', error);
    res.status(500).json({ message: 'Erro ao calcular tendência de saldo' });
  }
});

export default router;
