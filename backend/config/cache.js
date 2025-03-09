import { createClient } from 'redis';
import logger from './logger.js';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connected'));

await redisClient.connect();

export const getCache = async (key) => {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
};

export const setCache = async (key, value, expireInSeconds = 3600) => {
  try {
    await redisClient.set(key, JSON.stringify(value), {
      EX: expireInSeconds
    });
    return true;
  } catch (error) {
    logger.error('Cache set error:', error);
    return false;
  }
};

export const clearCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    logger.error('Cache clear error:', error);
    return false;
  }
};

export default redisClient; 