const initVerification = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verifica se já existe um código válido
    const existingCode = await prisma.telegramVerification.findFirst({
      where: {
        userId: userId,
        expiresAt: {
          gt: new Date() // Verifica se a data de expiração é maior que agora
        }
      }
    });

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'Você já possui um código válido. Por favor, aguarde ele expirar ou use-o.',
        code: existingCode.code, // Retorna o código existente
        expiresAt: existingCode.expiresAt
      });
    }

    // Se não existe código válido, gera um novo
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await prisma.telegramVerification.create({
      data: {
        userId,
        code,
        expiresAt
      }
    });

    return res.json({
      success: true,
      code,
      expiresAt
    });
  } catch (error) {
    console.error('Erro ao iniciar verificação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar código de verificação'
    });
  }
}; 