const banks = [
  {
    name: 'Banco do Brasil',
    logo_url: '/bank-logos/bb.png',
    primaryColor: '#F8D117'
  },
  {
    name: 'Bradesco',
    logo_url: '/bank-logos/bradesco.png',
    primaryColor: '#CC092F'
  },
  {
    name: 'Caixa',
    logo_url: '/bank-logos/caixa.png',
    primaryColor: '#0070B3'
  },
  {
    name: 'Inter',
    logo_url: '/bank-logos/inter.png',
    primaryColor: '#FF7A00'
  },
  {
    name: 'Itaú',
    logo_url: '/bank-logos/itau.png',
    primaryColor: '#EC7000'
  },
  {
    name: 'Nubank',
    logo_url: '/bank-logos/nubank.png',
    primaryColor: '#820AD1'
  },
  {
    name: 'PicPay',
    logo_url: '/bank-logos/picpay.png',
    primaryColor: '#11C76F'
  },
  {
    name: 'Santander',
    logo_url: '/bank-logos/santander.png',
    primaryColor: '#EC0000'
  }
];

async function seed() {
  // Limpa os dados existentes
  await prisma.userBank.deleteMany();
  await prisma.bank.deleteMany();

  // Insere os bancos
  for (const bank of banks) {
    await prisma.bank.create({
      data: bank
    });
  }

  console.log('Seed concluído!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 