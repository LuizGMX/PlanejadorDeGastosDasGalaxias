# Planejador de Gastos das Galáxias

Sistema de gerenciamento financeiro pessoal que permite aos usuários controlar despesas, receitas e acompanhar suas metas financeiras.

## Funcionalidades

- Controle de despesas e receitas
- Categorização de transações
- Metas financeiras
- Relatórios e gráficos
- Sistema de assinatura (novo)

## Sistema de Assinatura

O sistema de assinatura foi implementado com as seguintes características:

- Período de teste gratuito de 7 dias para novos usuários
- Assinatura anual de R$ 99,90
- Integração com Mercado Pago
- Notificação de expiração da assinatura
- Bloqueio de acesso após expiração

### Funcionamento

1. Ao criar uma conta, o usuário tem acesso gratuito por 7 dias
2. Após esse período, é necessário realizar o pagamento para continuar utilizando o sistema
3. O pagamento é processado pelo Mercado Pago
4. Quando o pagamento é confirmado, a assinatura é renovada por 12 meses

## Configuração do Ambiente

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Tecnologias Utilizadas

- React (Frontend)
- Node.js (Backend)
- Express (API)
- MySQL (Banco de Dados)
- Sequelize (ORM)
- Mercado Pago (Pagamentos)

## Estrutura de Diretórios

- `backend/`: Código do servidor
  - `models/`: Modelos do banco de dados
  - `routes/`: Rotas da API
  - `middleware/`: Middlewares
  - `services/`: Serviços
- `frontend/`: Código da interface
  - `src/components/`: Componentes React
  - `src/styles/`: Arquivos CSS
  - `src/contexts/`: Contextos React 