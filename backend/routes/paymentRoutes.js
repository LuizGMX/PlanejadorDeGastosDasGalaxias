import express from 'express';
import { authenticate } from '../middleware/auth.js';
import paymentController from '../controllers/paymentController.js';

const router = express.Router();

// Rotas que requerem autenticação
router.get('/status', authenticate, paymentController.getSubscriptionStatus);
router.post('/create', authenticate, paymentController.createPayment);
router.get('/check-payment/:paymentId', authenticate, paymentController.checkPaymentStatus);

// Rotas de callback do pagamento
router.get('/success', paymentController.handlePaymentSuccess);
router.get('/failure', paymentController.handlePaymentFailure);
router.get('/pending', paymentController.handlePaymentPending);

// Webhook do Mercado Pago (não requer autenticação)
router.post('/webhook', paymentController.processPaymentWebhook);

export default router; 