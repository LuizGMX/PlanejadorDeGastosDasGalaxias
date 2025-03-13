import express from 'express';
const router = express.Router();
import { Income, Category, SubCategory, Bank } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { Sequelize } from 'sequelize';



// Listar todas as receitas do usuário
router.get('/', authenticate, async (req, res) => {
  try {
    const { months, years, description, category_id, is_recurring } = req.query;
    const where = { user_id: req.user.id };

    // Filtro de meses e anos
    const monthsArray = months ? (Array.isArray(months) ? months : months.split(',').map(Number)) : [];
    const yearsArray = years ? (Array.isArray(years) ? years : years.split(',').map(Number)) : [];

    if (monthsArray.length > 0 || yearsArray.length > 0) {
      where[Op.and] = where[Op.and] || [];

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

    // Filtro de categoria
    if (category_id) {
      where.category_id = category_id;
    }

    // Filtro de recorrência
    if (is_recurring !== undefined) {
      where.is_recurring = is_recurring === 'true';
    }

    console.log('Filtros aplicados:', where);

    // Buscar todas as receitas
    const incomes = await Income.findAll({
      where,
      include: [
        { 
          model: Category,
          attributes: ['id', 'category_name', 'type']
        },
        { 
          model: SubCategory,
          attributes: ['id', 'subcategory_name']
        },
        { 
          model: Bank,
          attributes: ['id', 'name']
        }
      ],
      order: [['date', 'DESC']]
    });

    // Buscar metadados para os filtros
    const [categories, totalRecurring, totalNonRecurring] = await Promise.all([
      Category.findAll({
        where: { type: 'income' },
        attributes: ['id', 'category_name'],
        order: [['category_name', 'ASC']]
      }),
      Income.count({
        where: { 
          user_id: req.user.id,
          is_recurring: true
        }
      }),
      Income.count({
        where: { 
          user_id: req.user.id,
          is_recurring: false
        }
      })
    ]);

    // Adiciona informação de recorrência para o frontend
    const incomesWithRecurring = incomes.map(income => {
      const plainIncome = income.get({ plain: true });
      return {
        ...plainIncome,
        recurring_info: income.is_recurring ? {
          is_recurring: true,
          recurring_group_id: income.recurring_group_id,
          badge: {
            text: 'Recorrente',
            tooltip: 'Esta receita faz parte de um grupo de receitas recorrentes'
          }
        } : null
      };
    });

    console.log('Total de receitas encontradas:', incomesWithRecurring.length);
    console.log('Receitas recorrentes:', incomesWithRecurring.filter(i => i.is_recurring).length);
    console.log('Receitas não recorrentes:', incomesWithRecurring.filter(i => !i.is_recurring).length);

    res.json({
      incomes: incomesWithRecurring,
      metadata: {
        filters: {
          categories: categories.map(c => ({
            id: c.id,
            name: c.category_name
          })),
          recurring: [
            { id: 'true', name: 'Recorrente', count: totalRecurring },
            { id: 'false', name: 'Não Recorrente', count: totalNonRecurring }
          ]
        },
        totals: {
          recurring: totalRecurring,
          nonRecurring: totalNonRecurring
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar receitas:', error);
    res.status(500).json({ message: 'Erro ao buscar receitas' });
  }
});

// Adicionar nova receita
router.post('/', authenticate, async (req, res) => {
  const t = await Income.sequelize.transaction();

  try {
    const {
      description,
      amount,
      date,
      category_id,
      subcategory_id,
      bank_id,
      is_recurring,
      end_date
    } = req.body;

    // Validações básicas
    if (!description || !amount || !date || !category_id || !bank_id) {
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

    const recurring_group_id = is_recurring ? uuidv4() : null;
    let createdIncome;

    if (is_recurring) {
      // Criar receitas recorrentes mensais
      const startDate = new Date(date);
      const endDate = new Date(end_date);
      const currentDate = new Date(startDate);
      const createdIncomes = [];

      while (currentDate <= endDate) {
        const income = await Income.create({
          description,
          amount,
          date: new Date(currentDate),
          category_id,
          subcategory_id,
          bank_id,
          user_id: req.user.id,
          is_recurring,
          recurring_group_id
        }, { transaction: t });

        createdIncomes.push(income);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      createdIncome = createdIncomes[0]; // Pega a primeira receita criada
    } else {
      // Criar receita única
      createdIncome = await Income.create({
        description,
        amount,
        date,
        category_id,
        subcategory_id,
        bank_id,
        user_id: req.user.id,
        is_recurring: false
      }, { transaction: t });
    }

    await t.commit();

    // Busca a receita criada com seus relacionamentos
    const incomeWithRelations = await Income.findOne({
      where: { id: createdIncome.id },
      include: [
        { model: Category },
        { model: SubCategory },
        { model: Bank }
      ]
    });

    res.status(201).json({ 
      message: 'Receita adicionada com sucesso',
      income: incomeWithRelations
    });
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
    if (!description || !amount || !date || !category_id || !bank_id) {
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
          bank_id
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
    } else {
      // Atualizar apenas a receita selecionada
      await income.update(
        {
          description,
          amount,
          date,
          category_id,
          subcategory_id,
          bank_id
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
router.delete('/:id', authenticate, async (req, res) => {
  const t = await Income.sequelize.transaction();

  try {
    const { delete_future, delete_past, delete_all } = req.query;
    const income = await Income.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!income) {
      throw new Error('Receita não encontrada');
    }

    if (income.is_recurring) {
      if (delete_all === 'true') {
        // Excluir todas as receitas do grupo
        await Income.destroy({
          where: {
            recurring_group_id: income.recurring_group_id,
            user_id: req.user.id
          },
          transaction: t
        });
      } else if (delete_future === 'true') {
        // Excluir todas as receitas futuras do mesmo grupo (incluindo a atual)
        await Income.destroy({
          where: {
            recurring_group_id: income.recurring_group_id,
            user_id: req.user.id,
            date: {
              [Op.gte]: income.date
            }
          },
          transaction: t
        });
      } else if (delete_past === 'true') {
        // Excluir todas as receitas passadas do mesmo grupo (incluindo a atual)
        await Income.destroy({
          where: {
            recurring_group_id: income.recurring_group_id,
            user_id: req.user.id,
            date: {
              [Op.lte]: income.date
            }
          },
          transaction: t
        });
      } else {
        // Excluir apenas a receita selecionada
        await income.destroy({ transaction: t });
      }
    } else {
      // Se não for recorrente, exclui apenas a receita selecionada
      await income.destroy({ transaction: t });
    }

    await t.commit();
    res.json({ 
      message: 'Receita excluída com sucesso',
      isRecurring: income.is_recurring 
    });
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
    console.log(categories);
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