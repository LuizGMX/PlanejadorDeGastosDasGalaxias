/**
 * Script para diagnosticar problemas de rede que podem estar causando timeouts
 * Uso: node scripts/diagnose-network.js
 */

import dns from 'dns';
import { exec } from 'child_process';
import os from 'os';
import http from 'http';
import net from 'net';
import dotenv from 'dotenv';
import { promisify } from 'util';

dotenv.config();

const execPromise = promisify(exec);
const dnsLookupPromise = promisify(dns.lookup);
const dnsResolvePromise = promisify(dns.resolve);

async function checkDNS() {
  console.log('\n🔍 Verificando resolução DNS:');
  const hosts = [
    'localhost',
    'google.com',
    'mysql.com',
    process.env.DB_HOST || 'localhost'
  ];

  for (const host of hosts) {
    try {
      if (host !== 'localhost' && host !== '127.0.0.1') {
        const result = await dnsLookupPromise(host);
        console.log(`✅ Resolução de ${host}: ${result.address} (IPv${result.family})`);
      } else {
        console.log(`✅ ${host} é local, pulando verificação DNS`);
      }
    } catch (error) {
      console.error(`❌ Falha ao resolver ${host}: ${error.message}`);
    }
  }
}

async function pingHosts() {
  console.log('\n🔍 Verificando ping para hosts importantes:');
  
  const hosts = [
    'google.com',
    'cloudflare.com',
    process.env.DB_HOST || 'localhost'
  ];

  for (const host of hosts) {
    try {
      // Usar timeout para não bloquear por muito tempo (3 segundos)
      const pingCmd = os.platform() === 'win32' 
        ? `ping -n 3 -w 3000 ${host}` 
        : `ping -c 3 -W 3 ${host}`;
      
      const { stdout } = await execPromise(pingCmd);
      console.log(`✅ Ping para ${host}:\n${stdout.split('\n').slice(0, 4).join('\n')}`);
    } catch (error) {
      console.error(`❌ Falha ao pingar ${host}: ${error.message}`);
    }
  }
}

async function checkMySQLConnection() {
  console.log('\n🔍 Verificando conexão TCP com MySQL:');
  
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    // Definir timeout para 5 segundos
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log(`✅ Conexão TCP com MySQL em ${host}:${port} estabelecida com sucesso`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.error(`❌ Timeout ao conectar com MySQL em ${host}:${port}`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (error) => {
      console.error(`❌ Erro ao conectar com MySQL em ${host}:${port}: ${error.message}`);
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function checkHTTPConnections() {
  console.log('\n🔍 Verificando conexões HTTP:');
  
  const urls = [
    'http://google.com',
    'https://cloudflare.com',
    'https://mysql.com'
  ];
  
  for (const url of urls) {
    try {
      await new Promise((resolve, reject) => {
        const request = http.get(url, { timeout: 5000 }, (response) => {
          console.log(`✅ Conexão com ${url}: Status ${response.statusCode}`);
          response.destroy();
          resolve();
        });
        
        request.on('error', (error) => {
          console.error(`❌ Falha ao conectar com ${url}: ${error.message}`);
          reject(error);
        });
        
        request.on('timeout', () => {
          console.error(`❌ Timeout ao conectar com ${url}`);
          request.destroy();
          reject(new Error('Timeout'));
        });
      });
    } catch (error) {
      // Erro já foi tratado nos handlers acima
    }
  }
}

async function checkLocalDbConnection() {
  console.log('\n🔍 Verificando se o MySQL está rodando localmente:');
  
  try {
    const { stdout, stderr } = await execPromise('tasklist | findstr mysql');
    if (stdout) {
      console.log(`✅ Processos MySQL encontrados:\n${stdout}`);
    } else {
      console.log('❌ Nenhum processo MySQL encontrado');
    }
  } catch (error) {
    // Em sistemas Unix, usar ps
    try {
      const { stdout, stderr } = await execPromise('ps aux | grep mysql');
      if (stdout) {
        console.log(`✅ Processos MySQL encontrados:\n${stdout.split('\n').slice(0, 3).join('\n')}`);
      } else {
        console.log('❌ Nenhum processo MySQL encontrado');
      }
    } catch (error) {
      console.error('❌ Não foi possível verificar processos MySQL:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 Iniciando diagnóstico de rede para Planejador de Gastos das Galáxias');
  console.log('==============================================================');
  
  console.log('\n💻 Informações do sistema:');
  console.log(`Sistema: ${os.type()} ${os.release()}`);
  console.log(`Hostname: ${os.hostname()}`);
  
  // Verificar interfaces de rede
  console.log('\n🔍 Interfaces de rede:');
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach((iface) => {
    interfaces[iface].forEach((details) => {
      if (details.family === 'IPv4') {
        console.log(`${iface}: ${details.address}`);
      }
    });
  });
  
  await checkDNS();
  await pingHosts();
  await checkMySQLConnection();
  await checkHTTPConnections();
  await checkLocalDbConnection();
  
  console.log('\n✅ Diagnóstico de rede concluído');
  console.log('Use estas informações para identificar problemas na conectividade');
}

main().catch(console.error); 