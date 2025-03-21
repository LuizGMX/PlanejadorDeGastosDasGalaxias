import express from 'express';
const router = express.Router();
import { Income, Category, SubCategory, Bank } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { Sequelize } from 'sequelize';

// Listar todas as ganhos do usuário
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

    // Buscar todas as ganhos
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
            tooltip: 'Esta ganho faz parte de um grupo de ganhos recorrentes'
          }
        } : null
      };
    });

    console.log('Total de ganhos encontradas:', incomesWithRecurring.length);
    console.log('Ganhos recorrentes:', incomesWithRecurring.filter(i => i.is_recurring).length);
    console.log('Ganhos não recorrentes:', incomesWithRecurring.filter(i => !i.is_recurring).length);

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
    console.error('Erro ao buscar ganhos:', error);
    res.status(500).json({ message: 'Erro ao buscar ganhos' });
  }
});

// Adicionar nova ganho
router.post('/', authenticate, async (req, res) => {
  const t = await Income.sequelize.transaction();
  try {
    const {
      description,
      amount: rawAmount,
      date,
      is_recurring,
      category_id,
      subcategory_id,
      bank_id,
      start_date,
      end_date
    } = req.body;

    // Validações básicas
    if (!description || !rawAmount || !date || !category_id || !bank_id) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    const parsedAmount = Number(rawAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'O valor do ganho deve ser um número positivo' });
    }

    // Validação da data
    if (isNaN(new Date(date).getTime())) {
      return res.status(400).json({ message: 'Data inválida' });
    }

    // Se for recorrente, define as datas de início e fim
    let incomeData = {
      user_id: req.user.id,
      description,
      amount: parsedAmount,
      date,
      is_recurring,
      recurring_group_id: is_recurring ? uuidv4() : null,
      category_id,
      subcategory_id,
      bank_id
    };

    if (is_recurring) {
      incomeData.start_date = date;
      incomeData.end_date = end_date || '2099-12-31';
    }

    const income = await Income.create(incomeData, { transaction: t });

    await t.commit();
    res.status(201).json(income);
  } catch (error) {
    await t.rollback();
    console.error('Erro ao criar ganho:', error);
    res.status(500).json({ message: 'Erro ao criar ganho' });
  }
});

