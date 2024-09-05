import Fastify, { FastifyError, FastifyListenOptions } from 'fastify'
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
      messageKey: 'msg',  // 添加这行
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
  // 定义一个函数来尝试监听端口
  const tryListen = (port: number) => {
    const opts: FastifyListenOptions = { port, host: '0.0.0.0' };
    fastify.listen(opts, (err, address) => {
      if (err) {
        if ((err as FastifyError).code === 'EADDRINUSE') {
          fastify.log.warn(`端口 ${port} 已被占用,尝试下一个端口...`);
          tryListen(port + 1);
        } else {
          fastify.log.error(err);
          process.exit(1);
        }
      } else {
        fastify.log.info(`服务器正在监听 http://localhost:${port}`);
      }
    });
  };

  // 从3000端口开始尝试
  tryListen(3000);
}

// 导出 Fastify 实例的处理函数
export default async (req, res) => {
  await fastify.ready();
  return fastify.routing(req, res);
}
