/**
 * 易联云状态查询代理 · Node.js 版（适用于有服务器/宝塔/群晖的环境）
 *
 * 用法：
 *   node node-proxy.js            # 默认监听 8787
 *   PORT=9000 node node-proxy.js
 *
 * 网页「接口设置」里填：http://你的服务器IP:8787/?url=
 * （如果网页是 HTTPS，代理也必须是 HTTPS，建议用 Nginx 反代并配证书）
 */
const http = require("http");

const PORT = process.env.PORT || 8787;
const UPSTREAM = { host: "open.10ss.net", port: 8888, path: "/getstatus.php" };

http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("use POST");
    }

    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const upstream = http.request(
        {
          ...UPSTREAM,
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(body),
            "User-Agent": "yly-pwa-proxy/1.0",
          },
          timeout: 12000,
        },
        (up) => {
          let data = "";
          up.setEncoding("utf8");
          up.on("data", (c) => (data += c));
          up.on("end", () => {
            res.writeHead(200, {
              "Content-Type": "text/plain; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(data.trim());
          });
        }
      );
      upstream.on("timeout", () => upstream.destroy(new Error("upstream timeout")));
      upstream.on("error", (e) => {
        res.writeHead(502, {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        });
        res.end("proxy error: " + e.message);
      });
      upstream.end(body);
    });
  })
  .listen(PORT, () => console.log("yly status proxy listening on " + PORT));
