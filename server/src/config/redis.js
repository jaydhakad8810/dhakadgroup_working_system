const { createClient } = require('redis');
require('dotenv').config();

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      socket: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT) || 6379 },
    });
    redisClient.on('error', () => { redisClient = null; });
    await redisClient.connect();
    console.log('✅ Redis connected');
  } catch {
    console.log('⚠️  Redis unavailable — running without cache');
    redisClient = null;
  }
};

const getRedis = () => redisClient;

module.exports = { connectRedis, getRedis };
