import { Sequelize } from 'sequelize';
import express from 'express';
import { Expense, Income, Category, SubCategory, Bank, Budget, User } from '../models/index.js';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { months, years } = req.query;
    const whereExpense = { user_id: req.user.id };
    const whereIncome = { user_id: req.user.id };

    // Construindo a condição para múltiplos meses e anos
    if (months?.length > 0 && years?.length > 0) {
      whereExpense[Op.or] = years.map(year => ({
        [Op.and]: [
          Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('expense_date')), year),
          {
            [Op.or]: months.map(month => 
              Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('expense_date')), month)
            )
          }
        ]
      }));

      whereIncome[Op.or] = years.map(year => ({
        [Op.and]: [
          Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('date')), year),
          {
            [Op.or]: months.map(month => 
              Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('date')), month)
            )
          }
        ]
      }));
    }

    // Buscar o usuário para obter o net_income
    const user = await User.findByPk(req.user.id);
    const net_income = user ? parseFloat(user.net_income || 0) : 0;

    const [expenses, incomes] = await Promise.all([
      Expense.findAll({
        where: whereExpense,
        include: [
          { 
            model: Category,
            where: { type: 'expense' }
          },
          { model: SubCategory },
          { model: Bank }
        ],
        order: [['expense_date', 'ASC']]
      }),
      Income.findAll({
        where: whereIncome,
        include: [
          { 
            model: Category,
            where: { type: 'income' }
          },
          { model: SubCategory },
          { model: Bank }
        ],
        order: [['date', 'ASC']]
      })
    ]);

    // Calculando o total de incomes
    const totalIncomes = incomes.reduce((sum, income) => {
      const parsedAmount = parseFloat(income.amount);
      return sum + (isNaN(parsedAmount) ? 0 : parsedAmount);
    }, 0);
    
    // Orçamento total é a soma dos incomes + net_income
    const totalBudget = totalIncomes + net_income;

    console.log('Debug valores do orçamento:', {
      totalIncomes,
      net_income,
      totalBudget,
      incomes: incomes.map(i => ({ amount: i.amount, parsed: parseFloat(i.amount) }))
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

    const incomesByCategory = incomes.reduce((acc, income) => {
      const category = income.Category.category_name;
      const existing = acc.find(item => item.category_name === category);
      if (existing) {
        existing.total += parseFloat(income.amount);
      } else {
        acc.push({ category_name: category, total: parseFloat(income.amount) });
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

    const incomesByDate = incomes.reduce((acc, income) => {
      const date = income.date.toISOString().split('T')[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.total += parseFloat(income.amount);
      } else {
        acc.push({ date, total: parseFloat(income.amount) });
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

    const incomesByBank = incomes.reduce((acc, income) => {
      if (!income.Bank) return acc;
      const bank = income.Bank.name;
      const existing = acc.find(item => item.bank_name === bank);
      if (existing) {
        existing.total += parseFloat(income.amount);
      } else {
        acc.push({ bank_name: bank, total: parseFloat(income.amount) });
      }
      return acc;
    }, []);

    // Calculando informações de orçamento
    const totalExpenses = expenses.reduce((sum, expense) => {
      const parsedAmount = parseFloat(expense.amount);
      return sum + (isNaN(parsedAmount) ? 0 : parsedAmount);
    }, 0);

    const budget_info = {
      total_budget: totalBudget,
      total_spent: totalExpenses,
      total_income: totalIncomes,
      net_income: net_income,
      balance: totalBudget - totalExpenses,
      percentage_spent: ((totalExpenses / (totalBudget || 1)) * 100),
      remaining_days: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()
    };

    if (budget_info.remaining_days > 0) {
      budget_info.suggested_daily_spend = budget_info.balance / budget_info.remaining_days;
    }

    res.json({
      expenses_by_category: expensesByCategory,
      incomes_by_category: incomesByCategory,
      expenses_by_date: expensesByDate,
      incomes_by_date: incomesByDate,
      expenses_by_bank: expensesByBank,
      incomes_by_bank: incomesByBank,
      budget_info,
      total_expenses: totalExpenses,
      total_incomes: totalIncomes,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        net_income: net_income,
        total_income: totalIncomes
      }
    });
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

router.get('/available-periods', async (req, res) => {
  const { type } = req.query;
  try {
    const Model = type === 'income' ? Income : Expense;
    const dateField = type === 'income' ? 'income_date' : 'expense_date';

    // Busca anos disponíveis
    const years = await Model.findAll({
      where: { user_id: req.user.id },
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.fn('YEAR', Sequelize.col(dateField))), 'year']
      ],
      order: [[Sequelize.fn('YEAR', Sequelize.col(dateField)), 'DESC']]
    });

    if (!years || years.length === 0) {
      return res.json({
        message: `Você ainda não possui ${type === 'income' ? 'ganhos' : 'despesas'} cadastrados.`,
        years: [],
        months: []
      });
    }

    // Se um ano específico foi fornecido, busca os meses disponíveis para aquele ano
    const { year } = req.query;
    let months = [];
    
    if (year) {
      months = await Model.findAll({
        where: {
          user_id: req.user.id,
          [dateField]: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col(dateField)), year)
        },
        attributes: [
          [Sequelize.fn('DISTINCT', Sequelize.fn('MONTH', Sequelize.col(dateField))), 'month']
        ],
        order: [[Sequelize.fn('MONTH', Sequelize.col(dateField)), 'ASC']]
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
