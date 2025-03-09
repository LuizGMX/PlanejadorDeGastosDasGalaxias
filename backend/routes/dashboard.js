import { Sequelize } from 'sequelize';
import express from 'express';
import { Expense, Category } from '../models/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Se não houver mês e ano na query, usa o mês e ano atuais
    const currentDate = new Date();
    const { 
      month = currentDate.getMonth() + 1, // getMonth() retorna 0-11
      year = currentDate.getFullYear(),
      payment_method = 'all'
    } = req.query;
    
    console.log('Parâmetros recebidos:', { 
      month, 
      year, 
      payment_method,
      tipos: { 
        month: typeof month, 
        year: typeof year,
        payment_method: typeof payment_method 
      } 
    });
    
    // Construir a cláusula WHERE
    const whereClause = {
      user_id: req.user.id
    };

    // Sempre adiciona os filtros de data com os valores padrão ou fornecidos
    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);
    
    console.log('Valores parseados:', { parsedMonth, parsedYear });
    
    whereClause.expense_date = Sequelize.where(
      Sequelize.fn('DATE_FORMAT', Sequelize.col('expense_date'), '%Y-%m'),
      `${parsedYear}-${parsedMonth.toString().padStart(2, '0')}`
    );

    // Adiciona filtro de tipo de pagamento se não for 'all'
    if (payment_method && payment_method !== 'all') {
      whereClause.payment_method = payment_method;
    }

    // Log da cláusula WHERE para debug
    console.log('WHERE clause:', JSON.stringify(whereClause, null, 2));

    const expenses = await Expense.findAll({
      where: whereClause,
      include: [{ model: Category }],
      logging: (sql) => console.log('Query SQL executada:', sql)
    });

    // Se não houver despesas, retorna uma mensagem amigável
    if (!expenses || expenses.length === 0) {
      return res.json({
        message: "Você ainda não possui despesas cadastradas neste período!",
        suggestion: "Que tal começar a registrar suas despesas agora?",
        expenses_by_category: [],
        current_filters: {
          month: parsedMonth,
          year: parsedYear,
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

    console.log('Despesas agrupadas por categoria:', expensesByCategory);

    res.json({ 
      expenses_by_category: expensesByCategory,
      total_expenses: expenses.length,
      current_filters: {
        month: parsedMonth,
        year: parsedYear,
        payment_method
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