// Atualizar ganho
router.put('/:id', authenticate, async (req, res) => {
  const t = await Income.sequelize.transaction();

  try {
    const {
      description,
      amount,
      date,
      category_id,
      subcategory_id,
      bank_id,
      start_date,
      end_date
    } = req.body;

    // Validações básicas
    if (!description || !amount || !date || !category_id || !bank_id) {
      return res.status(400).json({ message: 'Campos obrigatórios faltando' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'O valor deve ser maior que zero' });
    }

    const income = await Income.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      transaction: t
    });

    if (!income) {
      return res.status(404).json({ message: 'Ganho não encontrado' });
    }

    if (income.is_recurring) {
      // Validar período máximo de 10 anos para recorrência
      if (start_date && end_date) {
        const startDateObj = new Date(start_date);
        const endDateObj = new Date(end_date);
        const maxDate = new Date(startDateObj);
        maxDate.setFullYear(maxDate.getFullYear() + 10);

        if (endDateObj > maxDate) {
          return res.status(400).json({ message: 'O período de recorrência não pode ser maior que 10 anos' });
        }
      }

      const newStartDate = start_date ? new Date(start_date) : income.start_date;
      const newEndDate = end_date ? new Date(end_date) : income.end_date;
      const oldStartDate = income.start_date;
      const oldEndDate = income.end_date;

      console.log('Atualizando ganho recorrente:', {
        id: income.id,
        old_start_date: oldStartDate,
        old_end_date: oldEndDate,
        new_start_date: newStartDate,
        new_end_date: newEndDate
      });

      // Primeiro, busca todos os ganhos do grupo
      const allGroupIncomes = await Income.findAll({
        where: {
          recurring_group_id: income.recurring_group_id,
          user_id: req.user.id
        },
        order: [['date', 'ASC']],
        transaction: t
      });

      // Atualiza os dados básicos em todos os ganhos existentes
      await Income.update(
        {
          description,
          amount,
          category_id,
          subcategory_id,
          bank_id,
          start_date: newStartDate,
          end_date: newEndDate
        },
        {
          where: {
            recurring_group_id: income.recurring_group_id,
            user_id: req.user.id,
            date: {
              [Op.between]: [oldStartDate, oldEndDate]
            }
          },
          transaction: t
        }
      );

      // Remove ganhos que estão fora do novo período
      await Income.destroy({
        where: {
          recurring_group_id: income.recurring_group_id,
          user_id: req.user.id,
          [Op.or]: [
            {
              date: {
                [Op.lt]: newStartDate
              }
            },
            {
              date: {
                [Op.gt]: newEndDate
              }
            }
          ]
        },
        transaction: t
      });

      // Cria novos ganhos para as novas datas
      let currentDate = new Date(newStartDate);
      currentDate.setDate(newStartDate.getDate()); // Mantém o mesmo dia do mês

      while (currentDate <= newEndDate) {
        // Verifica se já existe um ganho nesta data
        const existingIncome = allGroupIncomes.find(inc => 
          new Date(inc.date).getMonth() === currentDate.getMonth() &&
          new Date(inc.date).getFullYear() === currentDate.getFullYear()
        );

        if (!existingIncome) {
          await Income.create({
            description,
            amount,
            date: new Date(currentDate),
            category_id,
            subcategory_id,
            bank_id,
            user_id: req.user.id,
            is_recurring: true,
            recurring_group_id: income.recurring_group_id,
            start_date: newStartDate,
            end_date: newEndDate
          }, { transaction: t });
        }

        // Avança para o próximo mês
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Busca todos os ganhos atualizados para verificar
      const updatedIncomes = await Income.findAll({
        where: {
          recurring_group_id: income.recurring_group_id,
          user_id: req.user.id
        },
        order: [['date', 'ASC']],
        transaction: t
      });

      console.log('Ganhos atualizados:', updatedIncomes.map(inc => ({
        id: inc.id,
        date: inc.date,
        start_date: inc.start_date,
        end_date: inc.end_date
      })));
    } else if (income.has_installments) {
      // Atualizar todas as parcelas (atual e futuras)
      const currentInstallment = income.current_installment;
      await Income.update(
        {
          description: description.replace(/\(\d+\/\d+\)/, ''),
          amount,
          category_id,
          subcategory_id,
          bank_id
        },
        {
          where: {
            installment_group_id: income.installment_group_id,
            current_installment: {
              [Op.gte]: currentInstallment
            },
            user_id: req.user.id
          },
          transaction: t
        }
      );

      // Atualiza também o ganho atual
      await income.update(
        {
          description: `${description} (${income.current_installment}/${income.total_installments})`,
          amount,
          date,
          category_id,
          subcategory_id,
          bank_id
        },
        { transaction: t }
      );

      // Atualiza a descrição das parcelas com o novo número
      const remainingIncomes = await Income.findAll({
        where: {
          installment_group_id: income.installment_group_id,
          current_installment: {
            [Op.gt]: currentInstallment
          },
          user_id: req.user.id
        },
        order: [['current_installment', 'ASC']],
        transaction: t
      });

      for (const inc of remainingIncomes) {
        await inc.update({
          description: `${description} (${inc.current_installment}/${income.total_installments})`
        }, { transaction: t });
      }
    } else {
      // Atualizar apenas o ganho selecionado
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

    // Busca o ganho atualizado com seus relacionamentos
    const updatedIncome = await Income.findOne({
      where: { id: income.id },
      include: [
        { model: Category },
        { model: SubCategory },
        { model: Bank }
      ]
    });

    res.json({ 
      message: 'Ganho atualizado com sucesso',
      income: updatedIncome
    });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ message: error.message });
  }
});

