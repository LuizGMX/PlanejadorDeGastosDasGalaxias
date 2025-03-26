const getAllBanks = async (req, res) => {
  try {
    const banks = await prisma.bank.findMany({
      select: {
        id: true,
        name: true,
        logo_url: true,
        primaryColor: true
      }
    });
    res.json(banks);
  } catch (error) {
    console.error('Erro ao buscar bancos:', error);
    res.status(500).json({ message: 'Erro ao buscar bancos' });
  }
};

const getFavoriteBanks = async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await prisma.userBank.findMany({
      where: {
        userId: userId,
        isActive: true
      },
      select: {
        bank: {
          select: {
            id: true,
            name: true,
            logo_url: true,
            primaryColor: true
          }
        }
      }
    });

    res.json(favorites.map(f => f.bank));
  } catch (error) {
    console.error('Erro ao buscar bancos favoritos:', error);
    res.status(500).json({ message: 'Erro ao buscar bancos favoritos' });
  }
}; 