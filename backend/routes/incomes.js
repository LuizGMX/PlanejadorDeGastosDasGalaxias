import express from 'express';
import { Router } from 'express';
import { Income, Category, Bank, IncomesRecurrenceException } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Op, Sequelize } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import checkSubscription from '../middleware/subscriptionCheck.js';
import moment from 'moment';
import { calculateRecurringOccurrences, getNextRecurringDate } from '../utils/recurrenceUtils.js';

const router = Router();

// Todas as rotas usam o middleware de autenticação seguido do middleware de verificação de assinatura
router.use(authenticate);
router.use(checkSubscription);

// Função para calcular ocorrências de receitas recorrentes
const calculateRecurringIncomeOccurrences = async (income, startDate, endDate) => {
  return calculateRecurringOccurrences(income, startDate, endDate, 'date');
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
      endDate,
      include_all_recurring 
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
    if (is_recurring !== undefined && include_all_recurring !== 'true') {
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
    if ((startDate && endDate && is_recurring !== 'false') || include_all_recurring === 'true') {
      // Define o período para buscar ocorrências recorrentes
      let start, end;
      
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else if (months && months.length > 0 && years && years.length > 0) {
        // Se não temos startDate/endDate, usamos os meses e anos do filtro
        const monthsArray = Array.isArray(months) ? months.map(Number) : months.split(',').map(Number);
        const yearsArray = Array.isArray(years) ? years.map(Number) : years.split(',').map(Number);
        
        // Pega o primeiro mês e ano como início
        const minMonth = Math.min(...monthsArray);
        const minYear = Math.min(...yearsArray);
        start = new Date(minYear, minMonth - 1, 1); // Primeiro dia do mês
        
        // Pega o último mês e ano como fim
        const maxMonth = Math.max(...monthsArray);
        const maxYear = Math.max(...yearsArray);
        // Último dia do mês
        const lastDay = new Date(maxYear, maxMonth, 0).getDate();
        end = new Date(maxYear, maxMonth - 1, lastDay, 23, 59, 59);
      } else {
        // Se não há filtros específicos, usa o mês atual
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        start = new Date(currentYear, currentMonth, 1); // Primeiro dia do mês atual
        end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59); // Último dia do mês atual
      }

      // Busca receitas recorrentes que podem ter ocorrências no período
      const recurringWhere = {
        user_id: req.user.id,
        is_recurring: true
      };

      // Adicionar filtro de descrição para receitas recorrentes, se fornecido
      if (description) {
        recurringWhere.description = {
          [Op.like]: `%${description}%`
        };
      }

      // Adicionar filtro de categoria para receitas recorrentes, se fornecido
      if (category_id) {
        recurringWhere.category_id = category_id;
      }

      // Adicionar filtro de banco para receitas recorrentes, se fornecido
      if (req.query.bank_id) {
        recurringWhere.bank_id = req.query.bank_id;
      }

      // Adicionar filtro de valor mínimo, se fornecido
      if (min_amount) {
        recurringWhere.amount = recurringWhere.amount || {};
        recurringWhere.amount[Op.gte] = min_amount;
      }

      // Adicionar filtro de valor máximo, se fornecido
      if (max_amount) {
        recurringWhere.amount = recurringWhere.amount || {};
        recurringWhere.amount[Op.lte] = max_amount;
      }

      const recurringIncomes = await Income.findAll({
        where: recurringWhere,
        include: [
          { model: Category, as: 'Category' },
          { model: Bank, as: 'bank' },
          { model: IncomesRecurrenceException, as: 'exceptions' }
        ]
      });

      console.log(`Gerando ocorrências recorrentes para ${recurringIncomes.length} receitas no período de ${start.toISOString()} a ${end.toISOString()}`);

      // Para cada receita recorrente, calcular as ocorrências no período
      for (const income of recurringIncomes) {
        const occurrences = await calculateRecurringIncomeOccurrences(income, start, end);
        
        // Adiciona marcador para identificar que esta é uma ocorrência gerada
        const markedOccurrences = occurrences.map(occurrence => ({
          ...occurrence,
          isRecurringOccurrence: true,
          original_id: income.id,
          // Garantir que informações importantes são preservadas
          description: occurrence.originalDescription || income.description,
          amount: occurrence.originalAmount || income.amount,
          category_id: income.category_id,
          Category: income.Category,
          bank_id: income.bank_id,
          bank: income.bank
        }));
        
        if (markedOccurrences.length > 0) {
          console.log(`Geradas ${markedOccurrences.length} ocorrências para receita ID ${income.id} - ${income.description}`);
        }
        
        expandedRecurringIncomes = [...expandedRecurringIncomes, ...markedOccurrences];
      }
    }

    // Combina receitas normais e recorrentes expandidas
    let allIncomes = [...incomes, ...expandedRecurringIncomes];

    // Aplicamos filtros de mês e ano nas ocorrências recorrentes expandidas
    if (months && months.length > 0 && years && years.length > 0) {
      const monthsArray = Array.isArray(months) ? months.map(Number) : months.split(',').map(Number);
      const yearsArray = Array.isArray(years) ? years.map(Number) : years.split(',').map(Number);
      
      allIncomes = allIncomes.filter(income => {
        const incomeDate = new Date(income.date);
        const incomeMonth = incomeDate.getMonth() + 1; // getMonth é base 0
        const incomeYear = incomeDate.getFullYear();
        
        return monthsArray.includes(incomeMonth) && yearsArray.includes(incomeYear);
      });
    }

    // Remove duplicatas e filtra receitas recorrentes
    const existingDates = new Set();
    const uniqueIncomes = allIncomes.filter(income => {
      const incomeId = String(income.id);
      
      // Se é uma ocorrência recorrente (começa com rec_), verificamos se já temos uma ocorrência
      // real para a mesma data
      if (incomeId.startsWith('rec_')) {
        const dateStr = new Date(income.date).toISOString().split('T')[0];
        const key = `${income.original_id}_${dateStr}`;
        
        if (existingDates.has(key)) {
          return false;
        }
        
        existingDates.add(key);
        return true;
      }
      
      // Para receitas reais recorrentes, adicionamos à lista de datas existentes
      if (income.is_recurring) {
        const dateStr = new Date(income.date).toISOString().split('T')[0];
        existingDates.add(`${income.id}_${dateStr}`);
      }
      
      return true;
    });
    
    // Ordena as receitas por data
    uniqueIncomes.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    console.log(`Retornando um total de ${uniqueIncomes.length} receitas, incluindo ocorrências recorrentes`);
    
    res.json(uniqueIncomes);
  } catch (error) {
    console.error('Erro ao buscar receitas:', error);
    res.status(500).json({ message: 'Erro ao buscar receitas', error: error.message });
  }
});

