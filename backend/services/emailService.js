import nodemailer from 'nodemailer';

// Criar transportador para envio de emails
let transporter;

// Verificar se estamos em ambiente de desenvolvimento
const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment) {
  console.log('Ambiente de desenvolvimento detectado - usando transportador de teste');
  // Em desenvolvimento, usamos um transportador de teste que não envia emails reais
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('=========================================');
      console.log('[EMAIL SIMULADO] Não enviando email real em ambiente de desenvolvimento');
      console.log('Para:', mailOptions.to);
      console.log('Assunto:', mailOptions.subject);
      console.log('Código de Verificação:', mailOptions.text.match(/\d{6}/)[0]);
      console.log('=========================================');
      return { messageId: 'simulado-' + Date.now() };
    }
  };
} else {
  // Em produção, configura o transportador real
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'planejadordegastosdasgalaxias@gmail.com',
      pass: process.env.GMAIL_PASS // Defina esta variável de ambiente com a senha do app ou OAuth
    }
  });
}

export const sendVerificationEmail = async (email, code) => {
  // Validação: só permite códigos numéricos de 6 dígitos
  if (!/^[0-9]{6}$/.test(code)) {
    console.error('Código de verificação inválido:', code);
    throw new Error('Código de verificação inválido. Deve ser um número de 6 dígitos.');
  }
  console.log('Preparando para enviar email de verificação...');
  console.log('Email:', email);
  console.log('Código:', code);
  
  // Configurar as opções do email
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
    console.log('ID da mensagem:', info.messageId || 'Não disponível');
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de verificação:', error);
    
    if (isDevelopment) {
      // Em desenvolvimento, não falhar se o envio de email não funcionar
      console.log('Ignorando erro de email em ambiente de desenvolvimento');
      return true;
    }
    
    throw new Error(`Falha ao enviar email de verificação: ${error.message}`);
  }
}; 