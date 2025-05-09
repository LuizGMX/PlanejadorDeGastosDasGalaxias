import nodemailer from 'nodemailer';

// Configuração mais robusta do transporter com tratamento melhor de erros
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'planejadordegastosdasgalaxias@gmail.com',
    pass: process.env.GMAIL_PASS // Senha de app do Gmail
  },
  tls: {
    rejectUnauthorized: false // Ajuda a evitar problemas de SSL/TLS em ambientes de desenvolvimento
  },
  debug: process.env.NODE_ENV !== 'production' // Ativa logs de debug quando não estiver em produção
});

// Função para verificar se o transporter está operacional
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('✅ Conexão com o servidor de email estabelecida com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro na configuração do servidor de email:', error);
    return false;
  }
};

// Verifica a conexão com o servidor de email ao inicializar
verifyTransporter();

export const sendVerificationEmail = async (email, code) => {
  // Validação: só permite códigos numéricos de 6 dígitos
  if (!/^[0-9]{6}$/.test(code)) {
    console.error('Código de verificação inválido:', code);
    throw new Error('Código de verificação inválido. Deve ser um número de 6 dígitos.');
  }
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
      <p>Este código expira em 10 minutos.</p>
    `
  };

  try {
    console.log('Tentando enviar email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email de verificação enviado com sucesso para:', email);
    console.log('Código enviado:', code);
    console.log('ID da mensagem:', info.messageId);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de verificação:', error);
    throw new Error(`Falha ao enviar email de verificação: ${error.message}`);
  }
}; 