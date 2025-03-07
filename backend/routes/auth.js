const crypto = require('crypto');

module.exports = (User, VerificationCode, sgMail, CreditCard) => {
  const router = require('express').Router();

  router.post('/send-code', async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email || !name) {
        return res.status(400).json({ message: 'E-mail e nome são obrigatórios' });
      }
      let user = await User.findOne({ where: { email } });
      if (!user) {
        user = await User.create({ email, name });
        const banks = [
          'Itaú Unibanco', 'Banco do Brasil', 'Bradesco', 'Caixa Econômica Federal', 'Santander Brasil',
          'Nubank', 'Banco Inter', 'BTG Pactual', 'Safra', 'Sicredi',
          'Banrisul', 'C6 Bank', 'Banco Pan', 'Original', 'Sicoob',
          'Votorantim (Banco BV)', 'BMG', 'Mercantil do Brasil', 'Daycoval', 'Neon'
        ];
        await CreditCard.bulkCreate(banks.map(bank => ({
          card_name: bank,
          user_id: user.id,
        })));
        console.log(`Cartões criados para o usuário ${email}`);
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await VerificationCode.destroy({ where: { email } });
      await VerificationCode.create({ email, code });
      console.log(`Código de verificação para ${email}: ${code}`);
      res.json({ message: 'Código gerado (verifique o console do backend)' });
    } catch (error) {
      console.error('Erro ao enviar código:', error);
      res.status(500).json({ message: 'Erro interno ao enviar o código' });
    }
  });

  router.post('/verify-code', async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ message: 'E-mail e código são obrigatórios' });
      }
      const verification = await VerificationCode.findOne({ where: { email, code } });
      if (!verification || Date.now() - verification.created_at > 10 * 60 * 1000) {
        return res.status(400).json({ message: 'Código inválido ou expirado' });
      }
      const user = await User.findOne({ where: { email } });
      let sessionToken = user.session_token;
      if (!sessionToken) {
        sessionToken = crypto.randomBytes(16).toString('hex');
        await user.update({ session_token: sessionToken });
      }
      await VerificationCode.destroy({ where: { email } });
      res.json({ token: sessionToken });
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      res.status(500).json({ message: 'Erro interno ao verificar o código' });
    }
  });

  router.get('/me', async (req, res) => {
    res.json({ name: req.user.name, avatar: req.user.avatar });
  });

  router.put('/me', async (req, res) => {
    await req.user.update(req.body);
    res.json({ message: 'Perfil atualizado' });
  });

  return router;
};