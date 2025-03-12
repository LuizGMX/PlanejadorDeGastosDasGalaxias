import express from 'express';
const router = express.Router();
import { Income, Category, SubCategory, Bank } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import authenticateToken from '../middleware/authenticateToken.js';
import { authenticate } from '../middleware/auth.js';
import { Sequelize } from 'sequelize';

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Listar todas as receitas do usuário
router.get('/', authenticate, async (req, res) => {
  try {
    const { months, years, description } = req.query;
    const where = { user_id: req.user.id };

    // Filtro de meses e anos
    const monthsArray = months ? (Array.isArray(months) ? months : months.split(',').map(Number)) : [];
    const yearsArray = years ? (Array.isArray(years) ? years : years.split(',').map(Number)) : [];

    if (monthsArray.length > 0 || yearsArray.length > 0) {
      where[Op.and] = [];

      if (monthsArray.length > 0) {
        where[Op.and].push(
          Sequelize.where(
            Sequelize.fn('MONTH', Sequelize.col('date')),
            { [Op.in]: monthsArray }
          )
        );
      }

      if (yearsArray.length > 0) {
        where[Op.and].push(
          Sequelize.where(
            Sequelize.fn('YEAR', Sequelize.col('date')),
            { [Op.in]: yearsArray }
          )
        );
      }
    }

    // Filtro de descrição
    if (description) {
      where.description = {
        [Op.like]: `%${description}%`
      };
    }

    const incomes = await Income.findAll({
      where,
      include: [
        { model: Category },
        { model: SubCategory },
        { model: Bank }
      ],
      order: [['date', 'DESC']]
    });

    res.json(incomes);
  } catch (error) {
    console.error('Erro ao buscar receitas:', error);
    res.status(500).json({ message: 'Erro ao buscar receitas' });
  }
});

// Adicionar nova receita
router.post('/', async (req, res) => {
  const t = await Income.sequelize.transaction();

  try {
    const {
      description,
      amount,
      date,
      category_id,
      subcategory_id,
      bank_id,
      payment_method,
      is_recurring,
      end_date,
      has_installments,
      total_installments
    } = req.body;

    // Validações básicas
    if (!description || !amount || !date || !category_id || !bank_id || !payment_method) {
      throw new Error('Campos obrigatórios faltando');
    }

    if (amount <= 0) {
      throw new Error('O valor deve ser maior que zero');
    }

    // Se for recorrente, precisa de data final
    if (is_recurring && !end_date) {
      throw new Error('Data final é obrigatória para receitas recorrentes');
    }

    // Validar período máximo de 10 anos para recorrência
    if (is_recurring) {
      const startDate = new Date(date);
      const endDate = new Date(end_date);
      const maxDate = new Date(startDate);
      maxDate.setFullYear(maxDate.getFullYear() + 10);

      if (endDate > maxDate) {
        throw new Error('O período de recorrência não pode ser maior que 10 anos');
      }
    }

    // Se tiver parcelas, precisa do número total de parcelas
    if (has_installments && !total_installments) {
      throw new Error('Número total de parcelas é obrigatório para receitas parceladas');
    }

    const recurring_group_id = is_recurring ? uuidv4() : null;
    const installment_group_id = has_installments ? uuidv4() : null;

    if (is_recurring) {
      // Criar receitas recorrentes mensais
      const startDate = new Date(date);
      const endDate = new Date(end_date);
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        await Income.create({
          description,
          amount,
          date: new Date(currentDate),
          category_id,
          subcategory_id,
          bank_id,
          payment_method,
          user_id: req.user.id,
          is_recurring,
          recurring_group_id
        }, { transaction: t });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    } else if (has_installments) {
      // Criar receitas parceladas
      const amountPerInstallment = amount / total_installments;
      const startDate = new Date(date);

      for (let i = 0; i < total_installments; i++) {
        const installmentDate = new Date(startDate);
        installmentDate.setMonth(startDate.getMonth() + i);

        await Income.create({
          description: `${description} (${i + 1}/${total_installments})`,
          amount: amountPerInstallment,
          date: installmentDate,
          category_id,
          subcategory_id,
          bank_id,
          payment_method,
          user_id: req.user.id,
          has_installments: true,
          current_installment: i + 1,
          total_installments,
          installment_group_id
        }, { transaction: t });
      }
    } else {
      // Criar receita única
      await Income.create({
        description,
        amount,
        date,
        category_id,
        subcategory_id,
        bank_id,
        payment_method,
        user_id: req.user.id,
        is_recurring: false,
        has_installments: false
      }, { transaction: t });
    }

    await t.commit();
    res.status(201).json({ message: 'Receita adicionada com sucesso' });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ message: error.message });
  }
});

