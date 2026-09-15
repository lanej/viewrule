// Egress for the model service only. No host files, credentials, or trial data.
import { createServer } from "node:http";
import { connect } from "node:net";
const allowed = new Set([
  "chatgpt.com:443",
  "auth.openai.com:443",
  "api.openai.com:443",
]);
const server = createServer((_req, res) => res.writeHead(403).end());
server.on("connect", (req, client, head) => {
  if (!allowed.has(req.url))
    return client.end("HTTP/1.1 403 Forbidden\r\n\r\n");
  const [host, port] = req.url.split(":");
  const upstream = connect(Number(port), host, () => {
    client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length) upstream.write(head);
    upstream.pipe(client);
    client.pipe(upstream);
  });
  upstream.on("error", () => client.destroy());
  client.on("error", () => upstream.destroy());
  client.on("close", () => upstream.destroy());
});
server.listen(8080, "0.0.0.0");
