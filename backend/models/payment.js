import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    subscription_expiration: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Data até quando o usuário tem acesso ao sistema'
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data em que o pagamento foi realizado'
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'refunded'),
      defaultValue: 'pending',
      allowNull: false
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Método de pagamento usado (cartão, pix, etc)'
    },
    payment_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID do pagamento no gateway (Mercado Pago)'
    },
    payment_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Valor do pagamento'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'payments'
  });

  return Payment;
}; 