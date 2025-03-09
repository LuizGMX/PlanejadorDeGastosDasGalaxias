import express from 'express';
import { Expense, Category, SubCategory } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const expenses = await Expense.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: Category, attributes: ['id', 'category_name'] }
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
      user_id: req.user.id
    };
    const expense = await Expense.create(expenseData);
    res.status(201).json(expense);
  } catch (error) {
    console.error('Erro ao adicionar despesa:', error);
    res.status(500).json({ message: 'Erro ao adicionar despesa' });
  }
});

router.get('/categories', authenticate, async (req, res) => {
  try {
    console.log('Buscando categorias...');
    const categories = await Category.findAll({
      attributes: ['id', 'category_name'],
    });
    console.log('Categorias encontradas:', categories);
    res.json(categories);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ message: 'Erro ao buscar categorias' });
  }
});

router.get('/subcategories/:categoryId', authenticate, async (req, res) => {
  try {
    const subcategories = await SubCategory.findAll({
      where: { category_id: req.params.categoryId },
      attributes: ['id', 'subcategory_name'],
      order: [['subcategory_name', 'ASC']]
    });
    res.json(subcategories);
  } catch (error) {
    console.error('Erro ao listar subcategorias:', error);
    res.status(500).json({ message: 'Erro ao buscar subcategorias' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const {
      description,
      amount,
      category_id,
      subcategory_id,
      bank_id,
      expense_date,
      payment_method,
      has_installments,
      current_installment,
      total_installments
    } = req.body;

    // Validações
    if (!description || !amount || !category_id || !subcategory_id || !bank_id || !expense_date || !payment_method) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    if (has_installments && (!current_installment || !total_installments)) {
      return res.status(400).json({ message: 'Informações de parcelas incompletas' });
    }

    const installmentGroupId = has_installments ? uuidv4() : null;
    const expenses = [];

    if (has_installments) {
      // Calcula a data base para as parcelas
      const baseDate = new Date(expense_date);
      const amountPerInstallment = parseFloat(amount) / parseInt(total_installments);

      for (let i = 0; i < total_installments; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + i);

        expenses.push({
          user_id: req.user.id,
          description: `${description} (${i + 1}/${total_installments})`,
          amount: amountPerInstallment,
          category_id,
          subcategory_id,
          bank_id,
          expense_date: installmentDate,
          payment_method,
          has_installments: true,
          current_installment: i + 1,
          total_installments,
          installment_group_id: installmentGroupId
        });
      }
    } else {
      expenses.push({
        user_id: req.user.id,
        description,
        amount,
        category_id,
        subcategory_id,
        bank_id,
        expense_date,
        payment_method,
        has_installments: false
      });
    }

    await Expense.bulkCreate(expenses);
    res.status(201).json({ message: 'Despesa(s) criada(s) com sucesso' });
  } catch (error) {
    console.error('Erro ao adicionar despesa:', error);
    res.status(500).json({ message: 'Erro ao adicionar despesa' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { month, year, category_id } = req.query;
    const whereClause = { user_id: req.user.id };

    if (month && year) {
      whereClause.expense_date = Sequelize.where(
        Sequelize.fn('DATE_FORMAT', Sequelize.col('expense_date'), '%Y-%m'),
        `${year}-${month.toString().padStart(2, '0')}`
      );
    }

    if (category_id) {
      whereClause.category_id = category_id;
    }

    const expenses = await Expense.findAll({
      where: whereClause,
      include: [
        { model: Category, attributes: ['category_name'] },
        { model: SubCategory, attributes: ['subcategory_name'] }
      ],
      order: [['expense_date', 'DESC']]
    });

    res.json(expenses);
  } catch (error) {
    console.error('Erro ao listar despesas:', error);
    res.status(500).json({ message: 'Erro ao buscar despesas' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!expense) {
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }

    await expense.destroy();
    res.json({ message: 'Despesa excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir despesa:', error);
    res.status(500).json({ message: 'Erro ao excluir despesa' });
  }
});

router.delete('/batch', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }

    await Expense.destroy({
      where: {
        id: ids,
        user_id: req.user.id
      }
    });

    res.json({ message: 'Despesas excluídas com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir despesas:', error);
    res.status(500).json({ message: 'Erro ao excluir despesas' });
  }
});

export default router;