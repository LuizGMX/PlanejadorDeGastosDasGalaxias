import express from 'express';
import { Router } from 'express';
import { Income, Category, Bank } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import { Sequelize } from 'sequelize';
import checkSubscription from '../middleware/subscriptionCheck.js';
import moment from 'moment';

const router = Router();

// Todas as rotas usam o middleware de autenticação seguido do middleware de verificação de assinatura
router.use(authenticate);
router.use(checkSubscription);

// Listar todas as receitas do usuário
router.get('/', async (req, res) => {
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
      attributes: [
        'id',
        'description',
        'amount',
        'date',
        'is_recurring',
        'recurring_group_id',
        'recurrence_type'
      ],
      include: [
        { model: Category, as: 'Category' },
        { model: Bank, as: 'bank' }
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
          recurrence_type: income.recurrence_type
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

// Adicionar nova ganho
router.post('/', async (req, res) => {
  const t = await Income.sequelize.transaction();
  try {
    const {
      description,
      amount: rawAmount,
      date,
      is_recurring,
      has_installments,
      total_installments,
      current_installment,
      category_id,
      bank_id,
      start_date,
      end_date,
      recurrence_type
    } = req.body;

    // Validações básicas
    if (!description || !rawAmount || !date || !category_id || !bank_id) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    if (is_recurring && !recurrence_type) {
      await t.rollback();
      return res.status(400).json({ message: 'Para receitas recorrentes, a periodicidade é obrigatória' });
    }

    const parsedAmount = Number(rawAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'O valor do ganho deve ser um número positivo' });
    }

    // Validação e ajuste da data
    const adjustDate = (dateStr) => {
      if (!dateStr) throw new Error('Data inválida');
      
      // Garante que estamos trabalhando com a data local
      const [year, month, day] = dateStr.split('-').map(Number);
      if (!year || !month || !day) throw new Error('Data inválida');
      
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) throw new Error('Data inválida');
      
      return date;
    };

    const incomes = [];
    const recurringGroupId = is_recurring ? uuidv4() : null;

    if (is_recurring) {
      const startDateObj = adjustDate(date);
      const endDateObj = end_date ? adjustDate(end_date) : new Date(startDateObj);
      endDateObj.setFullYear(2099);
      endDateObj.setMonth(11);
      endDateObj.setDate(31);

      let currentDate = new Date(startDateObj);
      let count = 0;
      const maxRecurrences = 500; // Limite de segurança

      while (currentDate <= endDateObj && count < maxRecurrences) {
        incomes.push({
          user_id: req.user.id,
          description,
          amount: parsedAmount,
          date: new Date(currentDate),
          is_recurring: true,
          recurring_group_id: recurringGroupId,
          category_id,
          bank_id,
          start_date: startDateObj,
          end_date: endDateObj,
          recurrence_type
        });

        // Atualiza a data baseado no tipo de recorrência
        const nextDate = new Date(currentDate);
        switch (recurrence_type) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
          case 'semiannual':
            nextDate.setMonth(nextDate.getMonth() + 6);
            break;
          case 'annual':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
          default:
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
        currentDate = nextDate;
        count++;
      }
    } else if (has_installments) {
      // Validações específicas para receitas parceladas
      if (!total_installments || total_installments < 2) {
        await t.rollback();
        return res.status(400).json({ message: 'Para receitas parceladas, o número total de parcelas deve ser maior que 1' });
      }

      const installmentGroupId = uuidv4();
      // Usar o valor da parcela informado pelo usuário diretamente
      // current_installment começa a partir da parcela atual e vai até o total
      const current = current_installment || 1;
      
      // Criar apenas as parcelas restantes
      for (let i = current - 1; i < total_installments; i++) {
        const installmentDate = adjustDate(date);
        // Ajustar data apenas para parcelas futuras em relação à atual
        if (i > current - 1) {
          installmentDate.setMonth(installmentDate.getMonth() + (i - (current - 1)));
        }

        incomes.push({
          user_id: req.user.id,
          description: `${description} (${i + 1}/${total_installments})`,
          amount: parsedAmount, // Usa o valor da parcela diretamente, sem calcular
          category_id,
          bank_id,
          date: installmentDate,
          has_installments: true,
          current_installment: i + 1,
          total_installments,
          installment_group_id: installmentGroupId,
          is_recurring: false
        });
      }
    } else {
      incomes.push({
        user_id: req.user.id,
        description,
        amount: parsedAmount,
        date: adjustDate(date),
        is_recurring: false,
        has_installments: false,
        category_id,
        bank_id
      });
    }

    const createdIncomes = await Income.bulkCreate(incomes, { transaction: t });
    await t.commit();

    return res.status(201).json({
      message: 'Ganho registrado com sucesso',
      incomes: createdIncomes
    });
  } catch (error) {
    // Log do erro para diagnóstico
    console.error(`Erro ao criar ganho: ${error.message}`, error);
    
    // Rollback da transação em caso de erro
    await t.rollback();
    
    return res.status(500).json({
      message: 'Erro ao registrar ganho',
      error: error.message
    });
  }
});

