import { Router } from 'express';
import { Bank, UserBank } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { checkSubscription } from '../middleware/subscriptionCheck.js';

const router = Router();

// Rota pública - Listar todos os bancos (sem autenticação)
// Usada durante o cadastro de novos usuários
router.get('/', async (req, res) => {
  try {
    console.log('Listando todos os bancos (rota pública)');
    const banks = await Bank.findAll({
      order: [['name', 'ASC']]
    });
    res.json(banks);
  } catch (error) {
    console.error('Erro ao listar bancos:', error);
    res.status(500).json({ message: 'Erro ao listar bancos' });
  }
});

// Rota protegida - Requer autenticação - Bancos favoritos do usuário
router.get('/favorites', authenticate, checkSubscription, async (req, res) => {
  try {
    console.log(`Buscando bancos favoritos para o usuário ${req.user.id}`);
    
    // Buscar apenas os bancos que o usuário tem relação
    const userBanks = await UserBank.findAll({
      where: { 
        user_id: req.user.id
      },
      include: [{
        model: Bank,
        as: 'bank',
        attributes: ['id', 'name', 'code']
      }],
      attributes: ['bank_id', 'is_active']
    });

    console.log('UserBanks encontrados:', userBanks.map(ub => ({bank_id: ub.bank_id, is_active: ub.is_active})));

    // Formatar os bancos com suas informações e status
    const banksWithStatus = userBanks.map(userBank => ({
      id: userBank.bank.id,
      name: userBank.bank.name,
      code: userBank.bank.code,
      is_active: userBank.is_active
    }));

    // Ordenar por nome
    banksWithStatus.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Retornando ${banksWithStatus.length} bancos favoritos para o usuário ${req.user.id}`);

    // Se apenas os ativos foram solicitados, filtrar
    if (req.query.onlyActive === 'true') {
      const activeBanks = banksWithStatus.filter(bank => bank.is_active);
      console.log(`Filtrando apenas bancos ativos: ${activeBanks.length} encontrados`);
      return res.json(activeBanks);
    }

    res.json(banksWithStatus);
  } catch (error) {
    console.error('Erro ao listar bancos favoritos:', error);
    res.status(500).json({ message: 'Erro ao listar bancos favoritos' });
  }
});

// Rota protegida - Requer autenticação - Bancos ativos do usuário
router.get('/users', authenticate, checkSubscription, async (req, res) => {
  try {
    // Buscar as relações de UserBank para o usuário atual onde is_active é true
    const userBanks = await UserBank.findAll({
      where: { 
        user_id: req.user.id,
        is_active: true
      },
      include: [{
        model: Bank,
        as: 'bank',
        attributes: ['id', 'name', 'code']
      }]
    });

    // Mapear o resultado para o formato esperado
    const activeBanks = userBanks.map(ub => ({
      id: ub.bank.id,
      name: ub.bank.name,
      code: ub.bank.code
    }));

    console.log(`Retornando ${activeBanks.length} bancos ativos para o usuário ${req.user.id}`);
    res.json(activeBanks);
  } catch (error) {
    console.error('Erro ao listar bancos do usuário:', error);
    res.status(500).json({ message: 'Erro ao listar bancos do usuário' });
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

// Rota protegida - Requer autenticação - Gerenciar bancos favoritos (POST)
router.post('/favorites', authenticate, checkSubscription, async (req, res) => {
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

    // Primeiro verifica se já existe essa relação
    let userBank = await UserBank.findOne({
      where: { user_id, bank_id }
    });

    if (userBank) {
      // Se já existe, apenas atualiza
      await userBank.update({ is_active });
      console.log(`Relação UserBank atualizada: ${userBank.id}, is_active=${is_active}`);
    } else {
      // Se não existe, cria uma nova
      userBank = await UserBank.create({
        user_id,
        bank_id,
        is_active
      });
      console.log(`Nova relação UserBank criada: ${userBank.id}, is_active=${is_active}`);
    }

    // Busca os dados atualizados para retornar
    const updatedUserBank = await UserBank.findOne({
      where: { user_id, bank_id },
      include: [{
        model: Bank,
        as: 'bank',
        attributes: ['id', 'name', 'code']
      }]
    });

    res.json({
      message: 'Banco favorito atualizado com sucesso',
      bank: updatedUserBank.bank,
      is_active: updatedUserBank.is_active
    });
  } catch (error) {
    console.error('Erro ao atualizar banco favorito:', error);
    res.status(500).json({ message: 'Erro ao atualizar banco favorito' });
  }
});

// Rota protegida - Requer autenticação - Atualizar bancos favoritos (PUT)
router.put('/favorites', authenticate, checkSubscription, async (req, res) => {
  const { bank_id, is_active } = req.body;
  const user_id = req.user.id;

  if (!bank_id) {
    return res.status(400).json({ message: 'ID do banco é obrigatório' });
  }

  try {
    console.log('Atualizando banco favorito (PUT):', { bank_id, is_active, user_id });

    const bank = await Bank.findByPk(bank_id);
    if (!bank) {
      return res.status(404).json({ message: 'Banco não encontrado' });
    }

    // Primeiro verifica se já existe essa relação
    let userBank = await UserBank.findOne({
      where: { user_id, bank_id }
    });

    if (userBank) {
      // Se já existe, apenas atualiza
      await userBank.update({ is_active });
      console.log(`Relação UserBank atualizada: ${userBank.id}, is_active=${is_active}`);
    } else {
      // Se não existe, cria uma nova
      userBank = await UserBank.create({
        user_id,
        bank_id,
        is_active
      });
      console.log(`Nova relação UserBank criada: ${userBank.id}, is_active=${is_active}`);
    }

    // Busca os dados atualizados para retornar
    const updatedUserBank = await UserBank.findOne({
      where: { user_id, bank_id },
      include: [{
        model: Bank,
        as: 'bank',
        attributes: ['id', 'name', 'code']
      }]
    });

    res.json({
      message: 'Banco favorito atualizado com sucesso',
      bank: updatedUserBank.bank,
      is_active: updatedUserBank.is_active
    });
  } catch (error) {
    console.error('Erro ao atualizar banco favorito:', error);
    res.status(500).json({ message: 'Erro ao atualizar banco favorito' });
  }
});

export default router;
