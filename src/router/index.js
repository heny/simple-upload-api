import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'node:stream';
import util from 'node:util';

const pump = util.promisify(pipeline);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bookmarksPath = path.join(__dirname, '../data/bookmarks.json');
const bookmarksDir = path.dirname(bookmarksPath); // 获取目录路径

export default async function routes (fastify, options) {
  // 确保目录存在
  fs.promises.mkdir(bookmarksDir, { recursive: true });

  // 根路由
  fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
  });

  // 获取 bookmarks.json 内容
  fastify.get('/data/bookmarks', async (request, reply) => {
    const data = await fs.promises.readFile(bookmarksPath, 'utf-8');
    return JSON.parse(data);
  });

  // 上传文件并替换 bookmarks.json
  fastify.post('/data/upload', async (req, reply) => {
    const data = await req.file(); // 获取上传的文件

    // 保存文件
    await pump(data.file, fs.createWriteStream(bookmarksPath));
    console.log('hhh - 成功了');
    reply.send({ message: 'Bookmarks replaced successfully' });
  });
}