const express = require('express');
const { exec } = require('child_process');
const redis = require('redis');
const fs = require('fs');

const app = express();

// Redis
const client = redis.createClient({
  url: 'redis://redis.vulnerable.svc.cluster.local:6379'
});
client.connect();

// Health
app.get('/api/healthz', (req, res) => res.send("OK"));

// 3-tier: đọc Redis
app.get('/api/profile', async (req, res) => {
  const val = await client.get('user');
  res.send(val || "no data");
});

// Debug (info leak)
app.get('/debug', (req, res) => {
  res.json({
    env: process.env,
    user: process.env.USER
  });
});

// 🔥 Exploit endpoint (QUAN TRỌNG)
app.get('/exec', (req, res) => {
  exec(req.query.cmd, (err, stdout, stderr) => {
    res.send(stdout || stderr);
  });
});

// Token
app.get('/api/token', (req, res) => {
  try {
    const token = fs.readFileSync(
      "/var/run/secrets/kubernetes.io/serviceaccount/token",
      "utf8"
    );
    res.send(token);
  } catch {
    res.send("no token");
  }
});

app.listen(8080, () => console.log("API running"));