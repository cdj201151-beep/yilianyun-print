# 易联云多终端打印 PWA

在线地址：https://cdj201151-beep.github.io/yilianyun-print/

## 功能

- 多台打印机终端管理（添加 / 切换 / 删除），数据保存在本机 localStorage
- 输入小票内容，发送到选中的易联云打印机
- **检测状态**：手动查询选中终端，显示 🟢 在线 / 🔴 离线（另有 🟠 缺纸）
- PWA：可添加到手机主屏幕，离线打开

## 关于「检测状态」为什么需要代理

易联云的终端状态接口是给服务器调用的，浏览器拿不到：

| 接口 | 可用性 | 浏览器能否直连 |
|------|--------|----------------|
| `http://open.10ss.net:8888/getstatus.php`（partner 老接口，当前账号可用） | 可用，返回 `status:1` | ❌ 只有 HTTP、非标准端口、无跨域头 |
| `https://open-api.10ss.net/printer/getprintstatus`（新版开放平台） | 需要 client_id + access_token | ❌ 无跨域头 |

GitHub Pages 是 HTTPS 页面，直连 `http://` 会被「混合内容」拦截，即使同协议也会被 CORS 拦截。所以页面内置了**代理地址**配置：部署一个几十行的转发服务，把地址填进页面即可。

### 方案 A：Cloudflare Worker（免费，无需服务器）

1. 打开 https://dash.cloudflare.com → Workers & Pages → Create → Worker
2. 把 `proxy/worker.js` 的内容整段粘贴进去，Deploy
3. 复制 `https://xxxx.workers.dev` 地址
4. 打开网页 →「接口设置」→ 填 `https://xxxx.workers.dev/?url=` → 保存

> Worker 用 `cloudflare:sockets` 走 TCP，因为普通 fetch 不允许非标准端口。

### 方案 B：自己的服务器 / 宝塔 / 群晖

```bash
node proxy/node-proxy.js          # 默认 8787 端口
```

网页「接口设置」填 `http://你的IP:8787/?url=`（网页是 HTTPS 时，代理也需配 HTTPS）。

## 本地开发

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 目录

```
index.html          主页面（单文件应用）
manifest.json       PWA 清单
sw.js               Service Worker（静态资源缓存，不拦截打印/状态接口）
icons/              各尺寸图标
proxy/worker.js     Cloudflare Worker 状态代理
proxy/node-proxy.js Node 状态代理
```
