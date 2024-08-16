import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'node:stream';
import util from 'node:util';

const pump = util.promisify(pipeline);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');

export default async function routes (fastify, options) {
  // 确保目录存在
  fs.promises.mkdir(dataDir, { recursive: true });

  // 根路由
  fastify.get('/', () => 'Hello fastify!');

  fastify.get('/data', async (req, reply) => {
    const dataPath = path.join(dataDir, 'data.json');
    try {
      const data = await fs.promises.readFile(dataPath, 'utf-8');
      return { message: 'success', data: JSON.parse(data) };
    } catch (error) {
      return { message: '没有找到 data.json 文件' };
    }
  })

  fastify.post('/update', async (req, reply) => {
    const data = req.body;
    console.log('hhh - req.body', data)
    if (!data) return { message: '缺少参数' }

    const dataPath = path.join(dataDir, 'data.json');
    try {
      await fs.promises.writeFile(dataPath, data, 'utf-8');
      return { message: 'success', data: JSON.parse(data) };
    } catch (error) {
      return { message: '写入失败' }
    }
  })

  /**
   * filepath
   */
  fastify.get('/read', async (req, reply) => {
    const { filepath } = req.query

    if (!filepath) return { message: '缺少参数' }

    if (!filepath.includes('.json')) return { message: '不是json文件' }

    const fileFullPath = path.join(dataDir, filepath); // 构建文件路径
    try {
      await fs.promises.access(fileFullPath, fs.constants.F_OK);
      const data = await fs.promises.readFile(fileFullPath, 'utf-8');
      return { message: 'success', data: JSON.parse(data) };
    } catch (error) {
      return { message: '没有找到文件' }
    }
  });

  /**
   * 上传文件并替换 bookmarks.json
   * name: 文件名
   * dir: 目录
   */
  fastify.post('/upload', async (req, reply) => {
    const data = await req.file(); // 获取上传的文件
    const name = data.fields.name?.value || data.filename; // 直接获取 name
    const dir = data.fields.dir?.value || ''; // 直接获取 dir，默认为空
    console.log('hhh - name, dir', name, dir)

    if(!name.includes('.json')) return { message: '仅支持上传json文件' }

    const bookmarksPath = path.join(dataDir, dir, name);

    // 创建目录（如果不存在）
    await fs.promises.mkdir(path.dirname(bookmarksPath), { recursive: true });

    // 保存文件
    await pump(data.file, fs.createWriteStream(bookmarksPath));
    // console.log('hhh - 成功了');
    reply.send({ message: 'Bookmarks replaced successfully' });
  });
}