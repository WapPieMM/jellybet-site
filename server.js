import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const staticDir = path.join(__dirname, 'jellybet-site');

app.get('/accounting', (_req, res) => {
  res.sendFile(path.join(staticDir, 'accounting.html'));
});

app.get('/accounts', (_req, res) => {
  res.sendFile(path.join(staticDir, 'accounts.html'));
});

app.get('/account/:id', (_req, res) => {
  res.sendFile(path.join(staticDir, 'account.html'));
});

app.use(express.static(staticDir));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
