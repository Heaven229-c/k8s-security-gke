const express = require('express');
const { exec } = require('child_process');
const redis = require('redis');
const fs = require('fs');
const os = require('os');

const app = express();

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis.vulnerable.svc.cluster.local:6379'
});

client.on('error', (err) => console.error('Redis Error:', err.message));

(async () => {
  try {
    await client.connect();
    console.log('Redis connected');
  } catch (e) {
    console.error('Redis connect failed:', e.message);
  }
})();

app.get('/api/healthz', (req, res) => res.send('OK'));

app.get('/api/profile', async (req, res) => {
  try {
    const val = await client.get('user');
    res.json({ profile: val || 'no data', hostname: os.hostname() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/debug', (req, res) => {
  const tokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';
  res.json({
    hostname: os.hostname(),
    uid: process.getuid ? process.getuid() : 'n/a',
    tokenMounted: fs.existsSync(tokenPath)
  });
});

app.get('/debug/exec', (req, res) => {
  const cmd = req.query.cmd;
  if (!cmd) return res.status(400).send('missing cmd');
  exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
    if (err) return res.status(500).send(stderr || err.message);
    res.send(stdout || stderr || 'done');
  });
});

app.listen(8080, () => console.log('API on 8080'));