// Atualizar ganho
router.put('/:id', async (req, res) => {
  const t = await Income.sequelize.transaction();

  try {
    const {
      description,
      amount,
      date,
      category_id,
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

      // Primeiro, busca todos os receitas do grupo
      const allGroupIncomes = await Income.findAll({
        where: {
          recurring_group_id: income.recurring_group_id,
          user_id: req.user.id
        },
        order: [['date', 'ASC']],
        transaction: t
      });

      // Atualiza os dados básicos em todos os receitas existentes
      await Income.update(
        {
          description,
          amount,
          category_id,
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

      // Remove receitas que estão fora do novo período
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

      // Cria novos receitas para as novas datas
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

      // Busca todos os receitas atualizados para verificar
      const updatedIncomes = await Income.findAll({
        where: {
          recurring_group_id: income.recurring_group_id,
          user_id: req.user.id
        },
        order: [['date', 'ASC']],
        transaction: t
      });

      console.log('Receitas atualizados:', updatedIncomes.map(inc => ({
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

// Excluir receitas em lote
router.delete('/bulk', async (req, res) => {
  const transaction = await Income.sequelize.transaction();
  console.log('Iniciando deleção em lote');
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Lista de IDs inválida' });
    }

    console.log('IDs para deleção:', ids);

    // Faz uma única chamada para deletar todas as receitas
    const deletedCount = await Income.destroy({
      where: {
        id: { [Op.in]: ids },
        user_id: req.user.id,
        is_recurring: false
      },
      transaction
    });

    await transaction.commit();
    console.log(`${deletedCount} receitas deletadas com sucesso`);
    res.json({ 
      message: `${deletedCount} ganho(s) deletada(s) com sucesso`,
      count: deletedCount
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erro na deleção em lote:', error);
    res.status(500).json({ 
      message: 'Erro ao deletar receitas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Excluir ganho
router.delete('/:id', async (req, res) => {
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
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { type: 'income' },
      order: [
        ['category_name', 'ASC']
      ]
    });
    console.log(categories);
    res.json(categories);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ message: 'Erro ao buscar categorias' });
  }
});

// Rota para excluir ganho fixo
router.delete('/:id/recurring', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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

// Rota para buscar um único ganho
router.get('/:id', async (req, res) => {
  try {
    const income = await Income.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      include: [
        { 
          model: Category,
          as: 'Category'
        },
        { 
          model: Bank,
          as: 'bank'
        }
      ]
    });

    if (!income) {
      return res.status(404).json({ message: 'Ganho não encontrado' });
    }

    res.json(income);
  } catch (error) {
    console.error('Erro ao buscar ganho:', error);
    res.status(500).json({ message: 'Erro ao buscar ganho' });
  }
});

export default router; 