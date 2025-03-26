import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendVerificationEmail = async (email, code) => {
  console.log('Preparando para enviar email de verificação...');
  console.log('Email:', email);
  console.log('Código:', code);
  console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'Configurada' : 'Não configurada');
  console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Código de Verificação - Planejador de Gastos das Galáxias',
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
    await sgMail.send(msg);
    console.log('Email de verificação enviado com sucesso para:', email);
    console.log('Código enviado:', code);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de verificação:', error);
    if (error.response) {
      console.error('Detalhes do erro do SendGrid:', error.response.body);
    }
    throw new Error(`Falha ao enviar email de verificação: ${error.message}`);
  }
}; 