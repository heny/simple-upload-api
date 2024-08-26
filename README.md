# 简单的上传服务

使用fastify搭建的一个简单的上传json服务
本项目使用vercel部署

## 部署方式
1. 注册并登录 [vercel](https://vercel.com/)

2. 导入该项目

3. 在vercel上配置环境变量
  * GITHUB_TOKEN: github setting -> developer settings -> personal access tokens -> tokens(classic) -> generate new token
  * GIST_ID: github gist -> new gist -> public -> 名字输入data.json 随便输入内容后进入详情并复制url上面最后一部分的id

4. 部署即可

如果不通过vercel部署，则使用 cross-env 配置环境变量
```bash
cross-env GITHUB_TOKEN=xxx GIST_ID=xxx node src/server.js
```

## /data
> 查看data的数据

## /update
> 更新data的数据

## /read
> 读取json文件的内容
query参数：
* filepath: 文件路径

## /update-file
data
filePath 注意大写

## /upload
> 以文件的形式存储json文件
formdata参数
```js
  const bookmarksData = JSON.stringify(content, null, 2)
  const blob = new Blob([bookmarksData], { type: 'application/json' })

  const formData = new FormData()
  formData.append('file', blob, 'data.json')
  formData.append('name', 'data.json')
  formData.append('dir', '')

  fetch(href, { method: 'POST', body: formData, })
    .then(res => res.json())
    .then(() => alert('上传成功'))
    .catch(() => alert('上传失败'))
```