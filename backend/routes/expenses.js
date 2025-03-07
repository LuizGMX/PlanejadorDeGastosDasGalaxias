module.exports = (Expense, CreditCard, Category) => {
  const router = require('express').Router();

  router.get('/', async (req, res) => {
    try {
      const expenses = await Expense.findAll({
        where: { user_id: req.user.id },
        include: [
          { model: CreditCard, attributes: ['id', 'card_name'] },
          { model: Category, attributes: ['id', 'category_name'] },
        ],
      });
      res.json(expenses);
    } catch (error) {
      console.error('Erro ao listar despesas:', error);
      res.status(500).json({ message: 'Erro ao buscar despesas' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const expenseData = {
        ...req.body,
        user_id: req.user.id,
        credit_card_id: req.body.payment_method === 'pix' ? null : (req.body.credit_card_id || null),
      };
      const expense = await Expense.create(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      res.status(500).json({ message: 'Erro ao adicionar despesa' });
    }
  });

  router.get('/categories', async (req, res) => {
    try {
      const categories = await Category.findAll({
        attributes: ['id', 'category_name'],
      });
      res.json(categories);
    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      res.status(500).json({ message: 'Erro ao buscar categorias' });
    }
  });

  return router;
};