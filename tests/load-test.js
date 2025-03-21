import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas personalizadas
const errorRate = new Rate('errors');

// Configuração do teste
export const options = {
  scenarios: {
    // Teste de criação de contas
    create_accounts: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 200,
      stages: [
        { duration: '30s', target: 16 }, // ~1000 por minuto
        { duration: '1m', target: 16 },  // Manter 1000 por minuto
        { duration: '30s', target: 0 },  // Rampa de descida
      ],
    },
    // Teste de criação de despesas
    create_expenses: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 200,
      stages: [
        { duration: '30s', target: 16 }, // ~1000 por minuto
        { duration: '1m', target: 16 },  // Manter 1000 por minuto
        { duration: '30s', target: 0 },  // Rampa de descida
      ],
      startTime: '2m30s', // Começa após o teste de contas
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% das requisições devem completar em 2s
    http_req_failed: ['rate<0.1'],     // Menos de 10% de falhas
    errors: ['rate<0.1'],              // Taxa de erro personalizada
  },
};

// Função auxiliar para gerar dados aleatórios
function generateRandomData() {
  const timestamp = Date.now();
  return {
    email: `user_${timestamp}@test.com`,
    password: 'Test@123',
    name: `Test User ${timestamp}`,
    description: `Test Expense ${timestamp}`,
    amount: Math.floor(Math.random() * 1000) + 1,
    category_id: 1,
    subcategory_id: 1,
    bank_id: 1,
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: Math.random() > 0.5 ? 'card' : 'pix',
  };
}

// Função para criar conta
function createAccount() {
  const data = generateRandomData();
  const payload = JSON.stringify({
    email: data.email,
    name: data.name,    
    selectedBanks: [1] // Banco de exemplo
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post('http://localhost:3000/api/auth/send-code', payload, params);
  
  const success = check(res, {
    'Registro bem sucedido': (r) => r.status === 200,
  });

  if (!success) {
    errorRate.add(1);
    console.log(`Erro no registro: ${res.status} - ${res.body}`);
  }

  return res;
}

// Função para criar despesa
function createExpense(token) {
  const data = generateRandomData();
  const payload = JSON.stringify({
    description: data.description,
    amount: data.amount,
    category_id: data.category_id,
    subcategory_id: data.subcategory_id,
    bank_id: data.bank_id,
    expense_date: data.expense_date,
    payment_method: data.payment_method,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.post('http://localhost:3000/api/expenses', payload, params);
  
  const success = check(res, {
    'Criação de despesa bem sucedida': (r) => r.status === 201,
  });

  if (!success) {
    errorRate.add(1);
    console.log(`Erro na criação de despesa: ${res.status} - ${res.body}`);
  }
}

// Função principal de teste
export default function () {
  // Obtém o nome do cenário de forma segura
  const scenario = __ENV.SCENARIO || 'create_accounts';
  
  if (scenario === 'create_accounts') {
    createAccount();
  } else if (scenario === 'create_expenses') {
    // Primeiro faz login para obter o token
    const loginData = generateRandomData();
    const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
      email: loginData.email,
      password: loginData.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (loginRes.status === 200) {
      const token = JSON.parse(loginRes.body).token;
      createExpense(token);
    } else {
      errorRate.add(1);
      console.log(`Erro no login: ${loginRes.status} - ${loginRes.body}`);
    }
  }

  // Pequena pausa entre requisições para evitar sobrecarga
  sleep(0.1);
} 