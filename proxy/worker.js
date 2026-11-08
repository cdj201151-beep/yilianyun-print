/**
 * 易联云状态查询代理 · Cloudflare Worker 版
 *
 * 背景：易联云状态接口 http://open.10ss.net:8888/getstatus.php
 *      只有 HTTP + 8888 端口且无跨域头，浏览器无法直接访问。
 * 本 Worker 用 TCP Socket 转发请求（普通 fetch 不支持非标准端口）。
 *
 * 部署：dash.cloudflare.com → Workers & Pages → 创建 Worker → 粘贴本文件 →
 *      部署 → 复制形如 https://xxxx.workers.dev 的地址。
 * 用法：把 https://xxxx.workers.dev/?url= 填到网页「接口设置」里。
 *
 * 请求：POST 本 Worker，body 为 partner=..&machine_code=..&sign=.. 原样转发。
 * 返回：原接口文本，如 status:1
 */
import { connect } from "cloudflare:sockets";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== "POST") {
      return new Response("use POST", { status: 405, headers: CORS });
    }

    const body = await request.text();
    const len = new TextEncoder().encode(body).length;

    const socket = connect({ hostname: "open.10ss.net", port: 8888 }, { allowHalfOpen: false });
    const writer = socket.writable.getWriter();
    const head =
      "POST /getstatus.php HTTP/1.1\r\n" +
      "Host: open.10ss.net:8888\r\n" +
      "User-Agent: yly-pwa-proxy/1.0\r\n" +
      "Content-Type: application/x-www-form-urlencoded\r\n" +
      "Content-Length: " + len + "\r\n" +
      "Connection: close\r\n\r\n";
    await writer.write(new TextEncoder().encode(head + body));
    await writer.close();

    const reader = socket.readable.getReader();
    const decoder = new TextDecoder();
    let raw = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
      if (raw.length > 65536) break;
    }
    try { await socket.close(); } catch (e) {}

    const idx = raw.indexOf("\r\n\r\n");
    let payload = idx >= 0 ? raw.slice(idx + 4) : raw;
    // 处理 chunked 编码
    if (/transfer-encoding:\s*chunked/i.test(raw)) {
      payload = payload
        .split(/\r\n/)
        .filter((line) => line && !/^[0-9a-fA-F]+$/.test(line))
        .join("");
    }
    return new Response(payload.trim(), {
      headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
