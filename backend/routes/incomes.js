import express from 'express';
import { Router } from 'express';
import { Income, Category, Bank, IncomesRecurrenceException } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op, Sequelize } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import checkSubscription from '../middleware/subscriptionCheck.js';
import moment from 'moment';

const router = Router();

// Todas as rotas usam o middleware de autenticação seguido do middleware de verificação de assinatura
router.use(authenticate);
router.use(checkSubscription);

// Função para calcular ocorrências de receitas recorrentes
const calculateRecurringIncomeOccurrences = async (income, startDate, endDate) => {
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

// Listar todas as receitas do usuário
router.get('/', async (req, res) => {
  try {
    const { 
      months, 
      years, 
      description, 
      category_id,
      min_amount,
      max_amount,
      is_recurring,
      startDate,
      endDate 
    } = req.query;
    
    const where = { user_id: req.user.id };
    
    // Inicializa a condição AND para combinar todos os filtros
    where[Op.and] = where[Op.and] || [];

    // Filtro de intervalo de data
    if (startDate && endDate) {
      where[Op.and].push({
        date: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      });
    } else {
      // Filtro de meses e anos
      const monthsArray = months ? (Array.isArray(months) ? months : months.split(',').map(Number)) : [];
      const yearsArray = years ? (Array.isArray(years) ? years : years.split(',').map(Number)) : [];

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
      where[Op.and].push({
        description: {
          [Op.like]: `%${description}%`
        }
      });
    }

    // Filtro de categoria
    if (category_id) {
      where[Op.and].push({
        category_id: category_id
      });
    }

    // Filtro de valor mínimo
    if (min_amount) {
      where[Op.and].push({
        amount: {
          [Op.gte]: min_amount
        }
      });
    }

    // Filtro de valor máximo
    if (max_amount) {
      where[Op.and].push({
        amount: {
          [Op.lte]: max_amount
        }
      });
    }

    // Filtro de recorrência
    if (is_recurring !== undefined) {
      where[Op.and].push({
        is_recurring: is_recurring === 'true'
      });
    }
    
    // Remove a condição AND se estiver vazia
    if (where[Op.and].length === 0) {
      delete where[Op.and];
    }

    const incomes = await Income.findAll({
      where,
      include: [
        { model: Category, as: 'Category' },
        { model: Bank, as: 'bank' }
      ],
      order: [['date', 'DESC']]
    });

    // Se está buscando por intervalo de data e precisamos incluir receitas recorrentes
    let expandedRecurringIncomes = [];
    if (startDate && endDate && is_recurring !== 'false') {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Busca receitas recorrentes que podem ter ocorrências no período
      const recurringIncomes = await Income.findAll({
        where: {
          user_id: req.user.id,
          is_recurring: true,
          start_date: {
            [Op.lte]: end
          },
          [Op.or]: [
            { end_date: null },
            { end_date: { [Op.gte]: start } }
          ]
        },
        include: [
          { model: Category, as: 'Category' },
          { model: Bank, as: 'bank' },
          { model: IncomesRecurrenceException, as: 'exceptions' }
        ]
      });

      // Para cada receita recorrente, calcular as ocorrências no período
      for (const income of recurringIncomes) {
        const occurrences = await calculateRecurringIncomeOccurrences(income, start, end);
        expandedRecurringIncomes = [...expandedRecurringIncomes, ...occurrences];
      }
    }

    // Combina receitas normais e recorrentes expandidas
    const allIncomes = [...incomes, ...expandedRecurringIncomes];
    
    res.json(allIncomes);
  } catch (error) {
    console.error('Erro ao buscar receitas:', error);
    res.status(500).json({ message: 'Erro ao buscar receitas', error: error.message });
  }
});

// Adicionar nova receita
router.post('/', async (req, res) => {
  const t = await Income.sequelize.transaction();
  try {
    const {
      description,
      amount: rawAmount,
      date,
      is_recurring,     
      category_id,
      bank_id,
      recurrence_type,
      end_date
    } = req.body;

    // Validações básicas
    if (!description || !rawAmount || !date || !category_id || !bank_id) {
      await t.rollback();
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
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
      if (!year || !month || !day) throw new Error('Data inválida');
      
      // Cria a data no fuso horário local
      const date = new Date(year, month - 1, day, 12, 0, 0);
      if (isNaN(date.getTime())) throw new Error('Data inválida');
      
      return date;
    };

    // Receita a ser criada
    let incomeData;
    const recurringGroupId = is_recurring ? uuidv4() : null;

    if (is_recurring) {
      const startDateObj = adjustDate(date);
      const endDateObj = end_date ? adjustDate(end_date) : new Date('2099-12-31');

      // Criar a regra de recorrência
      const recurrenceRule = {
        user_id: req.user.id,
        recurrence_type: recurrence_type,
        category_id: category_id,
        bank_id: bank_id,
        start_date: startDateObj,
        end_date: endDateObj
      };

      incomeData = {
        user_id: req.user.id,
        description,
        amount: parsedAmount,
        date: startDateObj, // Data de início como data da receita
        is_recurring: true,
        recurring_group_id: recurringGroupId,
        category_id,
        bank_id,
        start_date: startDateObj,
        end_date: endDateObj,
        recurrence_type
      };
    } else {
      incomeData = {
        user_id: req.user.id,
        description,
        amount: parsedAmount,
        date: adjustDate(date),
        is_recurring: false,
        category_id,
        bank_id
      };
    }

    const createdIncome = await Income.create(incomeData, { transaction: t });
    await t.commit();

    res.status(201).json(createdIncome);
  } catch (error) {
    await t.rollback();
    console.error('Erro ao criar receita:', error);
    res.status(500).json({ message: 'Erro ao criar receita', error: error.message });
  }
});

// Rota para excluir receita fixa (uma ocorrência específica)
router.post('/:id/exclude-occurrence', async (req, res) => {
  try {
    const { id } = req.params;
    const { occurrence_date, reason } = req.body;
    
    // Busca a receita recorrente
    const income = await Income.findOne({
      where: { 
        id, 
        user_id: req.user.id,
        is_recurring: true
      }
    });

    if (!income) {
      return res.status(404).json({ message: 'Receita recorrente não encontrada' });
    }

    // Cria uma exceção para esta ocorrência específica
    await IncomesRecurrenceException.create({
      user_id: req.user.id,
      income_id: income.id,
      recurrence_id: income.recurrence_id,
      exception_date: new Date(occurrence_date),
      exception_type: 'SKIP',
      reason: reason || 'Ocorrência excluída pelo usuário'
    });

    res.status(201).json({ message: 'Ocorrência excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir ocorrência:', error);
    res.status(500).json({ message: 'Erro ao excluir ocorrência' });
  }
});

// Rota para excluir todas as ocorrências futuras de uma receita recorrente
router.delete('/:id/future-occurrences', async (req, res) => {
  try {
    const { id } = req.params;
    const { from_date } = req.body;
    
    // Busca a receita recorrente
    const income = await Income.findOne({
      where: { 
        id, 
        user_id: req.user.id,
        is_recurring: true
      }
    });

    if (!income) {
      return res.status(404).json({ message: 'Receita recorrente não encontrada' });
    }

    // Atualiza a data de término para a data anterior à data especificada
    const newEndDate = new Date(from_date);
    newEndDate.setDate(newEndDate.getDate() - 1);

    await income.update({
      end_date: newEndDate
    });

    res.json({ message: 'Ocorrências futuras excluídas com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir ocorrências futuras:', error);
    res.status(500).json({ message: 'Erro ao excluir ocorrências futuras' });
  }
});

// Rota para excluir completamente uma receita recorrente
router.delete('/:id/recurring', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Busca a receita recorrente
    const income = await Income.findOne({
      where: { 
        id, 
        user_id: req.user.id,
        is_recurring: true
      }
    });

    if (!income) {
      return res.status(404).json({ message: 'Receita recorrente não encontrada' });
    }

    // Exclui todas as exceções associadas
    await IncomesRecurrenceException.destroy({
      where: {
        income_id: income.id,
        user_id: req.user.id
      }
    });

    // Exclui a receita recorrente
    await income.destroy();

    res.json({ message: 'Receita recorrente excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir receita recorrente:', error);
    res.status(500).json({ message: 'Erro ao excluir receita recorrente' });
  }
});

// Excluir ganho
router.delete('/:id', async (req, res) => {
  const t = await Income.sequelize.transaction();

  try {
    const income = await Income.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      transaction: t
    });

    if (!income) {
      await t.rollback();
      return res.status(404).json({ message: 'Receita não encontrada' });
    }

    // Se for receita recorrente, redireciona para a rota específica
    if (income.is_recurring) {
      await t.rollback();
      return res.status(400).json({ 
        message: 'Para excluir receita recorrente, use o endpoint específico',
        redirectTo: '/incomes/:id/recurring'
      });
    }

    // Excluir apenas a receita selecionada
    await income.destroy({ transaction: t });

    await t.commit();
    res.json({ message: 'Receita excluída com sucesso' });
  } catch (error) {
    await t.rollback();
    console.error('Erro ao excluir receita:', error);
    res.status(500).json({ message: 'Erro ao excluir receita' });
  }
});

