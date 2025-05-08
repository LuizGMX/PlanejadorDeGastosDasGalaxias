import { hash } from '../utils/encryption.js';

const maskEmail = (email) => {
  if (!email) return null;
  const [username, domain] = email.split('@');
  const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
  return `${maskedUsername}@${domain}`;
};

const maskName = (name) => {
  if (!name) return null;
  const parts = name.split(' ');
  return parts.map(part => {
    if (part.length <= 2) return part;
    return part.charAt(0) + '*'.repeat(part.length - 2) + part.charAt(part.length - 1);
  }).join(' ');
};

const maskTelegramData = (data) => {
  if (!data) return null;
  return data.charAt(0) + '*'.repeat(data.length - 2) + data.charAt(data.length - 1);
};

const maskBankData = (data) => {
  if (!data) return null;
  return data.charAt(0) + '*'.repeat(data.length - 2) + data.charAt(data.length - 1);
};

export const maskSensitiveData = (req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (data) {
      // Mascarar dados de usuário
      if (data.user) {
        data.user = {
          ...data.user,
          email: maskEmail(data.user.email),
          name: maskName(data.user.name),
          telegram_chat_id: maskTelegramData(data.user.telegram_chat_id),
          telegram_username: maskTelegramData(data.user.telegram_username)
        };
      }

      // Mascarar dados de banco
      if (data.bank) {
        data.bank = {
          ...data.bank,
          name: maskBankData(data.bank.name),
          code: maskBankData(data.bank.code)
        };
      }

      // Mascarar dados em arrays
      if (Array.isArray(data)) {
        data = data.map(item => {
          if (item.user) {
            item.user = {
              ...item.user,
              email: maskEmail(item.user.email),
              name: maskName(item.user.name),
              telegram_chat_id: maskTelegramData(item.user.telegram_chat_id),
              telegram_username: maskTelegramData(item.user.telegram_username)
            };
          }
          if (item.bank) {
            item.bank = {
              ...item.bank,
              name: maskBankData(item.bank.name),
              code: maskBankData(item.bank.code)
            };
          }
          return item;
        });
      }
    }
    return originalJson.call(this, data);
  };
  next();
}; 