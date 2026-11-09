/**
 * 易联云打印代理 · 腾讯云函数（事件函数）版
 * 国内可直连，微信扫码注册即可部署。
 *
 * 使用方法：
 *   1. 腾讯云 Serverless 控制台 → 函数服务 → 新建
 *      - 创建方式：从头开始
 *      - 函数类型：事件函数（不是 Web 函数）
 *      - 运行环境：Node.js 16.13（或 18）
 *   2. 函数代码 → 在线编辑：把 index.js 内容全部替换为本文件内容 → 保存
 *      高级配置 → 函数超时时间：改为 15 秒（默认 3 秒不够）
 *   3. 触发管理 → 创建触发器 → API 网关触发器
 *      - 如有「集成响应 / Integrated Response」选项，务必勾选开启
 *      - 保存后复制「访问路径」URL
 *   4. 打开打印网页 → 接口设置 → 粘贴该 URL → 保存
 */
const http = require("http");

const UPSTREAM = {
  host: "open.10ss.net",
  port: 8888,
  path: "/print.php",
  method: "POST",
};

function forward(body) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: UPSTREAM.host,
        port: UPSTREAM.port,
        path: UPSTREAM.path,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": "yly-scf-proxy/1.0",
        },
        timeout: 12000,
      },
      (up) => {
        let data = "";
        up.setEncoding("utf8");
        up.on("data", (c) => (data += c));
        up.on("end", () => resolve(data.trim()));
      }
    );
    req.on("timeout", () => req.destroy(new Error("upstream timeout")));
    req.on("error", (e) => resolve("proxy error: " + e.message));
    req.end(body);
  });
}

exports.main_handler = async (event) => {
  // 兼容 API 网关的两种传参：普通字符串 / base64
  let body = "";
  if (event) {
    if (typeof event.body === "string" && event.body.length) {
      body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;
    } else if (typeof event.body === "object" && event.body !== null) {
      // 未开启集成响应时，body 可能是解析后的对象
      const parts = [];
      for (const [k, v] of Object.entries(event.body)) {
        parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
      }
      body = parts.join("&");
    } else if (typeof event === "string") {
      body = event;
    }
  }

  const result = await forward(body);

  return {
    isBase64Encoded: false,
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: result,
  };
};
