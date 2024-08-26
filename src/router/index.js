import axios from 'axios';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_ID = process.env.GITHUB_GIST_ID; // 替换为你的 Gist ID

const githubApi = axios.create({
  baseURL: 'https://api.github.com/gists',
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  },
});

export default async function routes (fastify, options) {
  // 中间件：校验 GIST_ID 和 GITHUB_TOKEN
  fastify.addHook('preHandler', (req, reply, done) => {
    if (!GITHUB_TOKEN) {
      return reply.status(500).send({ message: '缺少 GITHUB_TOKEN 环境变量' });
    }
    if (!GIST_ID) {
      return reply.status(500).send({ message: '缺少 GITHUB_GIST_ID 环境变量' });
    }
    done();
  });

  // 根路由
  fastify.get('/', () => 'Hello fastify!');

  fastify.get('/data', async (req, reply) => {
    try {
      const response = await githubApi.get(`/${GIST_ID}`);
      const data = response.data.files['data.json'].content;
      return { message: 'success', data: JSON.parse(data) };
    } catch (error) {
      return { message: '没有找到 data.json 文件' };
    }
  });

  fastify.post('/update', async (req, reply) => {
    const data = req.body;
    if (!data) return { message: '缺少参数' };

    try {
      await githubApi.patch(`/${GIST_ID}`, {
        files: {
          'data.json': {
            content: data,
          },
        },
      });
      return { message: 'success', data: data };
    } catch (error) {
      return { message: '写入失败' };
    }
  });

  fastify.get('/read', async (req, reply) => {
    const { filepath } = req.query;
    if (!filepath) return { message: '缺少参数 - filepath' };
    if (!filepath.includes('.json')) return { message: '不是json文件' };

    try {
      const response = await githubApi.get(`/${GIST_ID}`);
      const data = response.data.files[filepath]?.content;
      if (!data) throw new Error('文件不存在');
      return { message: 'success', data: JSON.parse(data) };
    } catch (error) {
      return { message: '没有找到文件' };
    }
  });



  fastify.post('/update-file', async (req, reply) => {
    // 必须解析
    const { data, filePath } = JSON.parse(req.body) || {};
    console.log('hhh - filePath', filePath)
    if (!data) return { message: '缺少参数 - data' };
    if (!filePath) return { message: '缺少参数 - filePath' };

    try {
      await githubApi.patch(`/${GIST_ID}`, {
        files: {
          [filePath]: {
            // 传入gist 的必须stringify
            content: JSON.stringify(data),
          },
        },
      });
      return { message: 'success', data: data };
    } catch (error) {
      return { message: '写入失败' };
    }
  })

  fastify.post('/upload', async (req, reply) => {
    const data = await req.file();
    const name = data.fields.name?.value || data.filename;

    if (!name.endsWith('.json')) {
      return reply.status(400).send({ message: '仅支持上传json文件' });
    }

    try {
      const content = await streamToString(data.file);

      await githubApi.patch(`/${GIST_ID}`, {
        files: {
          [name]: { content },
        },
      });

      reply.send({ message: '文件上传成功', filename: name });
    } catch (error) {
      console.error(error);
      reply.status(500).send({ message: '上传失败' });
    }
  });
}

// 辅助函数：将可读流转换为字符串
const streamToString = (stream) => new Promise((resolve, reject) => {
  const chunks = [];
  stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  stream.on('error', reject);
});