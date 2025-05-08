import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'planejadordegastosdasgalaxias@gmail.com',
    pass: process.env.GMAIL_PASS // Defina esta variável de ambiente com a senha do app ou OAuth
  }
});

export const sendVerificationEmail = async (email, code) => {
  console.log('Preparando para enviar email de verificação...');
  console.log('Email:', email);
  console.log('Código:', code);
  console.log('GMAIL_USER:', process.env.GMAIL_USER || 'planejadordegastosdasgalaxias@gmail.com');

  const mailOptions = {
    from: process.env.GMAIL_USER || 'planejadordegastosdasgalaxias@gmail.com',
    to: email,
    subject: 'Código de Verificação - Planejador de Despesas das Galáxias',
    text: `Seu código de verificação é: ${code}\n\nUse o comando /verificar ${code} no bot do Telegram para vincular sua conta.\n\nEste código expira em 10 minutos.`,
    html: `
      <h2>Código de Verificação</h2>
      <p>Seu código de verificação é: <strong>${code}</strong></p>
      <p>Use o comando <code>/verificar ${code}</code> no bot do Telegram para vincular sua conta.</p>
      <p>Este código expira em 10 minutos.</p>
    `
  };

  try {
    console.log('Tentando enviar email...');
    await transporter.sendMail(mailOptions);
    console.log('Email de verificação enviado com sucesso para:', email);
    console.log('Código enviado:', code);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de verificação:', error);
    throw new Error(`Falha ao enviar email de verificação: ${error.message}`);
  }
}; 