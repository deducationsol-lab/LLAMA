import { auth } from "../../lib/auth.js";

export default async function handler(req, res) {
  let body = "";
  if (req.method !== "GET" && req.method !== "HEAD") {
    for await (const chunk of req) body += chunk;
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  const request = new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: body || undefined,
  });
  const response = await auth.handler(request);
  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const responseBody = await response.text();
  res.send(responseBody);
}
