import express from 'express';
import { Expense, Category, SubCategory, Bank } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { months, years, category_id, payment_method, has_installments, description } = req.query;
    const where = { user_id: req.user.id };

    // Filtro de meses e anos
    const monthsArray = months ? (Array.isArray(months) ? months : months.split(',').map(Number)) : [];
    const yearsArray = years ? (Array.isArray(years) ? years : years.split(',').map(Number)) : [];

    if (monthsArray.length > 0 || yearsArray.length > 0) {
      where[Op.and] = [];

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

    // Filtro de categoria
    if (category_id && category_id !== 'all') {
      where.category_id = category_id;
    }

    // Filtro de método de pagamento
    if (payment_method && payment_method !== 'all') {
      where.payment_method = payment_method;
    }

    // Filtro de parcelas
    if (has_installments !== undefined && has_installments !== 'all') {
      where.has_installments = has_installments === 'true' || has_installments === 'yes';
    }

    // Filtro de descrição
    if (description) {
      where.description = {
        [Op.like]: `%${description}%`
      };
    }

    console.log('Query where:', where); // Para debug

    const expenses = await Expense.findAll({
      where,
      include: [
        { model: Category },
        { model: SubCategory },
        { model: Bank }
      ],
      order: [['expense_date', 'DESC']]
    });

    res.json(expenses);
  } catch (error) {
    console.error('Erro ao buscar despesas:', error);
    res.status(500).json({ message: 'Erro ao buscar despesas' });
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
      first_installment_date,
      payment_method,
      has_installments,
      current_installment,
      total_installments
    } = req.body;

    // Validações básicas
    if (!description || amount === undefined || !category_id || !subcategory_id || !bank_id || !first_installment_date || !payment_method) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    if (has_installments && (!current_installment || !total_installments)) {
      return res.status(400).json({ message: 'Informações de parcelas incompletas' });
    }

    // Garante que o valor é um número válido
    let parsedAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    parsedAmount = Number(parsedAmount.toFixed(2));

    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ 
        message: 'Valor inválido',
        received: amount,
        parsed: parsedAmount,
        details: 'O valor deve ser um número positivo'
      });
    }

    const installmentGroupId = has_installments ? uuidv4() : null;
    const expenses = [];

    if (has_installments) {
      // Usa a data da primeira parcela como base
      const baseDate = new Date(first_installment_date);
      
      // Calcula o valor de cada parcela
      const installmentAmount = Number((parsedAmount / total_installments).toFixed(2));
      
      // Calcula o ajuste necessário para a última parcela devido a arredondamentos
      const roundingAdjustment = Number((parsedAmount - (installmentAmount * total_installments)).toFixed(2));
      
      console.log('Valores calculados:', {
        valorTotal: parsedAmount,
        valorParcela: installmentAmount,
        ajuste: roundingAdjustment,
        totalParcelas: total_installments
      });

      for (let i = 0; i < total_installments; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + i);

        // Adiciona o ajuste de arredondamento na última parcela
        const finalAmount = i === total_installments - 1 
          ? installmentAmount + roundingAdjustment 
          : installmentAmount;

        expenses.push({
          user_id: req.user.id,
          description: `${description} (${i + 1}/${total_installments})`,
          amount: finalAmount,
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
        amount: parsedAmount,
        category_id,
        subcategory_id,
        bank_id,
        expense_date: first_installment_date,
        payment_method,
        has_installments: false
      });
    }

    const createdExpenses = await Expense.bulkCreate(expenses);

    res.status(201).json({ 
      message: 'Despesa(s) criada(s) com sucesso',
      expenses: createdExpenses
    });
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

router.put('/:id', authenticate, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!expense) {
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }

    // Validações básicas
    const {
      description,
      amount,
      category_id,
      subcategory_id,
      bank_id,
      expense_date,
      payment_method
    } = req.body;

    if (!description || amount === undefined || !category_id || !subcategory_id || !bank_id || !expense_date || !payment_method) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    // Garante que o valor é um número válido
    const parsedAmount = Number(parseFloat(amount).toFixed(2));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ message: 'Valor inválido' });
    }

    // Atualiza a despesa
    await expense.update({
      description,
      amount: parsedAmount,
      category_id,
      subcategory_id,
      bank_id,
      expense_date,
      payment_method
    });

    res.json({ 
      message: 'Despesa atualizada com sucesso',
      expense
    });
  } catch (error) {
    console.error('Erro ao atualizar despesa:', error);
    res.status(500).json({ message: 'Erro ao atualizar despesa' });
  }
});

router.delete('/installments', authenticate, async (req, res) => {
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

router.delete('/batch', authenticate, async (req, res) => {
  const transaction = await Expense.sequelize.transaction();

  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }

    // Verifica se todas as despesas pertencem ao usuário
    const expenses = await Expense.findAll({
      where: {
        id: ids,
        user_id: req.user.id
      }
    });

    if (expenses.length !== ids.length) {
      await transaction.rollback();
      return res.status(403).json({ 
        message: 'Algumas despesas não foram encontradas ou você não tem permissão para excluí-las' 
      });
    }

    // Exclui as despesas
    await Expense.destroy({
      where: {
        id: ids,
        user_id: req.user.id
      },
      transaction
    });

    await transaction.commit();
    res.json({ 
      message: 'Despesas excluídas com sucesso',
      count: expenses.length
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao excluir despesas:', error);
    res.status(500).json({ message: 'Erro ao excluir despesas' });
  }
});

// Rota para excluir uma única despesa (deve vir por último)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id
      }
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

// Rota para estatísticas dos gráficos
router.get('/stats', authenticate, async (req, res) => {
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
        { model: Category },
        { model: Bank }
      ],
      order: [['expense_date', 'ASC']]
    });

    // Dados para o gráfico de linha (evolução de gastos)
    const expensesByDate = expenses.reduce((acc, expense) => {
      const date = expense.expense_date.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += Number(expense.amount);
      return acc;
    }, {});

    // Dados para o gráfico de pizza (gastos por categoria)
    const expensesByCategory = expenses.reduce((acc, expense) => {
      const categoryName = expense.Category.category_name;
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      acc[categoryName] += Number(expense.amount);
      return acc;
    }, {});

    // Dados para o gráfico de barras (gastos por banco)
    const expensesByBank = expenses.reduce((acc, expense) => {
      const bankName = expense.Bank.name;
      if (!acc[bankName]) {
        acc[bankName] = 0;
      }
      acc[bankName] += Number(expense.amount);
      return acc;
    }, {});

    // Dados para o gráfico de barras empilhadas (gastos por tipo de pagamento)
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
          bank: e.Bank.name,
          amount: Number(e.amount)
        })),
      card: expenses
        .filter(e => e.payment_method === 'card')
        .map(e => ({
          bank: e.Bank.name,
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

export default router;