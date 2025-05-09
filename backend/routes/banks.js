import express from 'express';
import { models } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { checkSubscription } from '../middleware/subscriptionCheck.js';
import sequelize from '../config/db.js';

const router = express.Router();
const { Bank, UserBank } = models;

// Cache para a rota de bancos
let banksCache = {
  data: null,
  timestamp: 0,
  isLoading: false
};

// Função para limpar o cache periodicamente
setInterval(() => {
  banksCache.data = null;
  console.log('Cache de bancos limpo');
}, 3600000); // Limpar a cada 1 hora

// Cache para a rota de bancos favoritos (por usuário)
const favoritesBanksCache = new Map();

// Função para limpar o cache de favoritos periodicamente
setInterval(() => {
  favoritesBanksCache.clear();
  console.log('Cache de bancos favoritos limpo');
}, 3600000); // Limpar a cada 1 hora

// Cache para a rota de bancos ativos do usuário
const usersBanksCache = new Map();

// Função para limpar o cache de bancos do usuário periodicamente
setInterval(() => {
  usersBanksCache.clear();
  console.log('Cache de bancos do usuário limpo');
}, 3600000); // Limpar a cada 1 hora

// Rota pública - Listar todos os bancos (sem autenticação)
// Usada durante o cadastro de novos usuários
router.get('/', async (req, res) => {
  // Adicionar timeout para evitar que a requisição fique pendente por muito tempo
  const timeout = setTimeout(() => {
    console.error('Timeout ao listar bancos');
    return res.status(503).json({ 
      message: 'Tempo limite excedido ao listar bancos',
      timeout: true
    });
  }, 8000); // 8 segundos de timeout

  try {
    // Verificar se temos um cache válido
    const now = Date.now();
    if (banksCache.data && now - banksCache.timestamp < 3600000) { // Cache válido por 1 hora
      clearTimeout(timeout);
      console.log('Retornando dados de bancos do cache');
      return res.json(banksCache.data);
    }

    // Se já está carregando, aguardar
    if (banksCache.isLoading) {
      clearTimeout(timeout);
      console.log('Carregamento de bancos em andamento, retornando resposta temporária');
      return res.status(202).json({ 
        message: 'Dados sendo carregados, tente novamente em alguns segundos',
        loading: true
      });
    }

    // Marcar que estamos carregando
    banksCache.isLoading = true;
    
    console.log('Listando todos os bancos (rota pública) - buscando do banco de dados');

    // Usar query SQL direta para evitar a descriptografia automática do model
    const [banks] = await sequelize.query(`
      SELECT id, name, code 
      FROM banks 
      ORDER BY name ASC
      LIMIT 500
    `);

    // Descriptografar manualmente os dados necessários
    // Como temos poucos bancos, isso deve ser rápido
    const formattedBanks = banks.map(bank => ({
      id: bank.id,
      name: bank.name,
      code: bank.code
    }));

    // Atualizar o cache
    banksCache.data = formattedBanks;
    banksCache.timestamp = now;
    banksCache.isLoading = false;
    
    // Cancelar o timeout pois a requisição foi bem-sucedida
    clearTimeout(timeout);
    
    console.log(`Retornando ${formattedBanks.length} bancos`);
    res.json(formattedBanks);
  } catch (error) {
    // Marcar que não estamos mais carregando
    banksCache.isLoading = false;

    // Cancelar o timeout em caso de erro
    clearTimeout(timeout);
    
    console.error('Erro ao listar bancos:', error);
    res.status(500).json({ 
      message: 'Erro ao listar bancos',
      error: process.env.NODE_ENV === 'production' ? null : error.message 
    });
  }
});

