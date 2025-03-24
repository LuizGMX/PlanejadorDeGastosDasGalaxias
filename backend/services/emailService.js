import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendVerificationEmail = async (email, code) => {
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Código de Verificação - Planejador de Gastos das Galáxias',
    text: `Seu código de verificação é: ${code}\n\nUse o comando /codigo ${code} no bot do Telegram para vincular sua conta.\n\nEste código expira em 30 minutos.`,
    html: `
      <h2>Código de Verificação</h2>
      <p>Seu código de verificação é: <strong>${code}</strong></p>
      <p>Use o comando <code>/codigo ${code}</code> no bot do Telegram para vincular sua conta.</p>
      <p>Este código expira em 30 minutos.</p>
    `
  };

  try {
    await sgMail.send(msg);
    console.log('Email de verificação enviado com sucesso: ' + code);
  } catch (error) {
    console.error('Erro ao enviar email de verificação:', error);
    throw error;
  }
}; 