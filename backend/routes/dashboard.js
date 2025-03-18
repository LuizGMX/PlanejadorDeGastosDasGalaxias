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

    // Calcula informações do objetivo financeiro
    let financialGoalInfo = null;
    if (user.financial_goal_amount && user.financial_goal_date) {
      const today = new Date();
      const goalDate = new Date(user.financial_goal_date);
      const monthsUntilGoal = (goalDate.getFullYear() - today.getFullYear()) * 12 + 
                             (goalDate.getMonth() - today.getMonth());
      
      const monthlyBalance = totalIncomes - totalExpenses;
      const projectedSavings = monthlyBalance * monthsUntilGoal;
      const goalAmount = parseFloat(user.financial_goal_amount);
      const monthlyNeeded = (goalAmount - projectedSavings) / monthsUntilGoal;

      financialGoalInfo = {
        name: user.financial_goal_name,
        amount: goalAmount,
        date: user.financial_goal_date,
        months_remaining: monthsUntilGoal,
        monthly_balance: monthlyBalance,
        projected_savings: projectedSavings,
        monthly_needed: monthlyNeeded,
        is_achievable: monthlyBalance >= monthlyNeeded,
        progress_percentage: (projectedSavings / goalAmount) * 100
      };
    }

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
      financial_goal: financialGoalInfo,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        net_income: netIncome,
        total_income: totalIncomes,
        financial_goal_name: user.financial_goal_name,
        financial_goal_amount: user.financial_goal_amount,
        financial_goal_date: user.financial_goal_date
      }
    };

    res.json(responseData);
  } catch (error) {
    console.error('Erro ao carregar dados do dashboard:', error);
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
    const { months = 3 } = req.query;
    const projectionMonths = parseInt(months);

    // Define o período de projeção: começa no próximo mês
    const startDate = new Date();
    startDate.setUTCMonth(startDate.getUTCMonth() + 1);
    startDate.setUTCDate(1);
    startDate.setUTCHours(0, 0, 0, 0); // Início do dia em UTC

    const endDate = new Date(startDate);
    endDate.setUTCMonth(startDate.getUTCMonth() + projectionMonths - 1);
    // Encontra o último dia do mês
    const lastDay = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0).getUTCDate();
    endDate.setUTCDate(lastDay);
    endDate.setUTCHours(23, 59, 59, 999); // Fim do dia em UTC

    console.log('\n=== INÍCIO DAS QUERIES DO DASHBOARD ===\n');
    console.log('Período de busca:');
    console.log('De:', startDate.toISOString());
    console.log('Até:', endDate.toISOString());
    console.log('\n');

    const [expenses, incomes, user] = await Promise.all([
      Expense.findAll({
        where: {
          user_id: req.user.id,
          expense_date: { 
            [Op.between]: [startDate.toISOString(), endDate.toISOString()] 
          }
        },
        include: [{ model: Category }, { model: Bank }],
        logging: (sql, timing) => {
          console.log('\nQUERY DE DESPESAS:');
          console.log(sql);
          console.log(`Tempo de execução: ${timing}ms\n`);
        }
      }),
      Income.findAll({
        where: {
          user_id: req.user.id,
          date: { 
            [Op.between]: [startDate.toISOString(), endDate.toISOString()] 
          }
        },
        include: [{ model: Category }, { model: Bank }],
        logging: (sql, timing) => {
          console.log('\nQUERY DE GANHOS:');
          console.log(sql);
          console.log(`Tempo de execução: ${timing}ms\n`);
        }
      }),
      User.findByPk(req.user.id, {
        logging: (sql, timing) => {
          console.log('\nQUERY DE USUÁRIO:');
          console.log(sql);
          console.log(`Tempo de execução: ${timing}ms\n`);
        }
      })
    ]);

    console.log('\n=== FIM DAS QUERIES DO DASHBOARD ===\n');

    const monthlyNetIncome = user ? parseFloat(user.net_income || 0) : 0;

    // Ganhos Projetados: net_income * projectionMonths + soma de incomes no período
    const totalFutureIncomes = incomes.reduce((total, income) => {
      return total + parseFloat(income.amount || 0);
    }, 0);
    const totalNetIncome = monthlyNetIncome * projectionMonths;
    const totalProjectedIncomes = totalNetIncome + totalFutureIncomes;

    // Gastos Projetados: soma de todas as expenses no período (sem filtro)
    const totalProjectedExpenses = expenses.reduce((total, expense) => {
      return total + parseFloat(expense.amount || 0);
    }, 0);

    console.log("AIOH", totalProjectedIncomes, totalProjectedExpenses);

    // Saldo Final: Ganhos Projetados - Gastos Projetados
    const finalBalance = totalProjectedIncomes - totalProjectedExpenses;

    const projectionData = [];
    for (let i = 0; i < projectionMonths; i++) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(startDate.getMonth() + i);

      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        return expenseDate.getMonth() === currentDate.getMonth() && 
               expenseDate.getFullYear() === currentDate.getFullYear();
      }).reduce((total, expense) => total + parseFloat(expense.amount || 0), 0);

      const monthIncomes = incomes.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getMonth() === currentDate.getMonth() && 
               incomeDate.getFullYear() === currentDate.getFullYear();
      }).reduce((total, income) => total + parseFloat(income.amount || 0), 0);

      projectionData.push({
        date: currentDate.toISOString().split('T')[0],
        expenses: monthExpenses,
        incomes: monthIncomes + monthlyNetIncome,
        balance: (monthIncomes + monthlyNetIncome) - monthExpenses
      });
    }

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