// Rota para buscar uma única receita
router.get('/:id', async (req, res) => {
  try {
    const income = await Income.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!income) {
      return res.status(404).json({ message: 'Receita não encontrada' });
    }

    res.json(income);
  } catch (error) {
    console.error('Erro ao buscar receita:', error);
    res.status(500).json({ message: 'Erro ao buscar receita' });
  }
});

// Adicionar nova receita
router.post('/', async (req, res) => {
  const t = await Income.sequelize.transaction();
  try {
    const {
      description,
      amount: rawAmount,
      category_id,
      income_date,
      bank_id,
      payment_method,
      is_recurring,
      recurrence_type
    } = req.body;

    // Validações básicas
    if (!description || !rawAmount || !category_id || !bank_id || !payment_method) {
      await t.rollback();
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    // Validação de recorrência
    if (is_recurring && !recurrence_type) {
      await t.rollback();
      return res.status(400).json({ message: 'Para receitas recorrentes, a periodicidade é obrigatória' });
    }

    const parsedAmount = Number(rawAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'O valor da receita deve ser um número positivo' });
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

    // Validação da data
    if (!income_date || isNaN(new Date(income_date).getTime())) {
      await t.rollback();
      return res.status(400).json({ message: 'Data da receita inválida' });
    }

    const incomes = [];
    const recurringGroupId = is_recurring ? uuidv4() : null;

    // Processamento com base no tipo de receita
    if (is_recurring) {
      // Criar a receita recorrente - apenas um registro
      const startDateObj = adjustDate(income_date);
      const endDateObj = new Date('2099-12-31'); // Data padrão de fim distante
      
      // Cria um único registro para a receita recorrente com seus metadados
      incomes.push({
        user_id: req.user.id,
        description,
        amount: parsedAmount,
        category_id,
        bank_id,
        income_date: startDateObj,
        payment_method,
        is_recurring: true,
        recurring_group_id: recurringGroupId,
        start_date: startDateObj,
        end_date: endDateObj,
        recurrence_type
      });
    } else {
      // Receita única simples
      incomes.push({
        user_id: req.user.id,
        description,
        amount: parsedAmount,
        category_id,
        bank_id,
        income_date: adjustDate(income_date),
        payment_method,
        is_recurring: false
      });
    }

    const createdIncomes = await Income.bulkCreate(incomes, { transaction: t });
    await t.commit();

    res.status(201).json(createdIncomes);
  } catch (error) {
    await t.rollback();
    console.error('Erro ao criar receita:', error);
    res.status(500).json({ message: 'Erro ao criar receita' });
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
    console.log('Buscando categorias...');
    const categories = await Category.findAll({
      where: { type: 'income' },
      order: [
        [literal("category_name = 'Outros' ASC")],
        ['category_name', 'ASC']
      ]
    });
    console.log('Categorias encontradas:', categories);
    res.json(categories);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ message: 'Erro ao buscar categorias' });
  }
});

export default router; 