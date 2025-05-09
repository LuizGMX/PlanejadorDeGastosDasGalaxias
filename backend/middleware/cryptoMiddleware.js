import { encrypt, decrypt } from '../utils/cryptoUtils.js';

/**
 * Middleware para criptografar dados sensíveis antes de salvar
 * @param {Object} model - Modelo Sequelize
 * @param {Array} fields - Campos a serem criptografados
 * @returns {Function} - Função de middleware
 */
export const encryptFields = (fields) => {
  return (model) => {
    // Adiciona hook beforeSave para criptografar campos
    model.beforeSave(async (instance) => {
      if (!instance.id) return; // Pula se não tiver ID (necessário para o userId)
      
      for (const field of fields) {
        if (instance.changed(field) && instance[field]) {
          instance[field] = encrypt(instance[field].toString(), instance.id.toString());
        }
      }
    });

    // Adiciona getter para descriptografar valores
    for (const field of fields) {
      const originalGetMethod = model.prototype.__proto__.__lookupGetter__(field);
      
      Object.defineProperty(model.prototype, field, {
        get: function() {
          const encryptedValue = this.getDataValue(field);
          if (!encryptedValue || !this.id) return originalGetMethod ? originalGetMethod.call(this) : encryptedValue;
          
          const decryptedValue = decrypt(encryptedValue, this.id.toString());
          return decryptedValue || (originalGetMethod ? originalGetMethod.call(this) : encryptedValue);
        },
        set: function(value) {
          this.setDataValue(field, value);
        }
      });
    }
  };
}; 