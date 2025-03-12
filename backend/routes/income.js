import express from 'express';
import { Income } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize';

const router = express.Router();

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
      order: [['date', 'DESC']]
    });

    res.json(incomes);
  } catch (error) {
    console.error('Erro ao buscar receitas:', error);
    res.status(500).json({ message: 'Erro ao buscar receitas' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { description, amount, date } = req.body;

    // Validações básicas
    if (!description || amount === undefined || !date) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    // Garante que o valor é um número válido
    const parsedAmount = Number(parseFloat(amount).toFixed(2));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ message: 'Valor inválido' });
    }

    const income = await Income.create({
      user_id: req.user.id,
      description,
      amount: parsedAmount,
      date
    });

    res.status(201).json({ 
      message: 'Receita criada com sucesso',
      income
    });
  } catch (error) {
    console.error('Erro ao adicionar receita:', error);
    res.status(500).json({ message: 'Erro ao adicionar receita' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
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

    const { description, amount, date } = req.body;

    // Validações básicas
    if (!description || amount === undefined || !date) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    // Garante que o valor é um número válido
    const parsedAmount = Number(parseFloat(amount).toFixed(2));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ message: 'Valor inválido' });
    }

    await income.update({
      description,
      amount: parsedAmount,
      date
    });

    res.json({ 
      message: 'Receita atualizada com sucesso',
      income
    });
  } catch (error) {
    console.error('Erro ao atualizar receita:', error);
    res.status(500).json({ message: 'Erro ao atualizar receita' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
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

    await income.destroy();

    res.json({ message: 'Receita excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir receita:', error);
    res.status(500).json({ message: 'Erro ao excluir receita' });
  }
});

router.delete('/batch', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }

    await Income.destroy({
      where: {
        id: { [Op.in]: ids },
        user_id: req.user.id
      }
    });

    res.json({ message: 'Receitas excluídas com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir receitas:', error);
    res.status(500).json({ message: 'Erro ao excluir receitas' });
  }
});

export default router; 