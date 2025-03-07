const { Sequelize } = require('sequelize');

module.exports = (Expense, Category) => {
  const router = require('express').Router();

  router.get('/', async (req, res) => {
    try {
      const expenses = await Expense.findAll({
        where: { user_id: req.user.id },
        include: [{ model: Category }],
      });
      const expensesByCategory = expenses.reduce((acc, expense) => {
        const category = expense.Category.category_name;
        const existing = acc.find((item) => item.category_name === category);
        if (existing) {
          existing.total += expense.amount;
        } else {
          acc.push({ category_name: category, total: expense.amount });
        }
        return acc;
      }, []);
      res.json({ expenses_by_category: expensesByCategory });
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      res.status(500).json({ message: 'Erro ao buscar dados do dashboard' });
    }
  });
  
  router.get('/category-summary', async (req, res) => {
    const { start_date, end_date } = req.query;
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
    res.json(summary);
  });

  router.get('/period-summary', async (req, res) => {
    const { period } = req.query; // 'month' ou 'year'
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
    res.json(summary);
  });

  return router;
};
