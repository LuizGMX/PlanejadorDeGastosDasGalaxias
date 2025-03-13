const express = require('express');
const router = express.Router();
const { Income, Expense, Bank, Category, SubCategory } = require('../models');

router.get('/bank-balance-trend', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const userId = req.user.id;

    // Busca todas as receitas e despesas recorrentes do usuário
    const recurringIncomes = await Income.findAll({
      where: {
        user_id: userId,
        is_recurring: true
      },
      include: [
        { model: Category },
        { model: SubCategory },
        { model: Bank }
      ]
    });

    const recurringExpenses = await Expense.findAll({
      where: {
        user_id: userId,
        is_recurring: true
      },
      include: [
        { model: Category },
        { model: SubCategory },
        { model: Bank }
      ]
    });

    // Gera as datas para a projeção
    const projectionData = [];
    const currentDate = new Date();
    let currentBalance = 0;

    // Busca o saldo inicial (último saldo registrado)
    const lastBalance = await Bank.findOne({
      where: { user_id: userId },
      order: [['updated_at', 'DESC']]
    });

    if (lastBalance) {
      currentBalance = lastBalance.balance;
    }

    // Gera os dados de projeção mês a mês
    for (let i = 0; i < months; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Calcula receitas do mês
      const monthlyIncomes = recurringIncomes.reduce((sum, income) => {
        if (date >= new Date(income.start_date) && (!income.end_date || date <= new Date(income.end_date))) {
          return sum + Number(income.amount);
        }
        return sum;
      }, 0);

      // Calcula despesas do mês
      const monthlyExpenses = recurringExpenses.reduce((sum, expense) => {
        if (date >= new Date(expense.start_date) && (!expense.end_date || date <= new Date(expense.end_date))) {
          return sum + Number(expense.amount);
        }
        return sum;
      }, 0);

      // Atualiza o saldo
      currentBalance += monthlyIncomes - monthlyExpenses;

      projectionData.push({
        date: monthKey,
        incomes: monthlyIncomes,
        expenses: monthlyExpenses,
        balance: currentBalance
      });
    }

    // Calcula totais para o resumo
    const summary = {
      totalIncomes: projectionData.reduce((sum, month) => sum + month.incomes, 0),
      totalExpenses: projectionData.reduce((sum, month) => sum + month.expenses, 0),
      finalBalance: currentBalance
    };

    res.json({
      projectionData,
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 