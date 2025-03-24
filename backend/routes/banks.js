import { Router } from 'express';
import { Bank, UserBank } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Rota para listar todos os bancos
router.get('/', async (req, res) => {
  try {
    const banks = await Bank.findAll({
      order: [['name', 'ASC']]
    });
    res.json(banks);
  } catch (error) {
    console.error('Erro ao listar bancos:', error);
    res.status(500).json({ message: 'Erro ao listar bancos' });
  }
});

// Rota para listar bancos favoritos do usuário
router.get('/favorites', authenticate, async (req, res) => {
  try {
    const userBanks = await UserBank.findAll({
      where: { 
        user_id: req.user.id,
        is_active: true
      },
      include: [{
        model: Bank,
        attributes: ['id', 'name', 'code']
      }],
      order: [[Bank, 'name', 'ASC']]
    });

    // Se não houver bancos favoritos, retorna todos os bancos
    if (userBanks.length === 0) {
      const allBanks = await Bank.findAll({
        attributes: ['id', 'name', 'code'],
        order: [['name', 'ASC']]
      });
      return res.json(allBanks);
    }

    const banks = userBanks.map(ub => ub.Bank);
    res.json(banks);
  } catch (error) {
    console.error('Erro ao listar bancos favoritos:', error);
    res.status(500).json({ message: 'Erro ao listar bancos favoritos' });
  }
});

// // Listar bancos do usuário
// router.get('/my-banks', authenticate, async (req, res) => {
//   try {
//     const userBanks = await UserBank.findAll({
//       where: { user_id: req.user.id },
//       include: [{ model: Bank }],
//       order: [[Bank, 'name', 'ASC']]
//     });
//     res.json(userBanks);
//   } catch (error) {
//     console.error('Erro ao listar bancos do usuário:', error);
//     res.status(500).json({ message: 'Erro ao listar bancos do usuário' });
//   }
// });

// // Adicionar banco ao usuário
// router.post('/add', authentica te, async (req, res) => {
//   try {
//     const { bank_id } = req.body;
    
//     // Verifica se o banco já está vinculado
//     const existingBank = await UserBank.findOne({
//       where: {
//         user_id: req.user.id,
//         bank_id
//       }
//     });

//     if (existingBank) {
//       if (!existingBank.is_active) {
//         await existingBank.update({ is_active: true });
//         return res.json({ message: 'Banco reativado com sucesso' });
//       }
//       return res.status(400).json({ message: 'Banco já vinculado' });
//     }

//     await UserBank.create({
//       user_id: req.user.id,
//       bank_id
//     });

//     res.json({ message: 'Banco adicionado com sucesso' });
//   } catch (error) {
//     console.error('Erro ao adicionar banco:', error);
//     res.status(500).json({ message: 'Erro ao adicionar banco' });
//   }
// });

// // Remover banco do usuário
// router.delete('/:id', authenticate, async (req, res) => {
//   try {
//     const userBank = await UserBank.findOne({
//       where: {
//         user_id: req.user.id,
//         bank_id: req.params.id
//       }
//     });

//     if (!userBank) {
//       return res.status(404).json({ message: 'Banco não encontrado' });
//     }

//     await userBank.update({ is_active: false });
//     res.json({ message: 'Banco removido com sucesso' });
//   } catch (error) {
//     console.error('Erro ao remover banco:', error);
//     res.status(500).json({ message: 'Erro ao remover banco' });
//   }
// });

// Rota para gerenciar bancos favoritos
router.post('/favorites', authenticate, async (req, res) => {
  const { bank_id, is_active } = req.body;
  const user_id = req.user.id;

  if (!bank_id) {
    return res.status(400).json({ message: 'ID do banco é obrigatório' });
  }

  try {
    console.log('Atualizando banco favorito:', { bank_id, is_active, user_id });

    const bank = await Bank.findByPk(bank_id);
    if (!bank) {
      return res.status(404).json({ message: 'Banco não encontrado' });
    }

    const [userBank] = await UserBank.findOrCreate({
      where: { user_id, bank_id },
      defaults: { is_active: false }
    });

    await userBank.update({ is_active });

    // Busca os dados atualizados para retornar
    const updatedUserBank = await UserBank.findOne({
      where: { user_id, bank_id },
      include: [{
        model: Bank,
        attributes: ['id', 'name', 'code']
      }]
    });

    res.json({
      message: 'Banco favorito atualizado com sucesso',
      bank: updatedUserBank.Bank,
      is_active: updatedUserBank.is_active
    });
  } catch (error) {
    console.error('Erro ao atualizar banco favorito:', error);
    res.status(500).json({ message: 'Erro ao atualizar banco favorito' });
  }
});

export default router;
