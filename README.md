使用fastify搭建的一个简单的上传服务

## /data
> 查看data的数据

## /update
> 更新data的数据

## /read
> 读取json文件的内容
query参数：
* filepath: 文件路径

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