// Atualizar receita
router.put('/:id', async (req, res) => {
  const t = await Income.sequelize.transaction();

  try {
    const {
      description,
      amount,
      date,
      category_id,
      subcategory_id,
      bank_id,
      payment_method,
      update_future
    } = req.body;

    const income = await Income.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!income) {
      throw new Error('Receita não encontrada');
    }

    // Validações básicas
    if (!description || !amount || !date || !category_id || !bank_id || !payment_method) {
      throw new Error('Campos obrigatórios faltando');
    }

    if (amount <= 0) {
      throw new Error('O valor deve ser maior que zero');
    }

    if (income.is_recurring && update_future) {
      // Atualizar todas as receitas futuras do mesmo grupo
      await Income.update(
        {
          description,
          amount,
          category_id,
          subcategory_id,
          bank_id,
          payment_method
        },
        {
          where: {
            recurring_group_id: income.recurring_group_id,
            date: {
              [Op.gte]: date
            }
          },
          transaction: t
        }
      );
    } else if (income.has_installments && update_future) {
      // Atualizar todas as parcelas futuras
      await Income.update(
        {
          description: description.replace(/\s*\(\d+\/\d+\)$/, '') + ` (${income.current_installment}/${income.total_installments})`,
          amount,
          category_id,
          subcategory_id,
          bank_id,
          payment_method
        },
        {
          where: {
            installment_group_id: income.installment_group_id,
            current_installment: {
              [Op.gte]: income.current_installment
            }
          },
          transaction: t
        }
      );
    } else {
      // Atualizar apenas a receita selecionada
      await income.update(
        {
          description,
          amount,
          date,
          category_id,
          subcategory_id,
          bank_id,
          payment_method
        },
        { transaction: t }
      );
    }

    await t.commit();
    res.json({ message: 'Receita atualizada com sucesso' });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ message: error.message });
  }
});

// Excluir receita
router.delete('/:id', async (req, res) => {
  const t = await Income.sequelize.transaction();

  try {
    const { delete_future } = req.query;
    const income = await Income.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!income) {
      throw new Error('Receita não encontrada');
    }

    if (income.is_recurring && delete_future === 'true') {
      // Excluir todas as receitas futuras do mesmo grupo
      await Income.destroy({
        where: {
          recurring_group_id: income.recurring_group_id,
          date: {
            [Op.gte]: income.date
          }
        },
        transaction: t
      });
    } else if (income.has_installments && delete_future === 'true') {
      // Excluir todas as parcelas futuras
      await Income.destroy({
        where: {
          installment_group_id: income.installment_group_id,
          current_installment: {
            [Op.gte]: income.current_installment
          }
        },
        transaction: t
      });
    } else {
      // Excluir apenas a receita selecionada
      await income.destroy({ transaction: t });
    }

    await t.commit();
    res.json({ message: 'Receita excluída com sucesso' });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ message: error.message });
  }
});

// Listar categorias de receita
router.get('/categories', authenticate, async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { type: 'income' },
      include: [{
        model: SubCategory,
        attributes: ['id', 'subcategory_name']
      }],
      order: [
        ['category_name', 'ASC'],
        [SubCategory, 'subcategory_name', 'ASC']
      ]
    });
    res.json(categories);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ message: 'Erro ao buscar categorias' });
  }
});

// Listar subcategorias de uma categoria de receita
router.get('/categories/:categoryId/subcategories', authenticate, async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { 
        id: req.params.categoryId,
        type: 'income'
      }
    });

    if (!category) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }

    const subcategories = await SubCategory.findAll({
      where: { category_id: req.params.categoryId },
      order: [['subcategory_name', 'ASC']]
    });
    res.json(subcategories);
  } catch (error) {
    console.error('Erro ao listar subcategorias:', error);
    res.status(500).json({ message: 'Erro ao buscar subcategorias' });
  }
});

export default router; 