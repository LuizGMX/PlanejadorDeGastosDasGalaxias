module.exports = (CreditCard) => {
  const router = require('express').Router();

  router.get('/', async (req, res) => {
    try {
      const cards = await CreditCard.findAll({
        where: { user_id: req.user.id },
        order: [
          ['is_favorite', 'DESC'],
          ['card_name', 'ASC']
        ]
      });
      res.json(cards);
    } catch (error) {
      console.error('Erro ao listar cartões:', error);
      res.status(500).json({ message: 'Erro ao buscar cartões' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const card = await CreditCard.create({
        ...req.body,
        user_id: req.user.id,
      });
      res.status(201).json(card);
    } catch (error) {
      console.error('Erro ao adicionar cartão:', error);
      res.status(500).json({ message: 'Erro ao adicionar cartão' });
    }
  });

  router.patch('/:id/toggle-favorite', async (req, res) => {
    try {
      const card = await CreditCard.findOne({
        where: { 
          id: req.params.id,
          user_id: req.user.id
        }
      });

      if (!card) {
        return res.status(404).json({ message: 'Cartão não encontrado' });
      }

      await card.update({ is_favorite: !card.is_favorite });
      res.json(card);
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      res.status(500).json({ message: 'Erro ao atualizar favorito' });
    }
  });

  // Função para criar múltiplos cartões (usada no auth.js)
  router.bulkCreate = async (user, cards) => {
    await CreditCard.bulkCreate(cards.map(card => ({
      ...card,
      user_id: user.id,
    })));
  };

  return router;
};