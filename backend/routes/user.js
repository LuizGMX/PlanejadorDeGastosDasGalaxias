import { Router } from 'express';
import { User, Bank } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// router.get('/banks', authenticate, async (req, res) => {
//   try {
//     const user = await User.findByPk(req.user.id, {
//       include: [{ model: Bank }]
//     });

//     if (!user) {
//       return res.status(404).json({ message: 'Usuário não encontrado' });
//     }

//     res.json(user.Banks);
//   } catch (error) {
//     console.error('Erro ao buscar bancos do usuário:', error);
//     res.status(500).json({ message: 'Erro ao buscar bancos do usuário' });
//   }
// });

export default router; 