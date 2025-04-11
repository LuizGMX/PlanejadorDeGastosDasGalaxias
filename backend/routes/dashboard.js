import { Sequelize } from 'sequelize';
import express from 'express';
import { 
  Expense, 
  Income, 
  Category, 
  Bank, 
  Budget, 
  User,
  RecurrenceRule,
  RecurrenceException 
} from '../models/index.js';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { calculateOccurrences } from '../utils/recurrenceCalculator.js';

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
  const groupedData = items.reduce((acc, item) => {
    const date = new Date(item[dateField]);
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    lastDayOfMonth.setHours(23, 59, 59, 999);
    const monthKey = lastDayOfMonth.toISOString().split('T')[0];
    
    if (!acc[monthKey]) {
      acc[monthKey] = 0;
    }
    acc[monthKey] += parseFloat(item.amount || 0);
    return acc;
  }, {});

  // Ordena as chaves (datas) antes de converter para array
  const sortedKeys = Object.keys(groupedData).sort((a, b) => new Date(a) - new Date(b));
  
  return sortedKeys.map(date => ({
    date,
    total: groupedData[date]
  }));
};

// Função auxiliar para agrupar por banco
const groupByBank = (items) => {
  return items.reduce((acc, item) => {
    if (!item.bank) return acc;
    const bank = item.bank.name;
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
  // Garantir que os valores são números
  totalBudget = parseFloat(totalBudget) || 0;
  totalExpenses = parseFloat(totalExpenses) || 0;
  
  const balance = totalBudget - totalExpenses;
  const percentageSpent = ((totalExpenses / (totalBudget || 1)) * 100);
  const remainingDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();

  return {
    total_budget: totalBudget,
    total_spent: totalExpenses,
    balance,
    percentage_spent: percentageSpent,
    remaining_days: remainingDays,
    suggested_daily_spend: remainingDays > 0 ? balance / remainingDays : 0,
    remaining_budget: balance // Adicionar explicitamente para compatibilidade
  };
};

// Função auxiliar para calcular meses entre datas
function monthsBetweenDates(startDate, endDate) {
  return (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
         (endDate.getMonth() - startDate.getMonth());
}

router.get('/', authenticate, async (req, res) => {
  try {
    console.log('\n=== INÍCIO DA REQUISIÇÃO DO DASHBOARD ===');
    console.log('Query params:', req.query);
    
    const user = await User.findByPk(req.user.id);
    const { months, years, categories, banks } = req.query;

    // Converte os parâmetros para arrays
    const selectedMonths = Array.isArray(months) ? months.map(Number) : [];
    const selectedYears = Array.isArray(years) ? years.map(Number) : [];
    const selectedCategories = Array.isArray(categories) ? categories : [];
    const selectedBanks = Array.isArray(banks) ? banks : [];

    console.log('Meses selecionados:', selectedMonths);
    console.log('Anos selecionados:', selectedYears);
    console.log('Categorias selecionadas:', selectedCategories);
    console.log('Bancos selecionados:', selectedBanks);

    // Define o período baseado nos filtros
    let startDate, endDate;
    
    if (selectedYears.length > 0 && selectedMonths.length > 0) {
      // Pega o menor ano e mês para a data inicial
      const minYear = Math.min(...selectedYears);
      const minMonth = Math.min(...selectedMonths) - 1; // Mês em JavaScript é 0-based
      startDate = new Date(minYear, minMonth, 1);

      // Pega o maior ano e mês para a data final
      const maxYear = Math.max(...selectedYears);
      const maxMonth = Math.max(...selectedMonths) - 1;
      endDate = new Date(maxYear, maxMonth + 1, 0); // Último dia do mês
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Se não houver filtros, usa o mês atual
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    console.log('Período de busca:');
    console.log('De:', startDate);
    console.log('Até:', endDate);

    // Busca todas as regras de recorrência do usuário
    console.log('Buscando regras de recorrência para o usuário:', req.user.id);
    let recurrenceRules;
    try {
      recurrenceRules = await RecurrenceRule.findAll({
        where: {
          user_id: req.user.id,
          [Op.or]: [
            { end_date: null },
            { end_date: { [Op.gte]: startDate } }
          ],
          start_date: { [Op.lte]: endDate }
        },
        include: [
          { 
            model: Category,
            as: 'Category',
            attributes: ['id', 'category_name']
          },
          { 
            model: Bank,
            as: 'bank',
            attributes: ['id', 'name']
          }
        ]
      });
      console.log('Regras de recorrência encontradas:', recurrenceRules.length);
    } catch (error) {
      console.error('Erro detalhado ao buscar regras de recorrência:', error);
      console.error('Erro SQL (se disponível):', error.sql);
      console.error('Stack trace:', error.stack);
      throw new Error(`Falha ao buscar regras de recorrência: ${error.message}`);
    }

    // Busca todas as exceções do usuário para o período
    console.log('Buscando exceções de recorrência para o período');
    let recurrenceExceptions;
    try {
      recurrenceExceptions = await RecurrenceException.findAll({
        where: {
          exception_date: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [
          {
            model: RecurrenceRule,
            as: 'RecurrenceRule',
            where: {
              user_id: req.user.id
            },
            include: [
              { 
                model: Category,
                as: 'Category',
                attributes: ['id', 'category_name']
              },
              { 
                model: Bank,
                as: 'bank',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      });
      console.log('Exceções encontradas:', recurrenceExceptions.length);
    } catch (error) {
      console.error('Erro detalhado ao buscar exceções:', error);
      console.error('Erro SQL (se disponível):', error.sql);
      console.error('Stack trace:', error.stack);
      throw new Error(`Falha ao buscar exceções de recorrência: ${error.message}`);
    }

    console.log('Calculando ocorrências para regras de recorrência');
    // Calcula todas as ocorrências para cada regra
    const recurrenceOccurrences = recurrenceRules.flatMap(rule =>
      calculateOccurrences(rule, startDate, endDate, recurrenceExceptions)
    );

    // Separa as ocorrências em despesas e receitas
    const recurrentExpenses = recurrenceOccurrences
      .filter(occ => occ.rule.type === 'expense')
      .map(occ => ({
        id: `rec_${occ.rule.id}_${occ.date.getTime()}`,
        amount: occ.amount,
        description: occ.description,
        date: occ.date,
        category_id: occ.rule.category_id,
        bank_id: occ.rule.bank_id,
        is_recurring: true,
        recurrence_id: occ.rule.id,
        Category: occ.rule.Category,
        bank: occ.rule.bank
      }));

    const recurrentIncomes = recurrenceOccurrences
      .filter(occ => occ.rule.type === 'income')
      .map(occ => ({
        id: `rec_${occ.rule.id}_${occ.date.getTime()}`,
        amount: occ.amount,
        description: occ.description,
        date: occ.date,
        category_id: occ.rule.category_id,
        bank_id: occ.rule.bank_id,
        is_recurring: true,
        recurrence_id: occ.rule.id,
        Category: occ.rule.Category,
        bank: occ.rule.bank
      }));

    // Busca despesas e receitas normais
    const [expenses, incomes] = await Promise.all([
      Expense.findAll({
        where: {
          user_id: req.user.id,
          expense_date: {
            [Op.between]: [startDate, endDate]
          },
          recurrence_id: null, // Apenas as não recorrentes
          ...(selectedCategories.length > 0 && {
            category_id: {
              [Op.in]: selectedCategories
            }
          }),
          ...(selectedBanks.length > 0 && {
            bank_id: {
              [Op.in]: selectedBanks
            }
          })
        },
        include: [
          { model: Category, as: 'Category' },
          { model: Bank, as: 'bank' }
        ]
      }),
      Income.findAll({
        where: {
          user_id: req.user.id,
          date: {
            [Op.between]: [startDate, endDate]
          },
          recurrence_id: null, // Apenas as não recorrentes
          ...(selectedCategories.length > 0 && {
            category_id: {
              [Op.in]: selectedCategories
            }
          }),
          ...(selectedBanks.length > 0 && {
            bank_id: {
              [Op.in]: selectedBanks
            }
          })
        },
        include: [
          { 
            model: Category, 
            as: 'Category',
            attributes: ['id', 'name', 'color', 'description'] 
          },
          { 
            model: Bank, 
            as: 'bank',
            attributes: ['id', 'name', 'icon', 'color'] 
          }
        ]
      })
    ]).catch(error => {
      console.error('Erro ao buscar despesas e receitas:', error);
      throw error;
    });

    // Combina as despesas e receitas normais com as recorrentes
    const allExpenses = [...expenses, ...recurrentExpenses];
    const allIncomes = [...incomes, ...recurrentIncomes];

    // Calcula totais gerais
    const totalExpensesWithRecurrences = allExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalIncomesWithRecurrences = allIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    const balance = totalIncomesWithRecurrences - totalExpensesWithRecurrences;

    // Calcula informações por categoria e banco (apenas para itens não recorrentes)
    const expensesByCategory = groupByCategory(expenses);
    const incomesByCategory = groupByCategory(incomes);
    const expensesByBank = groupByBank(expenses);
    const incomesByBank = groupByBank(incomes);

    // Calcula totais apenas dos itens não recorrentes para o orçamento
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalIncomes = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);

    // Calcula informações do objetivo financeiro
    let financialGoalInfo = null;
    if (user.financial_goal_amount && user.financial_goal_end_date) {
      const today = new Date();
      const goalDate = new Date(user.financial_goal_end_date);
      const monthsUntilGoal = (goalDate.getFullYear() - today.getFullYear()) * 12 + 
                             (goalDate.getMonth() - today.getMonth());

      console.log('\n=== DEBUG OBJETIVO FINANCEIRO ===');
      console.log('Data Atual:', today);
      console.log('Data Objetivo:', goalDate);
      console.log('Meses até o objetivo:', monthsUntilGoal);

      // Busca todas as receitas e despesas dos últimos 6 meses para calcular a média
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Buscar dados do mês atual para obter economia atual
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      console.log('Buscando dados desde:', sixMonthsAgo);
      console.log('Mês atual começa em:', currentMonthStart);

      const [historicExpenses, historicIncomes, currentMonthExpenses, currentMonthIncomes] = await Promise.all([
        Expense.findAll({
          where: {
            user_id: req.user.id,
            expense_date: {
              [Op.gte]: sixMonthsAgo,
              [Op.lt]: currentMonthStart // Exclui o mês atual
            }
          }
        }),
        Income.findAll({
          where: {
            user_id: req.user.id,
            date: {
              [Op.gte]: sixMonthsAgo,
              [Op.lt]: currentMonthStart // Exclui o mês atual
            }
          }
        }),
        Expense.findAll({
          where: {
            user_id: req.user.id,
            expense_date: {
              [Op.gte]: currentMonthStart,
              [Op.lte]: today
            }
          }
        }),
        Income.findAll({
          where: {
            user_id: req.user.id,
            date: {
              [Op.gte]: currentMonthStart,
              [Op.lte]: today
            }
          }
        })
      ]);

      console.log('Quantidade de despesas históricas encontradas:', historicExpenses.length);
      console.log('Quantidade de receitas históricas encontradas:', historicIncomes.length);
      console.log('Quantidade de despesas do mês atual encontradas:', currentMonthExpenses.length);
      console.log('Quantidade de receitas do mês atual encontradas:', currentMonthIncomes.length);

      // Calcula totais dos últimos 6 meses (excluindo o mês atual)
      const totalHistoricIncomes = historicIncomes.reduce((total, income) => {
        const amount = parseFloat(income.amount || 0);
        return total + amount;
      }, 0);

      const totalHistoricExpenses = historicExpenses.reduce((total, expense) => {
        const amount = parseFloat(expense.amount || 0);
        return total + amount;
      }, 0);

      // Calcula totais do mês atual
      const totalCurrentMonthIncomes = currentMonthIncomes.reduce((total, income) => {
        const amount = parseFloat(income.amount || 0);
        return total + amount;
      }, 0);

      const totalCurrentMonthExpenses = currentMonthExpenses.reduce((total, expense) => {
        const amount = parseFloat(expense.amount || 0);
        return total + amount;
      }, 0);

      // Economia do mês atual
      const currentMonthBalance = totalCurrentMonthIncomes - totalCurrentMonthExpenses;

      console.log('Total de Receitas Históricas:', totalHistoricIncomes);
      console.log('Total de Despesas Históricas:', totalHistoricExpenses);
      console.log('Total de Receitas do Mês Atual:', totalCurrentMonthIncomes);
      console.log('Total de Despesas do Mês Atual:', totalCurrentMonthExpenses);
      console.log('Economia do Mês Atual:', currentMonthBalance);

      // Calcula a média mensal baseada nos últimos meses (excluindo o atual)
      const totalHistoricSaved = totalHistoricIncomes - totalHistoricExpenses;
      const completedMonths = Math.min(5, monthsBetweenDates(sixMonthsAgo, currentMonthStart));
      const averageMonthlyBalance = completedMonths > 0 ? totalHistoricSaved / completedMonths : 0;
      
      // Combinamos o histórico com dados atuais para uma melhor estimativa
      // Usamos a economia do mês atual se disponível, ou a média histórica
      const estimatedMonthlyBalance = currentMonthBalance !== 0 ? currentMonthBalance : averageMonthlyBalance;
      
      const goalAmount = parseFloat(user.financial_goal_amount);
      const monthlyNeeded = monthsUntilGoal > 0 ? (goalAmount - totalHistoricSaved) / monthsUntilGoal : goalAmount;

      // Total economizado é a soma do histórico mais o mês atual
      const totalSaved = totalHistoricSaved + currentMonthBalance;

      console.log('Total Economizado Histórico:', totalHistoricSaved);
      console.log('Meses Completos Considerados:', completedMonths);
      console.log('Média Mensal Histórica:', averageMonthlyBalance);
      console.log('Economia Estimada Mensal:', estimatedMonthlyBalance);
      console.log('Total Economizado (inclui mês atual):', totalSaved);
      console.log('Valor Necessário por Mês:', monthlyNeeded);
      
      // Projeta a economia futura baseada na economia mensal estimada
      const projectedAmount = totalSaved + (estimatedMonthlyBalance * monthsUntilGoal);
      
      // Verifica se o objetivo é alcançável com a economia atual
      const isAchievable = projectedAmount >= goalAmount;
      
      // Calcula o valor faltante
      const remainingAmount = Math.max(0, goalAmount - totalSaved);

      // Calcula quantos meses seriam necessários com a economia atual
      const monthsNeededWithCurrentSavings = estimatedMonthlyBalance > 0 
        ? Math.ceil(remainingAmount / estimatedMonthlyBalance)
        : Infinity;

      console.log('Projeção Final:', projectedAmount);
      console.log('É alcançável?', isAchievable);
      console.log('Valor Faltante:', remainingAmount);
      console.log('Meses Necessários:', monthsNeededWithCurrentSavings);
      console.log('=== FIM DEBUG OBJETIVO FINANCEIRO ===\n');

      financialGoalInfo = {
        name: user.financial_goal_name,
        amount: goalAmount,
        start_date: user.financial_goal_start_date,
        end_date: user.financial_goal_end_date,
        months_remaining: monthsUntilGoal,
        months_needed_with_current_savings: monthsNeededWithCurrentSavings,
        monthly_balance: estimatedMonthlyBalance,
        current_month_balance: currentMonthBalance,
        historic_monthly_average: averageMonthlyBalance,
        monthly_needed: monthlyNeeded,
        total_saved: totalSaved,
        projected_savings: projectedAmount,
        is_achievable: isAchievable,
        remaining_amount: remainingAmount,
        progress_percentage: (totalSaved / goalAmount) * 100,
        months_since_start: completedMonths + 1 // Inclui o mês atual
      };
    }

    const totalBudget = totalIncomes;

    const responseData = {
      expenses: allExpenses,
      incomes: allIncomes,
      total_expenses: totalExpensesWithRecurrences,
      total_incomes: totalIncomesWithRecurrences,
      balance,
      expenses_by_category: expensesByCategory,
      incomes_by_category: incomesByCategory,
      expenses_by_date: groupByDate(expenses, 'expense_date'),
      incomes_by_date: groupByDate(incomes, 'date'),
      expenses_by_bank: expensesByBank,
      incomes_by_bank: incomesByBank,
      budget_info: calculateBudgetInfo(totalBudget, totalExpenses),
      financial_goal: financialGoalInfo,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        total_income: totalIncomes,
        financial_goal_name: user.financial_goal_name,
        financial_goal_amount: user.financial_goal_amount,
        financial_goal_start_date: user.financial_goal_start_date,
        financial_goal_end_date: user.financial_goal_end_date
      }
    };

    res.json(responseData);
  } catch (error) {
    console.error('\n=== ERRO NO DASHBOARD ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    console.error('=== FIM DO ERRO ===\n');
    
    res.status(500).json({ 
      message: 'Erro ao buscar dados do dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/category-summary', async (req, res) => {
  const { start_date, end_date, type } = req.query;
  try {
    const Model = type === 'income' ? Income : Expense;
    const dateField = type === 'income' ? 'date' : 'expense_date';

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
      include: [{ model: Category, as: 'Category', attributes: ['category_name'] }],
    });

    if (!summary || summary.length === 0) {
      return res.json({
        message: `Não há ${type === 'income' ? 'receitas' : 'despesas'} registrados para este período.`,
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
    const dateField = type === 'income' ? 'date' : 'expense_date';
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
        message: `Não há ${type === 'income' ? 'receitas' : 'despesas'} registrados para este período.`,
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

    // Ajusta para começar sempre no primeiro dia do próximo mês
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    nextMonth.setHours(0, 0, 0, 0);

    // Cria uma nova data para o início do período
    const startDate = new Date(nextMonth);

    // Ajusta a data final para o último dia do último mês da projeção
    const endDate = new Date(nextMonth);
    endDate.setMonth(endDate.getMonth() + (projectionMonths - 1));
    const lastDay = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
    endDate.setDate(lastDay);
    endDate.setHours(23, 59, 59, 999);

    console.log('\n=== INÍCIO DAS QUERIES DO DASHBOARD ===\n');
    console.log('Período de busca:');
    console.log('De:', startDate);
    console.log('Até:', endDate);
    console.log('\n');

    const [expenses, incomes] = await Promise.all([
      Expense.findAll({
        where: {
          user_id: req.user.id,
          expense_date: { 
            [Op.between]: [startDate, endDate] 
          }
        },
        include: [
          { model: Category, as: 'Category' }, 
          { model: Bank, as: 'bank' }
        ]
      }),
      Income.findAll({
        where: {
          user_id: req.user.id,
          date: { 
            [Op.between]: [startDate, endDate] 
          }
        },
        include: [
          { model: Category, as: 'Category' }, 
          { model: Bank, as: 'bank' }
        ]
      })
    ]);

    // Receitas Projetados: soma de incomes no período
    const totalProjectedIncomes = incomes.reduce((total, income) => {
      return total + parseFloat(income.amount || 0);
    }, 0);

    // Despesas Projetados: soma de todas as expenses no período
    const totalProjectedExpenses = expenses.reduce((total, expense) => {
      return total + parseFloat(expense.amount || 0);
    }, 0);

    // Saldo Final: Receitas Projetados - Despesas Projetados
    const finalBalance = totalProjectedIncomes - totalProjectedExpenses;

    const projectionData = [];
    for (let i = 0; i < projectionMonths; i++) {
      const currentDate = new Date(nextMonth);
      currentDate.setMonth(currentDate.getMonth() + i);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Filtra despesas do mês atual
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        return expenseDate.getMonth() === currentDate.getMonth() && 
               expenseDate.getFullYear() === currentDate.getFullYear();
      }).reduce((total, expense) => total + parseFloat(expense.amount || 0), 0);

      // Filtra receitas do mês atual
      const monthIncomes = incomes.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getMonth() === currentDate.getMonth() && 
               incomeDate.getFullYear() === currentDate.getFullYear();
      }).reduce((total, income) => total + parseFloat(income.amount || 0), 0);

      projectionData.push({
        date: lastDayOfMonth.toISOString().split('T')[0],
        despesas: monthExpenses,
        receitas: monthIncomes,
        saldo: monthIncomes - monthExpenses
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
        expense_date: {
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
        expense_date: {
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
      const monthKey = expense.expense_date.toISOString().substring(0, 7);
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
        expense_date: {
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

// Rota para buscar todas as transações do usuário (sem filtros de data)
router.get('/all-transactions', authenticate, async (req, res) => {
  try {
    console.log('\n=== BUSCA DE TODAS AS TRANSAÇÕES DO USUÁRIO ===');
    console.log('Usuário ID:', req.user.id);
    
    // Buscar todas as despesas do usuário
    console.log('Buscando despesas...');
    let expenses;
    try {
      expenses = await Expense.findAll({
        where: { user_id: req.user.id },
        include: [
          { model: Category, as: 'Category' },
          { model: Bank, as: 'bank' },
          { 
            model: RecurrenceRule, 
            as: 'recurrence',
            required: false
          }
        ],
        order: [['expense_date', 'DESC']]
      });
      console.log(`Total de despesas encontradas: ${expenses.length}`);
    } catch (error) {
      console.error('Erro detalhado ao buscar despesas:', error);
      console.error('Erro SQL (se disponível):', error.sql);
      console.error('Stack trace:', error.stack);
      throw new Error(`Falha ao buscar despesas: ${error.message}`);
    }
    
    // Buscar todas as receitas do usuário
    console.log('Buscando receitas...');
    let incomes;
    try {
      incomes = await Income.findAll({
        where: { user_id: req.user.id },
        include: [
          { 
            model: Category, 
            as: 'Category',
            attributes: ['id', 'name', 'color', 'description'] 
          },
          { 
            model: Bank, 
            as: 'bank',
            attributes: ['id', 'name', 'icon', 'color'] 
          }
        ],
        order: [['date', 'DESC']]
      });
      console.log(`Total de receitas encontradas: ${incomes.length}`);
      // Adicionar log para verificar se as categorias estão vindo corretamente
      if (incomes.length > 0) {
        console.log('Amostra de receita com categoria:', JSON.stringify({
          id: incomes[0].id,
          description: incomes[0].description,
          category_id: incomes[0].category_id,
          categoryObj: incomes[0].Category
        }, null, 2));
      }
    } catch (error) {
      console.error('Erro detalhado ao buscar receitas:', error);
      console.error('Erro SQL (se disponível):', error.sql);
      console.error('Stack trace:', error.stack);
      throw new Error(`Falha ao buscar receitas: ${error.message}`);
    }
    
    console.log('Retornando dados para o cliente');
    return res.json({
      expenses,
      incomes
    });
    
  } catch (error) {
    console.error('Erro ao buscar todas as transações:', error);
    console.error('Stack trace completa:', error.stack);
    return res.status(500).json({ 
      message: 'Erro ao buscar dados de transações', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Rota para obter dados para o comparativo mensal
router.get('/monthly-comparison', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const today = new Date();
    
    // Por padrão, buscar os últimos 6 meses
    let monthsToShow = req.query.months ? parseInt(req.query.months) : 6;
    monthsToShow = Math.min(12, Math.max(3, monthsToShow)); // Limitar entre 3 e 12 meses
    
    // Calcular a data de início (6 meses atrás por padrão)
    const startDate = new Date(today.getFullYear(), today.getMonth() - (monthsToShow - 1), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    console.log('\n=== INÍCIO DA BUSCA DE COMPARATIVO MENSAL ===\n');
    console.log('Período de busca:');
    console.log('De:', startDate);
    console.log('Até:', endDate);
    console.log('\n');
    
    // Buscar todas as despesas do período
    const expenses = await Expense.findAll({
      where: {
        user_id: user.id,
        expense_date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    // Buscar todas as receitas do período
    const incomes = await Income.findAll({
      where: {
        user_id: user.id,
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    console.log('Despesas encontradas:', expenses.length);
    console.log('Receitas encontradas:', incomes.length);
    
    // Criar um mapa para armazenar dados mensais
    const monthlyData = {};
    
    // Inicializar o mapa com todos os meses no período
    for (let i = 0; i < monthsToShow; i++) {
      const currentDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      monthlyData[monthKey] = {
        year: currentDate.getFullYear(),
        month: String(currentDate.getMonth() + 1).padStart(2, '0'),
        expenses: 0,
        income: 0
      };
    }
    
    // Processar despesas
    expenses.forEach(expense => {
      const expenseDate = new Date(expense.expense_date);
      const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].expenses += parseFloat(expense.amount || 0);
      }
    });
    
    // Processar receitas
    incomes.forEach(income => {
      const incomeDate = new Date(income.date);
      const monthKey = `${incomeDate.getFullYear()}-${String(incomeDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].income += parseFloat(income.amount || 0);
      }
    });
    
    // Converter o mapa para array e ordenar por data
    const result = Object.values(monthlyData).sort((a, b) => {
      const dateA = new Date(parseInt(a.year), parseInt(a.month) - 1, 1);
      const dateB = new Date(parseInt(b.year), parseInt(b.month) - 1, 1);
      return dateA - dateB;
    });
    
    console.log('Resultado do comparativo mensal:', result.length, 'meses');
    
    res.json(result);
    
  } catch (error) {
    console.error('Erro ao buscar comparativo mensal:', error);
    res.status(500).json({ message: 'Erro ao buscar comparativo mensal' });
  }
});

export default router;