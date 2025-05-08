/**
 * Script para verificar a configuração e diagnosticar problemas
 * Uso: node scripts/check-config.js
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { sequelize } from '../models/index.js';
import mysql from 'mysql2/promise';
import dns from 'dns';
import { fileURLToPath } from 'url';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Diagnóstico do Planejador de Gastos das Galáxias');
console.log('==================================================');

// Verificar arquivo .env
console.log('\n📋 Verificando arquivo .env:');
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ Arquivo .env encontrado');
  dotenv.config();
  
  // Verificar variáveis essenciais
  const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.log(`⚠️ Variáveis faltantes no .env: ${missingVars.join(', ')}`);
  } else {
    console.log('✅ Todas as variáveis essenciais estão definidas');
  }
} else {
  console.log('❌ Arquivo .env não encontrado. Usando valores padrão.');
}

// Informações do sistema
console.log('\n💻 Informações do sistema:');
console.log(`Sistema operacional: ${os.type()} ${os.release()}`);
console.log(`Memória total: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`);
console.log(`Memória livre: ${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB`);
console.log(`CPUs: ${os.cpus().length}`);
console.log(`Carga do sistema: ${os.loadavg().join(', ')}`);
console.log(`Pasta raiz: ${rootDir}`);

// Verificar conexão com o banco de dados usando Sequelize
console.log('\n🔄 Verificando conexão com o banco de dados usando Sequelize:');
try {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'planejador',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306
  };
  
  console.log(`Tentando conectar a MySQL: ${dbConfig.user}@${dbConfig.host}/${dbConfig.database}`);
  
  await sequelize.authenticate({ timeout: 30000 });
  console.log('✅ Conexão Sequelize bem-sucedida!');
} catch (error) {
  console.log('❌ Falha na conexão Sequelize:');
  console.error(`   ${error.name}: ${error.message}`);
  if (error.original) {
    console.error(`   Erro original: ${error.original.code} - ${error.original.message}`);
  }
}

// Verificar conexão com o banco de dados usando MySQL diretamente
console.log('\n🔄 Verificando conexão direta com MySQL:');
try {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'planejador',
    connectTimeout: 10000
  });
  
  console.log('✅ Conexão MySQL direta bem-sucedida!');
  const [rows] = await connection.execute('SELECT 1 as test');
  console.log(`✅ Consulta de teste bem-sucedida: ${JSON.stringify(rows[0])}`);
  await connection.end();
} catch (error) {
  console.log('❌ Falha na conexão MySQL direta:');
  console.error(`   ${error.code}: ${error.message}`);
}

// Verificar resolução DNS
console.log('\n🔄 Verificando resolução DNS:');
const hostToCheck = process.env.DB_HOST || 'localhost';
if (hostToCheck !== 'localhost' && hostToCheck !== '127.0.0.1') {
  dns.lookup(hostToCheck, (err, address, family) => {
    if (err) {
      console.log(`❌ Falha ao resolver o host ${hostToCheck}: ${err.message}`);
    } else {
      console.log(`✅ Host ${hostToCheck} resolvido para ${address} (IPv${family})`);
    }
  });
} else {
  console.log(`✅ Host é localhost, pulando verificação DNS`);
}

// Verificar conexões de rede
const networkInterfaces = os.networkInterfaces();
console.log('\n🔄 Interfaces de rede disponíveis:');
Object.keys(networkInterfaces).forEach(iface => {
  networkInterfaces[iface].forEach(details => {
    if (details.family === 'IPv4') {
      console.log(`   ${iface}: ${details.address}`);
    }
  });
});

console.log('\n✅ Verificação completa');
console.log('Reinicie o servidor após corrigir quaisquer problemas identificados.'); 