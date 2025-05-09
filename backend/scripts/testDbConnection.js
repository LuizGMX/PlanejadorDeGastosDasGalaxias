import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configurações do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'planejador',
  connectTimeout: 10000
};

async function testConnection() {
  console.log('Testando conexão com o banco de dados:');
  console.log('Configurações:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    password: dbConfig.password ? '******' : '<vazio>'
  });

  try {
    // Conectar ao banco de dados
    console.log('Tentando conectar...');
    const connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Conexão com o MySQL estabelecida com sucesso!');
    
    // Testar se o banco de dados existe
    try {
      const [rows] = await connection.execute('SHOW DATABASES LIKE ?', [dbConfig.database]);
      if (rows.length > 0) {
        console.log(`✅ Banco de dados '${dbConfig.database}' existe!`);
      } else {
        console.log(`❌ Banco de dados '${dbConfig.database}' não existe!`);
        console.log('Tentando criar o banco de dados...');
        
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        console.log(`✅ Banco de dados '${dbConfig.database}' criado com sucesso!`);
      }
    } catch (dbError) {
      console.error('❌ Erro ao verificar banco de dados:', dbError.message);
    }
    
    // Fechar conexão
    await connection.end();
    console.log('Conexão fechada.');
    
  } catch (error) {
    console.error('❌ ERRO AO CONECTAR:', error.message);
    console.error('Stack trace:', error.stack);
    
    console.log('\n=== POSSÍVEIS SOLUÇÕES ===');
    console.log('1. Verifique se o MySQL está rodando');
    console.log('2. Verifique as credenciais no arquivo .env');
    console.log('3. Verifique se o host está correto (localhost ou IP)');
    console.log('4. Verifique se a porta está correta (normalmente 3306)');
    console.log('5. Verifique permissões do usuário MySQL');
  }
}

// Executar o teste
testConnection(); 