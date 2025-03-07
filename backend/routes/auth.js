const crypto = require('crypto');

module.exports = (User, VerificationCode, sgMail, CreditCard) => {
  const router = require('express').Router();

  // Middleware de autenticação
  const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Não autorizado' });
    const user = await User.findOne({ where: { session_token: token } });
    if (!user) return res.status(401).json({ message: 'Não autorizado' });
    req.user = user;
    next();
  };

  router.post('/check-email', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'E-mail é obrigatório' });
      }
      const user = await User.findOne({ where: { email } });
      res.json({ 
        isNewUser: !user,
        name: user ? user.name : null
      });
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      res.status(500).json({ message: 'Erro interno ao verificar email' });
    }
  });

  router.post('/send-code', async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email || !name) {
        return res.status(400).json({ message: 'E-mail e nome são obrigatórios' });
      }
      let user = await User.findOne({ where: { email } });
      const isNewUser = !user;
      
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
      
      // Em desenvolvimento, apenas mostra o código no terminal
      console.log(`\n=== CÓDIGO DE VERIFICAÇÃO ===`);
      console.log(`Email: ${email}`);
      console.log(`Código: ${code}`);
      console.log(`===========================\n`);

      // Código para produção (comentado)
      /*
      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Código de Verificação - Planejador Das Galáxias',
        text: `Seu código de verificação é: ${code}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Código de Verificação</h2>
            <p>Olá ${name},</p>
            <p>Seu código de verificação é:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
              ${code}
            </div>
            <p>Este código expira em 10 minutos.</p>
            <p>Se você não solicitou este código, por favor ignore este email.</p>
          </div>
        `,
      };
      await sgMail.send(msg);
      */

      res.json({ 
        message: 'Código gerado (verifique o console do backend)',
        isNewUser
      });
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

  router.get('/me', authenticate, async (req, res) => {
    res.json({ name: req.user.name, avatar: req.user.avatar });
  });

  router.put('/me', authenticate, async (req, res) => {
    await req.user.update(req.body);
    res.json({ message: 'Perfil atualizado' });
  });

  return router;
};