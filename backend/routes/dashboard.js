import { Sequelize } from 'sequelize';
import express from 'express';
import { 
  Expense, 
  Income, 
  Category, 
  Bank, 
  Budget, 
  User,
  ExpensesRecurrenceException,
  IncomesRecurrenceException,
  FinancialGoal
} from '../models/index.js';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import checkSubscription from '../middleware/subscriptionCheck.js';

const router = express.Router();

// Todas as rotas usam o middleware de autenticação seguido do middleware de verificação de assinatura
router.use(authenticate);
router.use(checkSubscription);

// Função para calcular ocorrências de despesas recorrentes
const calculateRecurringExpenseOccurrences = (expense, startDate, endDate) => {
  const occurrences = [];
  const recurrenceType = expense.recurrence_type;
  const startDateObj = new Date(expense.start_date);
  const endDateObj = expense.end_date ? new Date(expense.end_date) : new Date('2099-12-31');
  
  // Se a data de início da recorrência é posterior ao período ou a data de fim é anterior, retorna vazio
  if (startDateObj > endDate || endDateObj < startDate) {
    return [];
  }

  let currentDate = new Date(Math.max(startDateObj, startDate));
  
  // Mapeia exceções para verificar datas a serem puladas
  const exceptionDates = new Set(expense.exceptions.map(ex => 
    new Date(ex.exception_date).toISOString().split('T')[0]
  ));

  while (currentDate <= endDate && currentDate <= endDateObj) {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    // Verifica se esta data não é uma exceção
    if (!exceptionDates.has(dateKey)) {
      occurrences.push({
        ...expense.toJSON(),
        id: `rec_${expense.id}_${currentDate.getTime()}`,
        expense_date: new Date(currentDate),
        isRecurringOccurrence: true
      });
    }

    // Avança para a próxima data baseada no tipo de recorrência
    currentDate = getNextRecurringDate(currentDate, recurrenceType);
  }

  return occurrences;
};

// Função para calcular ocorrências de receitas recorrentes
const calculateRecurringIncomeOccurrences = (income, startDate, endDate) => {
  const occurrences = [];
  const recurrenceType = income.recurrence_type;
  const startDateObj = new Date(income.start_date);
  const endDateObj = income.end_date ? new Date(income.end_date) : new Date('2099-12-31');
  
  // Se a data de início da recorrência é posterior ao período ou a data de fim é anterior, retorna vazio
  if (startDateObj > endDate || endDateObj < startDate) {
    return [];
  }

  let currentDate = new Date(Math.max(startDateObj, startDate));
  
  // Mapeia exceções para verificar datas a serem puladas
  const exceptionDates = new Set(income.exceptions.map(ex => 
    new Date(ex.exception_date).toISOString().split('T')[0]
  ));

  while (currentDate <= endDate && currentDate <= endDateObj) {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    // Verifica se esta data não é uma exceção
    if (!exceptionDates.has(dateKey)) {
      occurrences.push({
        ...income.toJSON(),
        id: `rec_${income.id}_${currentDate.getTime()}`,
        date: new Date(currentDate),
        isRecurringOccurrence: true
      });
    }

    // Avança para a próxima data baseada no tipo de recorrência
    currentDate = getNextRecurringDate(currentDate, recurrenceType);
  }

  return occurrences;
};

// Função auxiliar para calcular próxima data de recorrência
const getNextRecurringDate = (date, recurrenceType) => {
  const next = new Date(date);
  
  switch (recurrenceType) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'semiannual':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'annual':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1); // Por padrão assume mensal
  }
  
  return next;
};

