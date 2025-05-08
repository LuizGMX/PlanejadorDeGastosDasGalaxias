import { sequelize } from '../models/index.js';

const createAuditLog = async (req, action, details) => {
  try {
    const userId = req.user?.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const timestamp = new Date();

    await sequelize.models.AuditLog.create({
      user_id: userId,
      action,
      details: JSON.stringify(details),
      ip_address: ip,
      user_agent: userAgent,
      timestamp
    });
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
  }
};

export const auditLogMiddleware = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = async function(data) {
      try {
        await createAuditLog(req, action, {
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          body: req.body,
          response: data
        });
      } catch (error) {
        console.error('Erro no middleware de auditoria:', error);
      }
      return originalJson.call(this, data);
    };
    next();
  };
}; 