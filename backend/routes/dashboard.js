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
    try {
      if (!item?.Category?.category_name || !item?.amount) {
        return acc;
      }

      const category = item.Category.category_name;
      const amount = parseFloat(item.amount);

      if (!category || isNaN(amount)) {
        return acc;
      }

      const existing = acc.find(i => i.category_name === category);
      if (existing) {
        existing.total += amount;
      } else {
        acc.push({ 
          category_name: category,
          total: amount 
        });
      }

      return acc;
    } catch (error) {
      console.error('Erro ao processar item:', error);
      return acc;
    }
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
const calculateBudgetInfo = (totalBudget, totalExpenses) => {
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

    const [expenses, incomes] = await Promise.all([
      Expense.findAll({
        where: whereExpenses,
        include: [
          { 
            model: Category, 
            where: { type: 'expense' },
            attributes: ['category_name', 'type']
          },
          { model: SubCategory },
          { model: Bank }
        ],
        order: [['expense_date', 'ASC']],
        logging: (sql) => {
          console.log('Query de despesas:', sql);
        }
      }),
      Income.findAll({
        where: whereIncomes,
        include: [
          { 
            model: Category, 
            where: { type: 'income' },
            attributes: ['category_name', 'type']
          },
          { model: SubCategory },
          { model: Bank }
        ],
        order: [['date', 'ASC']],
        logging: (sql) => {
          console.log('Query de ganhos:', sql);
        }
      })
    ]);

    console.log('Despesas encontradas:', expenses.length);
    console.log('Ganhos encontrados:', incomes.length);

    const expensesByCategory = groupByCategory(expenses);
    const incomesByCategory = groupByCategory(incomes);

    console.log('Despesas por categoria:', expensesByCategory);
    console.log('Ganhos por categoria:', incomesByCategory);

    const totalIncomes = calculateTotals(incomes);
    const totalExpenses = calculateTotals(expenses);
    const totalBudget = totalIncomes;

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
      const monthlyNeeded = (goalAmount) / monthsUntilGoal;

      financialGoalInfo = {
        name: user.financial_goal_name,
        amount: goalAmount,
        date: user.financial_goal_date,
        months_remaining: monthsUntilGoal,
        monthly_balance: monthlyBalance,
        projected_savings: projectedSavings,
        monthly_needed: monthlyNeeded,        
        progress_percentage: (projectedSavings / goalAmount) * 100
      };
    }

    const responseData = {
      expenses_by_category: expensesByCategory,
      incomes_by_category: incomesByCategory,
      expenses_by_date: groupByDate(expenses, 'expense_date'),
      incomes_by_date: groupByDate(incomes, 'date'),
      expenses_by_bank: groupByBank(expenses),
      incomes_by_bank: groupByBank(incomes),
      budget_info: calculateBudgetInfo(totalBudget, totalExpenses),
      total_expenses: totalExpenses,
      total_incomes: totalIncomes,
      financial_goal: financialGoalInfo,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        total_income: totalIncomes,
        financial_goal_name: user.financial_goal_name,
        financial_goal_amount: user.financial_goal_amount,
        financial_goal_date: user.financial_goal_date
      }
    };

    res.json(responseData);
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ message: 'Erro ao buscar dados do dashboard' });
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

    // Ganhos Projetados: soma de incomes no período
    const totalFutureIncomes = incomes.reduce((total, income) => {
      return total + parseFloat(income.amount || 0);
    }, 0);
    const totalProjectedIncomes = totalFutureIncomes;

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
        incomes: monthIncomes,
        balance: monthIncomes - monthExpenses
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

router.get('/summary', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Busca todas as despesas do mês atual
    const expenses = await Expense.findAll({
      where: {
        user_id: user.id,
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Busca todas as receitas do mês atual
    const incomes = await Income.findAll({
      where: {
        user_id: user.id,
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Calcula totais
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalIncomes = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    const balance = totalIncomes - totalExpenses;

    // Calcula percentuais por categoria
    const expensesByCategory = {};
    expenses.forEach(expense => {
      if (!expensesByCategory[expense.category]) {
        expensesByCategory[expense.category] = 0;
      }
      expensesByCategory[expense.category] += parseFloat(expense.amount);
    });

    // Converte para array e calcula percentuais
    const expensePercentages = Object.entries(expensesByCategory).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalExpenses * 100).toFixed(2)
    }));

    // Retorna os dados
    res.json({
      totalExpenses,
      totalIncomes,
      balance,
      expensePercentages
    });

  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ message: 'Erro ao buscar resumo' });
  }
});

router.get('/trend', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    // Busca todas as despesas do período
    const expenses = await Expense.findAll({
      where: {
        user_id: user.id,
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Busca todas as receitas do período
    const incomes = await Income.findAll({
      where: {
        user_id: user.id,
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Organiza os dados por mês
    const monthlyData = {};
    const months = [];
    
    // Inicializa os meses
    for (let i = -1; i <= 1; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthKey = date.toISOString().substring(0, 7);
      months.push(monthKey);
      monthlyData[monthKey] = {
        expenses: 0,
        incomes: 0
      };
    }

    // Soma despesas por mês
    expenses.forEach(expense => {
      const monthKey = expense.date.toISOString().substring(0, 7);
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].expenses += parseFloat(expense.amount);
      }
    });

    // Soma receitas por mês
    incomes.forEach(income => {
      const monthKey = income.date.toISOString().substring(0, 7);
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].incomes += parseFloat(income.amount);
      }
    });

    // Calcula saldos e formata dados para resposta
    const trend = months.map(month => {
      const balance = monthlyData[month].incomes - monthlyData[month].expenses;
      return {
        month,
        expenses: monthlyData[month].expenses,
        incomes: monthlyData[month].incomes,
        balance
      };
    });

    res.json(trend);

  } catch (error) {
    console.error('Erro ao buscar tendência:', error);
    res.status(500).json({ message: 'Erro ao buscar tendência' });
  }
});

router.get('/projection', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);

    // Busca todas as despesas futuras
    const expenses = await Expense.findAll({
      where: {
        user_id: user.id,
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Busca todas as receitas futuras
    const incomes = await Income.findAll({
      where: {
        user_id: user.id,
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    // Calcula totais projetados
    const projectedExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const projectedIncomes = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    const projectedBalance = projectedIncomes - projectedExpenses;

    res.json({
      projectedExpenses,
      projectedIncomes,
      projectedBalance
    });

  } catch (error) {
    console.error('Erro ao buscar projeção:', error);
    res.status(500).json({ message: 'Erro ao buscar projeção' });
  }
});

export default router;
