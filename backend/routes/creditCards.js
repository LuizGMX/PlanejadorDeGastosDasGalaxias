module.exports = (CreditCard) => {
  const router = require('express').Router();

  router.get('/', async (req, res) => {
    const cards = await CreditCard.findAll({ where: { user_id: req.user.id } });
    res.json(cards);
  });

  router.post('/', async (req, res) => {
    const card = await CreditCard.create({ ...req.body, user_id: req.user.id });
    res.json(card);
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