// Rota principal do dashboard
router.get('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Parâmetros da requisição
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), selectedCategories = [], selectedBanks = [] } = req.query;
    
    // Converte arrays de string para arrays reais
    const categoriesArray = typeof selectedCategories === 'string' ? selectedCategories.split(',').filter(c => c) : selectedCategories;
    const banksArray = typeof selectedBanks === 'string' ? selectedBanks.split(',').filter(b => b) : selectedBanks;

    // Define o período
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    console.log('Buscando dados para o período:', startDate, 'até', endDate);
    console.log('Categorias selecionadas:', categoriesArray);
    console.log('Bancos selecionados:', banksArray);

    // Busca despesas e receitas normais
    const [expenses, incomes] = await Promise.all([
      Expense.findAll({
        where: {
          user_id: req.user.id,
          expense_date: {
            [Op.between]: [startDate, endDate]
          },
          ...(categoriesArray.length > 0 && {
            category_id: {
              [Op.in]: categoriesArray
            }
          }),
          ...(banksArray.length > 0 && {
            bank_id: {
              [Op.in]: banksArray
            }
          })
        },
        include: [
          { model: Category, as: 'Category' },
          { 
            model: Bank, 
            as: 'bank',
            attributes: ['id', 'name', 'code']
          }
        ]
      }),
      Income.findAll({
        where: {
          user_id: req.user.id,
          date: {
            [Op.between]: [startDate, endDate]
          },
          ...(categoriesArray.length > 0 && {
            category_id: {
              [Op.in]: categoriesArray
            }
          }),
          ...(banksArray.length > 0 && {
            bank_id: {
              [Op.in]: banksArray
            }
          })
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
      })
    ]);

    // Busca despesas recorrentes
    const recurringExpenses = await Expense.findAll({
      where: {
        user_id: req.user.id,
        is_recurring: true,
        start_date: {
          [Op.lte]: endDate
        },
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: startDate } }
        ],
        ...(categoriesArray.length > 0 && {
          category_id: {
            [Op.in]: categoriesArray
          }
        }),
        ...(banksArray.length > 0 && {
          bank_id: {
            [Op.in]: banksArray
          }
        })
      },
      include: [
        { model: Category, as: 'Category' },
        { 
          model: Bank, 
          as: 'bank',
          attributes: ['id', 'name', 'code']
        },
        { model: ExpensesRecurrenceException, as: 'exceptions' }
      ]
    });

    // Busca receitas recorrentes
    const recurringIncomes = await Income.findAll({
          where: {
            user_id: req.user.id,
        is_recurring: true,
        start_date: {
          [Op.lte]: endDate
        },
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: startDate } }
        ],
        ...(categoriesArray.length > 0 && {
          category_id: {
            [Op.in]: categoriesArray
          }
        }),
        ...(banksArray.length > 0 && {
          bank_id: {
            [Op.in]: banksArray
          }
        })
      },
      include: [
        { model: Category, as: 'Category' },
        { model: Bank, as: 'bank' },
        { model: IncomesRecurrenceException, as: 'exceptions' }
      ]
    });

    // Calcula ocorrências para despesas recorrentes
    let expandedRecurringExpenses = [];
    for (const expense of recurringExpenses) {
      const occurrences = calculateRecurringExpenseOccurrences(expense, startDate, endDate);
      expandedRecurringExpenses = [...expandedRecurringExpenses, ...occurrences];
    }

    // Calcula ocorrências para receitas recorrentes
    let expandedRecurringIncomes = [];
    for (const income of recurringIncomes) {
      const occurrences = calculateRecurringIncomeOccurrences(income, startDate, endDate);
      expandedRecurringIncomes = [...expandedRecurringIncomes, ...occurrences];
    }

    // Combina as despesas e receitas normais com as recorrentes
    const allExpenses = [...expenses, ...expandedRecurringExpenses];
    const allIncomes = [...incomes, ...expandedRecurringIncomes];

    // Calcula totais gerais
    const totalExpenses = allExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalIncomes = allIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    const balance = totalIncomes - totalExpenses;

    // Busca orçamentos do mês atual
    const budget = await Budget.findOne({
      where: {
        user_id: req.user.id,
        year: year,
        month: month
      }
    });

    // Calcula informações por categoria com percentual
    const expensesByCategory = allExpenses.reduce((acc, expense) => {
      const categoryId = expense.category_id;
      const categoryName = expense.Category ? expense.Category.category_name : 'Sem categoria';
      
      if (!acc[categoryId]) {
        acc[categoryId] = {
          id: categoryId,
          category_name: categoryName,
          total: 0,
          percentage: 0
        };
      }
      
      acc[categoryId].total += parseFloat(expense.amount);
      return acc;
    }, {});

    // Calcula percentuais após ter o total
    Object.values(expensesByCategory).forEach(category => {
      category.percentage = totalExpenses > 0 ? (category.total / totalExpenses * 100).toFixed(2) : 0;
    });

    const incomesByCategory = allIncomes.reduce((acc, income) => {
      const categoryId = income.category_id;
      const categoryName = income.Category ? income.Category.category_name : 'Sem categoria';
      
      if (!acc[categoryId]) {
        acc[categoryId] = {
          id: categoryId,
          category_name: categoryName,
          total: 0
        };
      }
      
      acc[categoryId].total += parseFloat(income.amount);
      return acc;
    }, {});

    // Calcula informações por banco com percentual
    const expensesByBank = allExpenses.reduce((acc, expense) => {
      const bankId = expense.bank_id;
      const bankName = expense.bank ? expense.bank.name : 'Sem banco';
      
      if (!acc[bankId]) {
        acc[bankId] = {
          id: bankId,
          bank_name: bankName,
          total: 0,
          percentage: 0
        };
      }
      
      acc[bankId].total += parseFloat(expense.amount);
      return acc;
    }, {});

    // Calcula percentuais após ter o total
    Object.values(expensesByBank).forEach(bank => {
      bank.percentage = totalExpenses > 0 ? (bank.total / totalExpenses * 100).toFixed(2) : 0;
    });

    // Calcula informações por banco para receitas
    const incomesByBank = allIncomes.reduce((acc, income) => {
      const bankId = income.bank_id;
      const bankName = income.bank ? income.bank.name : 'Sem banco';
      
      if (!acc[bankId]) {
        acc[bankId] = {
          id: bankId,
          bank_name: bankName,
          total: 0,
          percentage: 0
        };
      }
      
      acc[bankId].total += parseFloat(income.amount);
      return acc;
    }, {});

    // Calcula percentuais para receitas por banco
    Object.values(incomesByBank).forEach(bank => {
      bank.percentage = totalIncomes > 0 ? (bank.total / totalIncomes * 100).toFixed(2) : 0;
    });

    // Prepara as categorias e bancos para o filtro
    const [categories, banks] = await Promise.all([
      Category.findAll({
        where: { user_id: req.user.id },
        attributes: ['id', 'category_name', 'type']
      }),
      Bank.findAll({
        attributes: ['id', 'name']
      })
    ]);

    // Busca a meta financeira do usuário
    const userFinancialGoal = await User.findByPk(req.user.id, {
      attributes: [
        'financial_goal_name',
        'financial_goal_amount',
        'financial_goal_period_type',
        'financial_goal_period_value',
        'financial_goal_start_date',
        'financial_goal_end_date'
      ]
    });

    // Prepara os dados da meta financeira
    let financialGoalData = null;
    if (userFinancialGoal && userFinancialGoal.financial_goal_name) {
      const currentDate = new Date();
      const endDate = new Date(userFinancialGoal.financial_goal_end_date);
      const monthsRemaining = (endDate.getFullYear() - currentDate.getFullYear()) * 12 + 
                             (endDate.getMonth() - currentDate.getMonth());
      
      const monthlyNeeded = (userFinancialGoal.financial_goal_amount) / Math.max(1, monthsRemaining);
      const monthlyBalance = totalIncomes - totalExpenses;
      const monthsNeededWithCurrentSavings = monthlyBalance > 0 
        ? Math.ceil(userFinancialGoal.financial_goal_amount / monthlyBalance)
        : Infinity;

      financialGoalData = {
        id: 1, // ID temporário já que está na tabela de usuários
        name: userFinancialGoal.financial_goal_name,
        amount: userFinancialGoal.financial_goal_amount,
        period_type: userFinancialGoal.financial_goal_period_type,
        period_value: userFinancialGoal.financial_goal_period_value,
        current_amount: 0, // Por enquanto fixo em 0
        is_achievable: monthlyBalance >= monthlyNeeded,
        total_saved: 0, // Por enquanto fixo em 0
        monthly_balance: monthlyBalance,
        monthly_needed: monthlyNeeded,
        months_remaining: monthsRemaining,
        months_needed_with_current_savings: monthsNeededWithCurrentSavings,
        end_date: userFinancialGoal.financial_goal_end_date,
        current_month_balance: monthlyBalance
      };
    }

    res.json({
      expenses: allExpenses,
      incomes: allIncomes,
      totalExpenses,
      totalIncomes,
      balance,
      expenses_by_category: Object.values(expensesByCategory),
      incomes_by_category: Object.values(incomesByCategory),
      expenses_by_bank: Object.values(expensesByBank),
      incomes_by_bank: Object.values(incomesByBank),
      budget_info: budget ? {
        id: budget.id,
        amount: budget.amount,
        total_spent: totalExpenses,
        remaining: budget.amount - totalExpenses,
        percentage: (totalExpenses / budget.amount * 100).toFixed(2)
      } : null,
      financial_goal: financialGoalData,
      filters: {
        categories,
        banks
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ message: 'Erro ao buscar dados do dashboard', error: error.message });
  }
});

