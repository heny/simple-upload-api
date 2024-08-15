import Fastify from 'fastify'
import cors from '@fastify/cors'
import routes from './router/index.js'
import multipart from '@fastify/multipart';
import pino from 'pino';

const logger = pino({
  transport: {
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

fastify.listen({ port: 6600 }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`server listening on ${address}`)
})
