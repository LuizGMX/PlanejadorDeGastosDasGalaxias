import { Bank } from '../models/index.js';

const banks = [
  { name: 'Banco do Brasil', code: '001' },
  { name: 'Bradesco', code: '237' },
  { name: 'Caixa Econômica Federal', code: '104' },
  { name: 'Itaú', code: '341' },
  { name: 'Santander', code: '033' },
  { name: 'Nubank', code: '260' },
  { name: 'Inter', code: '077' },
  { name: 'C6 Bank', code: '336' },
  { name: 'Next', code: '237' },
  { name: 'PicPay', code: '380' }
];

export const seedBanks = async () => {
  try {
    await Bank.bulkCreate(banks);
    console.log('Bancos criados com sucesso!');
  } catch (error) {
    console.error('Erro ao criar bancos:', error);
    throw error;
  }
};
