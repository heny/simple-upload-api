import Fastify from 'fastify'
import cors from '@fastify/cors'
import routes from './router'
import multipart from '@fastify/multipart';
import { inject } from '@vercel/analytics';
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

inject();

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

// 检查环境变量 LOCAL
const isLocal = process.env.LOCAL === 'true';

if(isLocal) {
  // 与vercel 不同，不运行vercel dev 则要手动启
  fastify.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
    fastify.log.info(`server listening on ${address}`)
  })
}

// 导出 Fastify 实例的处理函数
export default async (req, res) => {
  await fastify.ready();
  return fastify.routing(req, res);
}