// Rota protegida - Requer autenticação - Bancos favoritos do usuário
router.get('/favorites', authenticate, checkSubscription, async (req, res) => {
  // Adicionar timeout para evitar que a requisição fique pendente por muito tempo
  const timeout = setTimeout(() => {
    console.error(`Timeout ao buscar bancos favoritos para o usuário ${req.user.id}`);
    return res.status(503).json({ 
      message: 'Tempo limite excedido ao buscar bancos favoritos',
      timeout: true
    });
  }, 10000); // 10 segundos de timeout

  try {
    const userId = req.user.id;
    const cacheKey = `${userId}-${req.query.onlyActive === 'true' ? 'active' : 'all'}`;
    
    // Verificar se temos um cache válido para este usuário
    const cachedData = favoritesBanksCache.get(cacheKey);
    const now = Date.now();
    if (cachedData && now - cachedData.timestamp < 300000) { // Cache válido por 5 minutos
      clearTimeout(timeout);
      console.log(`Retornando dados de bancos favoritos do cache para usuário ${userId}`);
      return res.json(cachedData.data);
    }
    
    console.log(`Buscando bancos favoritos para o usuário ${userId}`);
    
    // Usar query SQL direta para melhor performance
    const [userBanks] = await sequelize.query(`
      SELECT ub.bank_id, ub.is_active, b.name, b.code
      FROM user_banks AS ub
      JOIN banks AS b ON ub.bank_id = b.id
      WHERE ub.user_id = :userId AND ub.is_active = 1
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    // Formatar os bancos com suas informações e status
    const banksWithStatus = userBanks.map(userBank => ({
      id: userBank.bank_id,
      name: userBank.name,
      code: userBank.code,
      is_active: Boolean(userBank.is_active)
    }));

    // Ordenar por nome
    banksWithStatus.sort((a, b) => a.name.localeCompare(b.name));

    // Se apenas os ativos foram solicitados, filtrar
    let result = banksWithStatus;
    if (req.query.onlyActive === 'true') {
      result = banksWithStatus.filter(bank => bank.is_active);
      console.log(`Filtrando apenas bancos ativos: ${result.length} encontrados`);
    }

    // Armazenar no cache
    favoritesBanksCache.set(cacheKey, {
      data: result,
      timestamp: now
    });
    
    // Cancelar timeout pois requisição foi bem-sucedida
    clearTimeout(timeout);

    console.log(`Retornando ${result.length} bancos favoritos para o usuário ${userId}`);
    res.json(result);
  } catch (error) {
    // Cancelar timeout em caso de erro
    clearTimeout(timeout);
    
    console.error('Erro ao listar bancos favoritos:', error);
    res.status(500).json({ 
      message: 'Erro ao listar bancos favoritos',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
});

// Rota protegida - Requer autenticação - Bancos ativos do usuário
router.get('/users', authenticate, checkSubscription, async (req, res) => {
  // Adicionar timeout para evitar que a requisição fique pendente por muito tempo
  const timeout = setTimeout(() => {
    console.error(`Timeout ao buscar bancos ativos para o usuário ${req.user.id}`);
    return res.status(503).json({ 
      message: 'Tempo limite excedido ao buscar bancos ativos',
      timeout: true
    });
  }, 8000); // 8 segundos de timeout

  try {
    const userId = req.user.id;
    
    // Verificar se temos um cache válido para este usuário
    const cachedData = usersBanksCache.get(userId);
    const now = Date.now();
    if (cachedData && now - cachedData.timestamp < 300000) { // Cache válido por 5 minutos
      clearTimeout(timeout);
      console.log(`Retornando dados de bancos ativos do cache para usuário ${userId}`);
      return res.json(cachedData.data);
    }
    
    console.log(`Buscando bancos ativos para o usuário ${userId}`);
    
    // Usar query SQL direta para melhor performance
    const [userBanks] = await sequelize.query(`
      SELECT b.id, b.name, b.code
      FROM user_banks AS ub
      JOIN banks AS b ON ub.bank_id = b.id
      WHERE ub.user_id = :userId AND ub.is_active = 1
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    // Formatar os bancos
    const activeBanks = userBanks.map(bank => ({
      id: bank.id,
      name: bank.name,
      code: bank.code
    }));

    // Armazenar no cache
    usersBanksCache.set(userId, {
      data: activeBanks,
      timestamp: now
    });
    
    // Cancelar timeout pois requisição foi bem-sucedida
    clearTimeout(timeout);

    console.log(`Retornando ${activeBanks.length} bancos ativos para o usuário ${userId}`);
    res.json(activeBanks);
  } catch (error) {
    // Cancelar timeout em caso de erro
    clearTimeout(timeout);
    
    console.error('Erro ao listar bancos do usuário:', error);
    res.status(500).json({ 
      message: 'Erro ao listar bancos do usuário',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
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

// Pré-carregar o cache de bancos ao iniciar o servidor
(async () => {
  try {
    console.log('Pré-carregando cache de bancos...');
    const [banks] = await sequelize.query(`
      SELECT id, name, code 
      FROM banks 
      ORDER BY name ASC
      LIMIT 500
    `);

    const formattedBanks = banks.map(bank => ({
      id: bank.id,
      name: bank.name,
      code: bank.code
    }));

    banksCache.data = formattedBanks;
    banksCache.timestamp = Date.now();
    console.log(`Cache de bancos pré-carregado com ${formattedBanks.length} bancos`);
  } catch (error) {
    console.error('Erro ao pré-carregar cache de bancos:', error);
  }
})();
