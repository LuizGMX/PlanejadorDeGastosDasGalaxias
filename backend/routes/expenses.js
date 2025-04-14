import express from 'express';
import { Expense, Category, Bank, ExpensesRecurrenceException } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize';
import { literal } from 'sequelize';
import { Router } from 'express';
import sequelize from '../config/db.js';
import checkSubscription from '../middleware/subscriptionCheck.js';

const router = Router();

// Todas as rotas usam o middleware de autenticação seguido do middleware de verificação de assinatura
router.use(authenticate);
router.use(checkSubscription);

// Função para calcular ocorrências de despesas recorrentes
const calculateRecurringExpenseOccurrences = async (expense, startDate, endDate) => {
  const occurrences = [];
  const recurrenceType = expense.recurrence_type;
  const startDateObj = new Date(expense.start_date);
  const endDateObj = expense.end_date ? new Date(expense.end_date) : new Date('2099-12-31');
  
  // Se a data de início da recorrência é posterior ao período ou a data de fim é anterior, retorna vazio
  if (startDateObj > endDate || endDateObj < startDate) {
    return [];
  }

  let currentDate = new Date(Math.max(startDateObj, startDate));
  
  // Mapeia exceções para verificar datas a serem puladas
  const exceptionDates = new Set(expense.exceptions.map(ex => 
    new Date(ex.exception_date).toISOString().split('T')[0]
  ));

  while (currentDate <= endDate && currentDate <= endDateObj) {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    // Verifica se esta data não é uma exceção
    if (!exceptionDates.has(dateKey)) {
      occurrences.push({
        ...expense.toJSON(),
        id: `rec_${expense.id}_${currentDate.getTime()}`,
        expense_date: new Date(currentDate),
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

router.get('/', async (req, res) => {
  try {
    const { 
      months, 
      years, 
      description, 
      category_id, 
      min_amount, 
      max_amount, 
      payment_method,
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
        expense_date: {
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
            Sequelize.fn('MONTH', Sequelize.col('expense_date')),
            { [Op.in]: monthsArray }
          )
        );
      }

      if (yearsArray.length > 0) {
        where[Op.and].push(
          Sequelize.where(
            Sequelize.fn('YEAR', Sequelize.col('expense_date')),
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

    // Filtro de método de pagamento
    if (payment_method) {
      where[Op.and].push({
        payment_method: payment_method
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
    
    const expenses = await Expense.findAll({
      where,
      include: [
        { model: Category, as: 'Category' },
        { model: Bank, as: 'bank' }
      ],
      order: [['expense_date', 'DESC']]
    });

    // Se está buscando por intervalo de data e precisamos incluir despesas recorrentes
    let expandedRecurringExpenses = [];
    if (startDate && endDate && is_recurring !== 'false') {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Busca despesas recorrentes que podem ter ocorrências no período
      const recurringExpenses = await Expense.findAll({
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
          { model: ExpensesRecurrenceException, as: 'exceptions' }
        ]
      });

      // Para cada despesa recorrente, calcular as ocorrências no período
      for (const expense of recurringExpenses) {
        const occurrences = await calculateRecurringExpenseOccurrences(expense, start, end);
        expandedRecurringExpenses = [...expandedRecurringExpenses, ...occurrences];
      }
    }

    // Combina despesas normais e recorrentes expandidas
    const allExpenses = [...expenses, ...expandedRecurringExpenses];
    
    res.json(allExpenses);
  } catch (error) {
    console.error('Erro ao buscar despesas:', error);
    res.status(500).json({ message: 'Erro ao buscar despesas', error: error.message });
  }
});

router.post('/', async (req, res) => {
  const t = await Expense.sequelize.transaction();
  try {
    const {
      description,
      amount: rawAmount,
      category_id,
      bank_id,
      expense_date,
      payment_method,
      has_installments,
      total_installments,
      is_recurring,
      is_in_cash,
      recurrence_type
    } = req.body;

    // Validações básicas
    if (!description || !rawAmount || !category_id || !bank_id || !payment_method) {
      await t.rollback();
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    if (has_installments && (!total_installments || total_installments < 2)) {
      await t.rollback();
      return res.status(400).json({ message: 'Para despesas parceladas, o número de parcelas deve ser maior que 1' });
    }

    if (is_recurring && !recurrence_type) {
      await t.rollback();
      return res.status(400).json({ message: 'Para despesas recorrentes, a periodicidade é obrigatória' });
    }

    const parsedAmount = Number(rawAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'O valor da despesa deve ser um número positivo' });
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
    if (!expense_date || isNaN(new Date(expense_date).getTime())) {
      await t.rollback();
      return res.status(400).json({ message: 'Data da despesa inválida' });
    }

    // Validação do tipo de pagamento
    if (!is_recurring && !has_installments && !is_in_cash) {
      return res.status(400).json({
        error: 'Selecione uma forma de pagamento: Fixo, Parcelado ou À Vista'
      });
    }

    const expenses = [];
    const recurringGroupId = is_recurring ? uuidv4() : null;

    if (has_installments) {
      const installmentGroupId = uuidv4();
      // Usar o valor da parcela informado pelo usuário diretamente
      // current_installment começa a partir da parcela atual e vai até o total
      const current = req.body.current_installment || 1;
      
      // Criar apenas as parcelas restantes
      for (let i = current - 1; i < total_installments; i++) {
        const installmentDate = adjustDate(expense_date);
        // Ajustar data apenas para parcelas futuras em relação à atual
        if (i > current - 1) {
          installmentDate.setMonth(installmentDate.getMonth() + (i - (current - 1)));
        }

        expenses.push({
          user_id: req.user.id,
          description: `${description} (${i + 1}/${total_installments})`,
          amount: parsedAmount, // Usa o valor da parcela diretamente, sem calcular
          category_id,
          bank_id,
          expense_date: installmentDate,
          payment_method,
          has_installments: true,
          current_installment: i + 1,
          total_installments,
          installment_group_id: installmentGroupId,
          is_recurring: false
        });
      }
    } else if (is_recurring) {
      // Criar uma única despesa recorrente
      const startDateObj = adjustDate(expense_date);
      const endDateObj = new Date('2099-12-31'); // Data padrão de fim distante

      // Criar a regra de recorrência
      const recurrenceRule = {
        user_id: req.user.id,
        recurrence_type: recurrence_type,
        category_id: category_id,
        bank_id: bank_id,
        start_date: startDateObj,
        end_date: endDateObj
      };

      // Criar a despesa única com vinculação à recorrência
      expenses.push({
        user_id: req.user.id,
        description,
        amount: parsedAmount,
        category_id,
        bank_id,
        expense_date: startDateObj,
        payment_method,
        has_installments: false,
        is_recurring: true,
        recurring_group_id: recurringGroupId,
        start_date: startDateObj,
        end_date: endDateObj,
        recurrence_type
      });
    } else {
      expenses.push({
        user_id: req.user.id,
        description,
        amount: parsedAmount,
        category_id,
        bank_id,
        expense_date: adjustDate(expense_date),
        payment_method,
        has_installments: false,
        is_recurring: false,
        is_in_cash
      });
    }

    const createdExpenses = await Expense.bulkCreate(expenses, { transaction: t });
    await t.commit();

    res.status(201).json(createdExpenses);
  } catch (error) {
    await t.rollback();
    console.error('Erro ao criar despesa:', error);
    res.status(500).json({ message: 'Erro ao criar despesa' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    console.log('Buscando categorias...');
    const categories = await Category.findAll({
      where: { type: 'expense' },
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

router.put('/:id', async (req, res) => {
  const transaction = await Expense.sequelize.transaction();

  try {
    const {
      description,
      amount: rawAmount,
      expense_date,
      category_id,
      bank_id,
      payment_method,
      is_recurring,
      has_installments,
      start_date,
      end_date,
      total_installments,
      current_installment
    } = req.body;

    // Validação dos campos obrigatórios
    if (!description || !rawAmount || !expense_date || !category_id || !bank_id || !payment_method) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    // Converte o valor para número
    const parsedAmount = parseFloat(rawAmount);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({ message: 'O valor deve ser um número válido.' });
    }

    // Busca a despesa original
    const expense = await Expense.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Despesa não encontrada.' });
    }

    // Se a despesa for recorrente
    if (expense.is_recurring && expense.recurring_group_id) {
      // Atualiza todas as despesas do grupo (atual e futuras)
      const currentDate = new Date(expense.expense_date);
      await Expense.update(
        {
          description,
          amount: parsedAmount,
          category_id,
          bank_id,
          payment_method,
          is_recurring,
          start_date: start_date ? new Date(start_date) : null,
          end_date: end_date ? new Date(end_date) : null
        },
        {
          where: {
            recurring_group_id: expense.recurring_group_id,
            expense_date: {
              [Op.gte]: currentDate
            },
            user_id: req.user.id
          },
          transaction
        }
      );
    }
    // Se a despesa for parcelada
    else if (expense.has_installments && expense.installment_group_id) {
      // Atualiza todas as parcelas futuras
      const currentDate = new Date(expense.expense_date);
      await Expense.update(
        {
          description,
          amount: parsedAmount,
          category_id,
          bank_id,
          payment_method
        },
        {
          where: {
            installment_group_id: expense.installment_group_id,
            expense_date: {
              [Op.gte]: currentDate
            },
            user_id: req.user.id
          },
          transaction
        }
      );
    }
    // Se for uma despesa única
    else {
      await expense.update(
        {
          description,
          amount: parsedAmount,
          expense_date: new Date(expense_date),
          category_id,
          bank_id,
          payment_method
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Busca a despesa atualizada
    const updatedExpense = await Expense.findByPk(req.params.id);
    res.json(updatedExpense);
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao atualizar despesa:', error);
    res.status(500).json({ message: 'Erro ao atualizar despesa.' });
  }
});

router.delete('/installments', async (req, res) => {
  const transaction = await Expense.sequelize.transaction();

  try {
    const { installmentGroupId, deleteType, currentInstallment } = req.body;

    if (!installmentGroupId || !deleteType || !currentInstallment) {
      return res.status(400).json({ message: 'Parâmetros inválidos' });
    }

    // Busca todas as parcelas do grupo
    const expenses = await Expense.findAll({
      where: {
        installment_group_id: installmentGroupId,
        user_id: req.user.id
      },
      order: [['current_installment', 'ASC']],
      transaction
    });

    if (!expenses.length) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Parcelas não encontradas' });
    }

    // Define quais parcelas serão excluídas baseado no tipo de exclusão
    let expensesToDelete;
    switch (deleteType) {
      case 'single':
        expensesToDelete = expenses.filter(e => e.current_installment === currentInstallment);
        break;
      case 'forward':
        expensesToDelete = expenses.filter(e => e.current_installment >= currentInstallment);
        break;
      case 'backward':
        expensesToDelete = expenses.filter(e => e.current_installment <= currentInstallment);
        break;
      case 'all':
        expensesToDelete = expenses;
        break;
      default:
        await transaction.rollback();
        return res.status(400).json({ message: 'Tipo de exclusão inválido' });
    }

    // Exclui as parcelas selecionadas
    await Expense.destroy({
      where: {
        id: expensesToDelete.map(e => e.id),
        user_id: req.user.id
      },
      transaction
    });

    // Se todas as parcelas foram excluídas, não precisa atualizar as restantes
    if (deleteType === 'all') {
      await transaction.commit();
      return res.json({ 
        message: 'Todas as parcelas foram excluídas com sucesso',
        count: expensesToDelete.length
      });
    }

    // Atualiza a descrição e o total de parcelas das parcelas restantes
    const remainingExpenses = expenses.filter(e => !expensesToDelete.find(d => d.id === e.id));
    if (remainingExpenses.length > 0) {
      const newTotal = remainingExpenses.length;
      for (let i = 0; i < remainingExpenses.length; i++) {
        const expense = remainingExpenses[i];
        await expense.update({
          current_installment: i + 1,
          total_installments: newTotal,
          description: expense.description.replace(/\(\d+\/\d+\)/, `(${i + 1}/${newTotal})`)
        }, { transaction });
      }
    }

    await transaction.commit();
    res.json({ 
      message: 'Parcelas excluídas com sucesso',
      count: expensesToDelete.length
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao excluir parcelas:', error);
    res.status(500).json({ message: 'Erro ao excluir parcelas' });
  }
});

router.delete('/bulk', async (req, res) => {
  const transaction = await Expense.sequelize.transaction();
  
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Lista de IDs inválida' });
    }

    // Faz uma única chamada para deletar todas as despesas
    const deletedCount = await Expense.destroy({
      where: {
        id: { [Op.in]: ids },
        user_id: req.user.id
      },
      transaction
    });

    await transaction.commit();
    res.json({ 
      message: `${deletedCount} despesa(s) deletada(s) com sucesso`,
      count: deletedCount
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erro na deleção em lote:', error);
    res.status(500).json({ 
      message: 'Erro ao deletar despesas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rota para buscar uma única despesa
router.get('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      include: [
        { model: Category, as: 'Category' },
        { model: Bank, as: 'bank' }
      ]
    });

    if (!expense) {
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Erro ao buscar despesa:', error);
    res.status(500).json({ message: 'Erro ao buscar despesa' });
  }
});

// Rota para excluir uma única despesa (deve vir por último)
router.delete('/:id', async (req, res) => {
  const transaction = await Expense.sequelize.transaction();

  try {
    const expense = await Expense.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }

    // Se a despesa for recorrente, verifica as opções de deleção
    if (expense.is_recurring && expense.recurring_group_id) {
      const { delete_future, delete_past, delete_all, delete_single } = req.query;
      
      if (delete_all === 'true') {
        // Exclui todas as despesas do grupo
        await Expense.destroy({
          where: {
            recurring_group_id: expense.recurring_group_id,
            user_id: req.user.id
          },
          transaction
        });
      } else if (delete_future === 'true') {
        // Exclui todas as despesas futuras do mesmo grupo (incluindo a atual)
        const currentDate = new Date(expense.expense_date);
        await Expense.destroy({
          where: {
            recurring_group_id: expense.recurring_group_id,
            expense_date: {
              [Op.gte]: currentDate
            },
            user_id: req.user.id
          },
          transaction
        });
      } else if (delete_past === 'true') {
        // Exclui todas as despesas passadas do mesmo grupo (incluindo a atual)
        const currentDate = new Date(expense.expense_date);
        await Expense.destroy({
          where: {
            recurring_group_id: expense.recurring_group_id,
            expense_date: {
              [Op.lte]: currentDate
            },
            user_id: req.user.id
          },
          transaction
        });
      } else {
        // Exclui apenas a despesa selecionada
        await expense.destroy({ transaction });
      }
    } else if (expense.has_installments && expense.installment_group_id && req.query.delete_all_installments === 'true') {
      // Se for parcelada e quiser excluir todas as parcelas
      const deletedCount = await Expense.destroy({
        where: {
          installment_group_id: expense.installment_group_id,
          user_id: req.user.id
        },
        transaction
      });
      
      await transaction.commit();
      return res.json({ 
        message: `${deletedCount} parcelas excluídas com sucesso`,
        count: deletedCount
      });
    } else {
      // Se não for recorrente nem parcelada, ou se quiser excluir apenas a selecionada
      await expense.destroy({ transaction });
    }

    await transaction.commit();
    res.json({ message: 'Despesa excluída com sucesso' });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao excluir despesa:', error);
    res.status(500).json({ message: 'Erro ao excluir despesa' });
  }
});

// Rota para excluir despesa fixa
router.delete('/:id/recurring', async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteType } = req.body;
    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }

    if (expense.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    // Caso de exclusão de apenas uma ocorrência específica
    if (deleteType === 'single') {
      await Expense.destroy({
        where: {
          id: expense.id,
          user_id: req.user.id
        }
      });
      return res.json({ message: 'Despesa excluída com sucesso' });
    }

    let whereClause = {
      user_id: req.user.id,
      recurring_group_id: expense.recurring_group_id
    };

    // Usamos a data da despesa atual como referência em vez da data de hoje
    const referenceDate = new Date(expense.expense_date);
    
    switch (deleteType) {
      case 'all':
        // Não adiciona condição de data - exclui tudo
        break;
      case 'past':
        whereClause.expense_date = {
          [Op.lt]: referenceDate
        };
        break;
      case 'future':
        whereClause.expense_date = {
          [Op.gte]: referenceDate
        };
        break;
      default:
        return res.status(400).json({ message: 'Tipo de exclusão inválido' });
    }

    console.log('Excluindo despesas com whereClause:', JSON.stringify(whereClause));
    
    const count = await Expense.destroy({
      where: whereClause
    });

    res.json({ 
      message: `${count} despesa(s) excluída(s) com sucesso`,
      count: count
    });
  } catch (error) {
    console.error('Erro ao excluir despesa fixa:', error);
    res.status(500).json({ message: 'Erro ao excluir despesa fixa' });
  }
});

// Rota para criar despesa
router.post('/', async (req, res) => {
  try {
    const expenseData = {
      ...req.body,
      user_id: req.user.id
    };

    if (expenseData.is_recurring) {
      expenseData.recurring_group_id = uuidv4();
      expenseData.start_date = expenseData.expense_date;
      expenseData.end_date = '2099-12-31';
    }

    const expense = await Expense.create(expenseData);
    res.status(201).json(expense);
  } catch (error) {
    console.error('Erro ao criar despesa:', error);
    res.status(500).json({ message: 'Erro ao criar despesa' });
  }
});

// Rota para atualizar despesa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }

    if (expense.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    const expenseData = {
      ...req.body
    };

    if (expenseData.is_recurring && !expense.is_recurring) {
      expenseData.recurring_group_id = uuidv4();
      expenseData.start_date = expenseData.expense_date;
      expenseData.end_date = '2099-12-31';
    }

    await expense.update(expenseData);
    res.json(expense);
  } catch (error) {
    console.error('Erro ao atualizar despesa:', error);
    res.status(500).json({ message: 'Erro ao atualizar despesa' });
  }
});

// Rota para estatísticas dos gráficos
router.get('/stats', async (req, res) => {
  try {
    const { month, year, category, bank, paymentMethod } = req.query;
    const where = { user_id: req.user.id };

    // Filtros
    if (month) {
      where[Op.and] = [
        Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('expense_date')), month)
      ];
    }
    if (year) {
      where[Op.and] = [
        ...(where[Op.and] || []),
        Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('expense_date')), year)
      ];
    }
    if (category) {
      where.category_id = category;
    }
    if (bank) {
      where.bank_id = bank;
    }
    if (paymentMethod) {
      where.payment_method = paymentMethod;
    }

    // Buscar todas as despesas com os filtros aplicados
    const expenses = await Expense.findAll({
      where,
      include: [
        { model: Category, as: 'Category' },
        { model: Bank, as: 'bank' }
      ],
      order: [['expense_date', 'ASC']]
    });

    // Dados para o gráfico de linha (evolução de despesas)
    const expensesByDate = expenses.reduce((acc, expense) => {
      const date = expense.expense_date.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += Number(expense.amount);
      return acc;
    }, {});

    // Dados para o gráfico de pizza (despesas por categoria)
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const categoryName = expense.Category.category_name;
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      acc[categoryName] += Number(expense.amount);
      return acc;
    }, {});

    // Dados para o gráfico de barras (despesas por banco)
    const expensesByBank = expenses.reduce((acc, expense) => {
      const bankName = expense.bank.name;
      if (!acc[bankName]) {
        acc[bankName] = 0;
      }
      acc[bankName] += Number(expense.amount);
      return acc;
    }, {});

    // Dados para o gráfico de barras empilhadas (despesas por tipo de pagamento)
    const expensesByPaymentMethod = expenses.reduce((acc, expense) => {
      const method = expense.payment_method;
      const categoryName = expense.Category.category_name;
      
      if (!acc[method]) {
        acc[method] = {};
      }
      if (!acc[method][categoryName]) {
        acc[method][categoryName] = 0;
      }
      acc[method][categoryName] += Number(expense.amount);
      return acc;
    }, {});

    // Dados para o gráfico de dispersão
    const scatterData = {
      pix: expenses
        .filter(e => e.payment_method === 'pix')
        .map(e => ({
          bank: e.bank.name,
          amount: Number(e.amount)
        })),
      card: expenses
        .filter(e => e.payment_method === 'card')
        .map(e => ({
          bank: e.bank.name,
          amount: Number(e.amount)
        }))
    };

    // Formatar dados para o frontend
    const formattedData = {
      expenses: Object.entries(expensesByDate).map(([date, amount]) => ({
        date,
        amount
      })),
      categories: Object.entries(expensesByCategory).map(([name, amount]) => ({
        name,
        amount
      })),
      banks: Object.entries(expensesByBank).map(([name, amount]) => ({
        name,
        amount
      })),
      paymentMethods: Object.entries(expensesByPaymentMethod).map(([method, categories]) => ({
        method,
        ...categories
      })),
      scatterData
    };

    // Buscar todas as categorias e bancos para os filtros
    const [categories, banks] = await Promise.all([
      Category.findAll({ order: [['category_name', 'ASC']] }),
      Bank.findAll({ order: [['name', 'ASC']] })
    ]);

    res.json({
      ...formattedData,
      categories: categories.map(c => ({
        id: c.id,
        name: c.category_name
      })),
      banks: banks.map(b => ({
        id: b.id,
        name: b.name
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

// Rota para excluir despesa fixa (uma ocorrência específica)
router.post('/:id/exclude-occurrence', async (req, res) => {
  try {
    const { id } = req.params;
    const { occurrence_date, reason } = req.body;
    
    // Busca a despesa recorrente
    const expense = await Expense.findOne({
      where: { 
        id, 
        user_id: req.user.id,
        is_recurring: true
      }
    });

    if (!expense) {
      return res.status(404).json({ message: 'Despesa recorrente não encontrada' });
    }

    // Cria uma exceção para esta ocorrência específica
    await ExpensesRecurrenceException.create({
      user_id: req.user.id,
      expense_id: expense.id,
      recurrence_id: expense.recurrence_id,
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

// Rota para excluir todas as ocorrências futuras de uma despesa recorrente
router.delete('/:id/future-occurrences', async (req, res) => {
  try {
    const { id } = req.params;
    const { from_date } = req.body;
    
    // Busca a despesa recorrente
    const expense = await Expense.findOne({
      where: { 
        id, 
        user_id: req.user.id,
        is_recurring: true
      }
    });

    if (!expense) {
      return res.status(404).json({ message: 'Despesa recorrente não encontrada' });
    }

    // Atualiza a data de término para a data anterior à data especificada
    const newEndDate = new Date(from_date);
    newEndDate.setDate(newEndDate.getDate() - 1);

    await expense.update({
      end_date: newEndDate
    });

    res.json({ message: 'Ocorrências futuras excluídas com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir ocorrências futuras:', error);
    res.status(500).json({ message: 'Erro ao excluir ocorrências futuras' });
  }
});

// Rota para excluir completamente uma despesa recorrente
router.delete('/:id/recurring', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Busca a despesa recorrente
    const expense = await Expense.findOne({
      where: { 
        id, 
        user_id: req.user.id,
        is_recurring: true
      }
    });

    if (!expense) {
      return res.status(404).json({ message: 'Despesa recorrente não encontrada' });
    }

    // Exclui todas as exceções associadas
    await ExpensesRecurrenceException.destroy({
      where: {
        expense_id: expense.id,
        user_id: req.user.id
      }
    });

    // Exclui a despesa recorrente
    await expense.destroy();

    res.json({ message: 'Despesa recorrente excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir despesa recorrente:', error);
    res.status(500).json({ message: 'Erro ao excluir despesa recorrente' });
  }
});

// Rota para excluir despesa (não recorrente)
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }
    
    if (expense.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    // Se for despesa recorrente, redireciona para a rota específica
    if (expense.is_recurring) {
      return res.status(400).json({ 
        message: 'Para excluir despesa recorrente, use o endpoint específico',
        redirectTo: '/expenses/:id/recurring'
      });
    }

    // Se for despesa parcelada, verifica se deve excluir todas as parcelas
    if (expense.has_installments && expense.installment_group_id) {
      const { delete_all_installments } = req.query;
      
      if (delete_all_installments === 'true') {
        // Exclui todas as parcelas
        await Expense.destroy({
          where: {
            installment_group_id: expense.installment_group_id,
            user_id: req.user.id
          }
        });
        
        return res.json({ message: 'Todas as parcelas foram excluídas com sucesso' });
      }
    }
    
    // Se não for parcelada ou não for para excluir todas, exclui apenas esta
    await expense.destroy();
    res.json({ message: 'Despesa excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir despesa:', error);
    res.status(500).json({ message: 'Erro ao excluir despesa' });
  }
});

// Rota para atualizar despesa
router.put('/:id', async (req, res) => {
  const transaction = await Expense.sequelize.transaction();

  try {
    const { 
      description, 
      amount: rawAmount, 
      expense_date, 
      category_id, 
      bank_id, 
      payment_method,
      is_recurring,
      start_date,
      end_date,
      recurrence_type
    } = req.body;
    
    const expense = await Expense.findByPk(req.params.id);
    
    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }
    
    if (expense.user_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Não autorizado' });
    }

    const parsedAmount = Number(rawAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'O valor deve ser um número positivo' });
    }

    // Se a despesa for recorrente
    if (expense.is_recurring) {
      // Atualiza a despesa principal
      await expense.update(
        {
          description,
          amount: parsedAmount,
          category_id,
          bank_id,
          payment_method,
          is_recurring,
          start_date: start_date ? new Date(start_date) : expense.start_date,
          end_date: end_date ? new Date(end_date) : expense.end_date,
          recurrence_type: recurrence_type || expense.recurrence_type
        },
        { transaction }
      );
    }
    // Se a despesa for parcelada
    else if (expense.has_installments && expense.installment_group_id) {
      // Atualiza todas as parcelas futuras
      const currentDate = new Date(expense.expense_date);
      await Expense.update(
        {
          description,
          category_id,
          bank_id,
          payment_method
        },
        {
          where: {
            installment_group_id: expense.installment_group_id,
            expense_date: {
              [Op.gte]: currentDate
            },
            user_id: req.user.id
          },
          transaction
        }
      );

      // Atualiza separadamente o valor apenas desta parcela
      await expense.update(
        {
          amount: parsedAmount
        },
        { transaction }
      );
    }
    // Se for uma despesa única
    else {
      await expense.update(
        {
          description,
          amount: parsedAmount,
          expense_date: new Date(expense_date),
          category_id,
          bank_id,
          payment_method
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Busca a despesa atualizada
    const updatedExpense = await Expense.findByPk(req.params.id);
    res.json(updatedExpense);
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao atualizar despesa:', error);
    res.status(500).json({ message: 'Erro ao atualizar despesa' });
  }
});

export default router;