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
  { name: 'PicPay', code: '380' },
  { name: 'Banco Safra', code: '422' },
  { name: 'Banco Votorantim', code: '655' },
  { name: 'Banco Pan', code: '623' },
  { name: 'Banco Original', code: '212' },
  { name: 'Banco Neon', code: '735' },
  { name: 'Banco BMG', code: '318' },
  { name: 'Banco Daycoval', code: '707' },
  { name: 'Banco Sofisa', code: '637' },
  { name: 'Banco Modal', code: '746' },
  { name: 'Banco Bari', code: '330' },
  { name: 'Banco Topázio', code: '082' },
  { name: 'Banco Sicoob', code: '756' },
  { name: 'Banco Sicredi', code: '748' },
  { name: 'Banco Mercantil do Brasil', code: '389' },
  { name: 'Banco Banestes', code: '021' },
  { name: 'Banco Banrisul', code: '041' },
  { name: 'Banco do Nordeste', code: '004' },
  { name: 'Banco da Amazônia', code: '003' },
  { name: 'Banco Triângulo', code: '634' },
  { name: 'Banco Rendimento', code: '633' },
  { name: 'Outro', code: '000' }

];

export const seedBanks = async () => {
  try {
    await Bank.bulkCreate(banks);
    console.log(`${banks.length} Bancos criados com sucesso!`);
  } catch (error) {
    console.error('Erro ao criar bancos:', error);
    throw error;
  }
};
