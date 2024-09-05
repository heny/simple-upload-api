import axios from 'axios';
import qiniu from 'qiniu';

const QINIU_ACCESS_KEY = process.env.QINIU_ACCESS_KEY;
const QINIU_SECRET_KEY = process.env.QINIU_SECRET_KEY;
const QINIU_BUCKET = process.env.QINIU_BUCKET;
const QINIU_DOMAIN = process.env.QINIU_DOMAIN;
const QINIU_ROOT_DIR = process.env.QINIU_ROOT_DIR;

const mac = new qiniu.auth.digest.Mac(QINIU_ACCESS_KEY, QINIU_SECRET_KEY);
const config = new qiniu.conf.Config();
const bucketManager = new qiniu.rs.BucketManager(mac, config);

export default async function routes (fastify, options) {
  // 中间件：校验七牛云配置
  fastify.addHook('preHandler', (req, reply, done) => {
    if (!QINIU_ACCESS_KEY || !QINIU_SECRET_KEY || !QINIU_BUCKET || !QINIU_DOMAIN || !QINIU_ROOT_DIR) {
      return reply.status(500).send({ message: '缺少七牛云配置环境变量' });
    }
    done();
  });

  // 根路由
  fastify.get('/', () => 'Hello fastify!');

  fastify.get('/data', async (req, reply) => {
    try {
      const key = `${QINIU_ROOT_DIR}/data.json`;
      const result = await getFileContent(key);
      const data = typeof result === 'string' ? JSON.parse(result) : result;
      return { message: 'success', data };
    } catch (error) {
      return { message: `没有找到 ${QINIU_ROOT_DIR}/data.json 文件` };
    }
  });

  fastify.post('/update', async (req, reply) => {
    const data = req.body;
    if (!data) return { message: '缺少参数' };

    try {
      const key = `${QINIU_ROOT_DIR}/data.json`;
      await uploadFile(key, JSON.stringify(data));
      return { message: 'success', data: data };
    } catch (error) {
      return { message: '写入失败' };
    }
  });

  fastify.get('/read', async (req, reply) => {
    const { filepath } = req.query as { filepath?: string };
    if (!filepath) return { message: '缺少参数 - filepath' };
    if (!filepath.includes('.json')) return { message: '不是json文件' };

    try {
      const key = `${QINIU_ROOT_DIR}/${filepath}`;
      const result = await getFileContent(key);
      const data = typeof result === 'string' ? JSON.parse(result) : result;
      return { message: 'success', data };
    } catch (error) {
      return { message: `没有找到 ${QINIU_ROOT_DIR}/${filepath} 文件` };
    }
  });

  fastify.post('/update-file', async (req, reply) => {
    const { data, filePath } = JSON.parse(req.body as string) || {};
    console.log('hhh - filePath', filePath)
    if (!data) return { message: '缺少参数 - data' };
    if (!filePath) return { message: '缺少参数 - filePath' };

    try {
      const key = `${QINIU_ROOT_DIR}/${filePath}`;
      await uploadFile(key, JSON.stringify(data));
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
      const key = `${QINIU_ROOT_DIR}/${name}`;
      await uploadFile(key, content);
      reply.send({ message: '文件上传成功', filename: key });
    } catch (error) {
      console.error(error);
      reply.status(500).send({ message: '上传失败' });
    }
  });
}

// 辅助函数：将可读流转换为字符串
const streamToString = (stream: NodeJS.ReadableStream): Promise<string> => new Promise((resolve, reject) => {
  const chunks: Buffer[] = [];
  stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  stream.on('error', reject);
});

// 辅助函数：从七牛云获取文件内容
const getFileContent = (key: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const publicDownloadUrl = bucketManager.publicDownloadUrl(QINIU_DOMAIN, key);
    console.log('hhh - publicDownloadUrl', publicDownloadUrl)
    axios.get(publicDownloadUrl)
      .then(response => {
        if (response.status === 200) {
          resolve(response.data);
        } else {
          reject(new Error(`获取文件失败，状态码：${response.status}`));
        }
      })
      .catch(error => {
        if (error.response && error.response.status === 404) {
          reject(new Error(`文件不存在：${key}`));
        } else {
          reject(new Error(`获取文件失败：${error.message}`));
        }
      });
  });
};

// 辅助函数：上传文件到七牛云
const uploadFile = (key: string, content: string): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const putPolicy = new qiniu.rs.PutPolicy({
      scope: QINIU_BUCKET + ':' + key,
    });
    const uploadToken = putPolicy.uploadToken(mac);
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    formUploader.put(uploadToken, key, content, putExtra, (err, respBody, respInfo) => {
      if (err) {
        reject(err);
      } else if (respInfo.statusCode === 200) {
        resolve(respBody);
      } else {
        reject(new Error('上传失败'));
      }
    });
  });
};