// Excluir ganhos em lote
router.delete('/bulk', authenticate, async (req, res) => {
  const transaction = await Income.sequelize.transaction();
  console.log('Iniciando deleção em lote');
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Lista de IDs inválida' });
    }

    console.log('IDs para deleção:', ids);

    // Faz uma única chamada para deletar todas as ganhos
    const deletedCount = await Income.destroy({
      where: {
        id: { [Op.in]: ids },
        user_id: req.user.id,
        is_recurring: false
      },
      transaction
    });

    await transaction.commit();
    console.log(`${deletedCount} ganhos deletadas com sucesso`);
    res.json({ 
      message: `${deletedCount} ganho(s) deletada(s) com sucesso`,
      count: deletedCount
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erro na deleção em lote:', error);
    res.status(500).json({ 
      message: 'Erro ao deletar ganhos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Excluir ganho
router.delete('/:id', authenticate, async (req, res) => {
  const t = await Income.sequelize.transaction();

  try {
    const { delete_future, delete_past, delete_all } = req.query;
    const income = await Income.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      transaction: t
    });

    if (!income) {
      return res.status(404).json({ message: 'Ganho não encontrado' });
    }

    if (income.is_recurring) {
      if (delete_all === 'true') {
        // Excluir todas as ganhos do grupo
        await Income.destroy({
          where: {
            recurring_group_id: income.recurring_group_id,
            user_id: req.user.id
          },
          transaction: t
        });
      } else if (delete_future === 'true') {
        // Excluir todas as ganhos futuras do mesmo grupo (incluindo a atual)
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
        // Excluir todas as ganhos passadas do mesmo grupo (incluindo a atual)
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
        // Excluir apenas a ganho selecionada
        await income.destroy({ transaction: t });
      }
    } else {
      // Se não for recorrente, exclui apenas a ganho selecionada
      await income.destroy({ transaction: t });
    }

    await t.commit();
    res.json({ 
      message: 'Ganho excluído com sucesso',
      isRecurring: income.is_recurring 
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: 'Erro ao excluir ganho' });
  }
});

// Listar categorias de ganho
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

// Listar subcategorias de uma categoria de ganho
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

// Rota para excluir ganho fixo
router.delete('/:id/recurring', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteType } = req.body;
    const income = await Income.findByPk(id);

    if (!income) {
      return res.status(404).json({ message: 'Ganho não encontrado' });
    }

    if (income.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let whereClause = {
      user_id: req.user.id,
      recurring_group_id: income.recurring_group_id
    };

    switch (deleteType) {
      case 'all':
        // Não adiciona condição de data - exclui tudo
        break;
      case 'past':
        whereClause.date = {
          [Op.lt]: today
        };
        break;
      case 'future':
        whereClause.date = {
          [Op.gte]: today
        };
        break;
      default:
        return res.status(400).json({ message: 'Tipo de exclusão inválido' });
    }

    await Income.destroy({
      where: whereClause
    });

    res.json({ message: 'Ganho(s) excluído(s) com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir ganho fixo:', error);
    res.status(500).json({ message: 'Erro ao excluir ganho fixo' });
  }
});

// Rota para criar ganho
router.post('/', authenticate, async (req, res) => {
  try {
    const incomeData = {
      ...req.body,
      user_id: req.user.id
    };

    if (incomeData.is_recurring) {
      incomeData.recurring_group_id = uuidv4();
      incomeData.start_date = incomeData.date;
      incomeData.end_date = '2099-12-31';
    }

    const income = await Income.create(incomeData);
    res.status(201).json(income);
  } catch (error) {
    console.error('Erro ao criar ganho:', error);
    res.status(500).json({ message: 'Erro ao criar ganho' });
  }
});

// Rota para atualizar ganho
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const income = await Income.findByPk(id);

    if (!income) {
      return res.status(404).json({ message: 'Ganho não encontrado' });
    }

    if (income.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    const incomeData = {
      ...req.body
    };

    if (incomeData.is_recurring && !income.is_recurring) {
      incomeData.recurring_group_id = uuidv4();
      incomeData.start_date = incomeData.date;
      incomeData.end_date = '2099-12-31';
    }

    await income.update(incomeData);
    res.json(income);
  } catch (error) {
    console.error('Erro ao atualizar ganho:', error);
    res.status(500).json({ message: 'Erro ao atualizar ganho' });
  }
});

export default router; 