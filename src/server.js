import Fastify from 'fastify'
import cors from '@fastify/cors'
import routes from './router/index.js'
import multipart from '@fastify/multipart';
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  transport: isProduction ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: false,
    },
  },
  timestamp: () => {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // UTC+8
    const formattedTime = beijingTime.toISOString()
      .replace('T', ' ')
      .substring(0, 19); // 格式化为 YYYY-MM-DD HH:mm:ss
    return `,"time":"${formattedTime}"`;
  },
});

const fastify = Fastify({ logger })

fastify.register(multipart);
fastify.register(cors, {
  origin: '*',
})

fastify.register(routes)

// 导出 Fastify 实例的处理函数
export default async (req, res) => {
  await fastify.ready();
  return fastify.routing(req, res);
}