// Atualizar receita
router.put('/:id', async (req, res) => {
  const t = await Income.sequelize.transaction();

  try {
    const {
      description,
      amount: rawAmount,
      date,
      category_id,
      bank_id,
      is_recurring,
      recurrence_type,
      start_date,
      end_date
    } = req.body;

    const income = await Income.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      transaction: t
    });

    if (!income) {
      await t.rollback();
      return res.status(404).json({ message: 'Receita não encontrada' });
    }

    const parsedAmount = Number(rawAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'O valor deve ser um número positivo' });
    }

    // Se for uma receita recorrente
    if (income.is_recurring) {
      await income.update({
        description,
        amount: parsedAmount,
        category_id,
        bank_id,
        start_date: start_date ? new Date(start_date) : income.start_date,
        end_date: end_date ? new Date(end_date) : income.end_date,
        recurrence_type: recurrence_type || income.recurrence_type
      }, { transaction: t });
    } else {
      await income.update({
        description,
        amount: parsedAmount,
        date: new Date(date),
        category_id,
        bank_id
      }, { transaction: t });
    }

    await t.commit();
    
    // Busca a receita atualizada
    const updatedIncome = await Income.findByPk(req.params.id);
    res.json(updatedIncome);
  } catch (error) {
    await t.rollback();
    console.error('Erro ao atualizar receita:', error);
    res.status(500).json({ message: 'Erro ao atualizar receita', error: error.message });
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

export default router; 