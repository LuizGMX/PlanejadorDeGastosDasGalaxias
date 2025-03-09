import request from 'supertest';
import app from '../server.js';
import { jest } from '@jest/globals';
import { User, VerificationCode } from '../models/index.js';

describe('Autenticação', () => {
  beforeEach(async () => {
    await User.destroy({ where: {} });
    await VerificationCode.destroy({ where: {} });
  });

  describe('POST /api/auth/check-email', () => {
    it('deve retornar isNewUser true para email não cadastrado', async () => {
      const res = await request(app)
        .post('/api/auth/check-email')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isNewUser', true);
    });

    it('deve retornar isNewUser false para email cadastrado', async () => {
      await User.create({
        email: 'test@example.com',
        name: 'Test User',
        net_income: 5000
      });

      const res = await request(app)
        .post('/api/auth/check-email')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isNewUser', false);
      expect(res.body).toHaveProperty('name', 'Test User');
    });
  });

  describe('POST /api/auth/send-code', () => {
    it('deve enviar código de verificação para novo usuário', async () => {
      const res = await request(app)
        .post('/api/auth/send-code')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          netIncome: 5000,
          selectedBanks: ['Banco 1']
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Código enviado com sucesso!');

      const verificationCode = await VerificationCode.findOne({
        where: { email: 'test@example.com' }
      });
      expect(verificationCode).toBeTruthy();
    });
  });
}); 