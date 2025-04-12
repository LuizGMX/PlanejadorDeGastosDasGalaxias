// import { Router } from 'express';
// import { MercadoPagoConfig, Preference } from "mercadopago";
// import dotenv from 'dotenv';
// const router = Router();
// dotenv.config();

// const client = new MercadoPagoConfig({
//   accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
// });

// router.post("/create_preference", async (req, res) => {
//   try {
//     const body = {
//       items: [
//         {
//           title: req.body.title,
//           quantity: Number(req.body.quantity),
//           unit_price: Number(req.body.price),
//           currency_id: "BRL",
//         },
//       ],
//       back_urls: {
//         success: `${process.env.FRONTEND_URL}/success`,
//         failure: `${process.env.FRONTEND_URL}/failure`,
//         pending: `${process.env.FRONTEND_URL}/pending`,
//       },
//       auto_return: "approved",
//     };

//     const preference = new Preference(client);
//     const result = await preference.create({ body });
//     res.json({ id: result.id });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Erro ao criar preferência" });
//   }
// });

// export default router; 

import { Router } from 'express';
import express from 'express';
import dotenv from 'dotenv';
import Stripe from 'stripe';

const router = Router();
dotenv.config();

// Verificar se a chave do Stripe está definida
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY não está definida no arquivo .env!");
}

// Inicializar Stripe com a chave secreta


const YOUR_DOMAIN = process.env.FRONTEND_URL || 'https://planejadordasgalaxias.com.br';

router.post('/create-checkout-session', async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  try {
    const prices = await stripe.prices.list({
      lookup_keys: [req.body.lookup_key],
      expand: ['data.product'],
    });
    
    if (!prices.data || prices.data.length === 0) {
      return res.status(400).json({ error: "Produto não encontrado" });
    }
    
    const session = await stripe.checkout.sessions.create({
      billing_address_collection: 'auto',
      line_items: [
        {
          price: prices.data[0].id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}?canceled=true`,
    });

    res.redirect(303, session.url);
  } catch (error) {
    console.error("Erro ao criar sessão de checkout:", error);
    res.status(500).json({ error: "Erro interno ao processar pagamento" });
  }
});

router.post('/create-portal-session', async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ error: "ID da sessão não fornecido" });
    }
    
    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);

    const returnUrl = YOUR_DOMAIN;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: checkoutSession.customer,
      return_url: returnUrl,
    });

    res.redirect(303, portalSession.url);
  } catch (error) {
    console.error("Erro ao criar sessão do portal:", error);
    res.status(500).json({ error: "Erro interno ao acessar informações de faturamento" });
  }
});

router.post(  
  '/webhook',
  express.raw({ type: 'application/json' }),
  (request, response) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    let event = request.body;
    
    // Usar o webhook secret do arquivo .env
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // Apenas verificar o evento se tiver um endpoint secret definido
    if (endpointSecret) {
      // Obter a assinatura enviada pelo Stripe
      const signature = request.headers['stripe-signature'];
      try {
        event = stripe.webhooks.constructEvent(
          request.body,
          signature,
          endpointSecret
        );
      } catch (err) {
        console.log(`⚠️  Falha na verificação de assinatura do webhook.`, err.message);
        return response.sendStatus(400);
      }
    }
    
    let subscription;
    let status;
    
    // Processar o evento
    switch (event.type) {
      case 'customer.subscription.trial_will_end':
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Status da assinatura: ${status}.`);
        // Implementar método para lidar com o fim do período de teste
        break;
      case 'customer.subscription.deleted':
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Status da assinatura: ${status}.`);
        // Implementar método para lidar com assinatura excluída
        break;
      case 'customer.subscription.created':
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Status da assinatura: ${status}.`);
        // Implementar método para lidar com assinatura criada
        break;
      case 'customer.subscription.updated':
        subscription = event.data.object;
        status = subscription.status;
        console.log(`Status da assinatura: ${status}.`);
        // Implementar método para lidar com atualização de assinatura
        break;
      default:
        console.log(`Tipo de evento não tratado: ${event.type}.`);
    }
    
    // Retornar resposta 200 para confirmar recebimento do evento
    response.send();
  }
);

export default router; 