// Rota para o resumo mensal
router.get('/summary', async (req, res) => {
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

    // Busca despesas recorrentes
    const recurringExpenses = await Expense.findAll({
      where: {
        user_id: user.id,
        is_recurring: true,
        start_date: {
          [Op.lte]: endDate
        },
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: startDate } }
        ]
      },
      include: [
        { model: ExpensesRecurrenceException, as: 'exceptions' }
      ]
    });

    // Busca receitas recorrentes
    const recurringIncomes = await Income.findAll({
      where: {
        user_id: user.id,
        is_recurring: true,
        start_date: {
          [Op.lte]: endDate
        },
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: startDate } }
        ]
      },
      include: [
        { model: IncomesRecurrenceException, as: 'exceptions' }
      ]
    });

    // Calcula ocorrências para despesas recorrentes
    let expandedRecurringExpenses = [];
    for (const expense of recurringExpenses) {
      const occurrences = calculateRecurringExpenseOccurrences(expense, startDate, endDate);
      expandedRecurringExpenses = [...expandedRecurringExpenses, ...occurrences];
    }

    // Calcula ocorrências para receitas recorrentes
    let expandedRecurringIncomes = [];
    for (const income of recurringIncomes) {
      const occurrences = calculateRecurringIncomeOccurrences(income, startDate, endDate);
      expandedRecurringIncomes = [...expandedRecurringIncomes, ...occurrences];
    }

    // Combina as despesas e receitas normais com as recorrentes
    const allExpenses = [...expenses, ...expandedRecurringExpenses];
    const allIncomes = [...incomes, ...expandedRecurringIncomes];

    // Calcula totais
    const totalExpenses = allExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const totalIncomes = allIncomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    const balance = totalIncomes - totalExpenses;

    // Calcula percentuais por categoria
    const expensesByCategory = {};
    allExpenses.forEach(expense => {
      const categoryId = expense.category_id;
      if (!expensesByCategory[categoryId]) {
        expensesByCategory[categoryId] = 0;
      }
      expensesByCategory[categoryId] += parseFloat(expense.amount);
    });

    // Converte para array e calcula percentuais
    const expensePercentages = Object.entries(expensesByCategory).map(([categoryId, amount]) => ({
      category_id: categoryId,
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

// Rota para buscar todas as transações
router.get('/all-transactions', async (req, res) => {
  try {
    // Busca despesas e receitas em paralelo
    const [expenses, incomes] = await Promise.all([
      Expense.findAll({
        where: { user_id: req.user.id },
        include: [
          { model: Category, as: 'Category', attributes: ['id', 'category_name'] },
          { model: Bank, as: 'bank', attributes: ['id', 'name'] }
        ],
        order: [['expense_date', 'DESC']]
      }),
      Income.findAll({
        where: { user_id: req.user.id },
        include: [
          { model: Category, as: 'Category', attributes: ['id', 'category_name'] },
          { model: Bank, as: 'bank', attributes: ['id', 'name'] }
        ],
        order: [['date', 'DESC']]
      })
    ]);

    res.json({
      expenses,
      incomes
    });
  } catch (error) {
    console.error('Erro ao buscar todas as transações:', error);
    res.status(500).json({ message: 'Erro ao buscar transações', error: error.message });
  }
});

export default router;