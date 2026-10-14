// MoonBeam – project MoonBoard problems with a beamer, controlled from your phone.
// Zero dependencies: run `node server.js` on the laptop that is wired to the beamer.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;
const CONFIG_FILE = path.join(ROOT, 'config.json');

// ---------- data ----------
const GRADES = ['6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+', '8B', '8B+'];
const V = { '6A': 'V3', '6A+': 'V3', '6B': 'V4', '6B+': 'V4', '6C': 'V5', '6C+': 'V5', '7A': 'V6', '7A+': 'V7', '7B': 'V8', '7B+': 'V8', '7C': 'V9', '7C+': 'V10', '8A': 'V11', '8A+': 'V12', '8B': 'V13', '8B+': 'V14' };
const gradeIx = g => GRADES.indexOf(g);

const DATA_FILE = path.join(ROOT, 'data', 'problems-2016.json');
if (!fs.existsSync(DATA_FILE)) {
  console.error(`\nNo problem data found at ${DATA_FILE}.\nSee "Get the problem data" in README.md to create it.\n`);
  process.exit(1);
}
const problems = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  .map(p => ({ ...p, name: titleCase(p.name), g: gradeIx(p.grade), v: V[p.grade] || '' }));
const byId = new Map(problems.map(p => [p.id, p]));
console.log(`Loaded ${problems.length} problems`);

function titleCase(s) { return String(s || '').replace(/\b\w/g, c => c.toUpperCase()); }

// ---------- shared state ----------
const DEFAULT_CONFIG = {
  // Corners = centres of holds A18 (tl), K18 (tr), K1 (br), A1 (bl), as fractions of the projector window.
  corners: { tl: [0.36, 0.1], tr: [0.64, 0.1], br: [0.64, 0.92], bl: [0.36, 0.92] },
  radius: 0.42,       // ring radius as fraction of hold spacing
  thickness: 0.16,    // ring thickness as fraction of hold spacing
  brightness: 1,
  showLabel: true,
  showCoords: true,
  coordOffset: 0.7,   // letters/numbers distance from the outer holds, in hold spacings
};
let config = structuredClone(DEFAULT_CONFIG);
try { config = { ...structuredClone(DEFAULT_CONFIG), ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) }; } catch {}

const state = { problemId: null, mode: 'problem', history: [] }; // mode: problem | calibrate | all | blank

function snapshot() {
  return { config, mode: state.mode, problem: state.problemId ? byId.get(state.problemId) : null };
}

const clients = new Set();
function broadcast() {
  const msg = `data: ${JSON.stringify(snapshot())}\n\n`;
  for (const res of clients) res.write(msg);
}
function saveConfig() { fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), () => {}); }

// ---------- search ----------
function query(params) {
  const q = (params.get('q') || '').trim().toLowerCase();
  const gmin = gradeIx(params.get('gmin') || '6A');
  const gmax = gradeIx(params.get('gmax') || '8B+');
  const bench = params.get('bench') === '1';
  const minRep = Number(params.get('minrep') || 0);
  const sort = params.get('sort') || 'repeats';
  const offset = Number(params.get('offset') || 0);
  const limit = Math.min(Number(params.get('limit') || 50), 200);

  let list = problems.filter(p =>
    p.g >= gmin && p.g <= gmax &&
    (!bench || p.benchmark) &&
    (p.repeats || 0) >= minRep &&
    (!q || p.name.toLowerCase().includes(q) || (p.setter || '').toLowerCase().includes(q)));

  const cmp = {
    repeats: (a, b) => (b.repeats || 0) - (a.repeats || 0),
    grade: (a, b) => a.g - b.g || (b.repeats || 0) - (a.repeats || 0),
    hardest: (a, b) => b.g - a.g || (b.repeats || 0) - (a.repeats || 0),
    newest: (a, b) => b.id - a.id,
    name: (a, b) => a.name.localeCompare(b.name),
  }[sort];
  if (cmp) list.sort(cmp);

  const total = list.length;
  const pick = params.get('random') === '1' && total ? [list[Math.floor(Math.random() * total)]] : null;
  return { total, items: pick || list.slice(offset, offset + limit) };
}

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
  });
}
function json(res, obj, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }
  if (p === '/api/problems' && req.method === 'GET') return json(res, query(url.searchParams));
  if (p === '/api/state' && req.method === 'GET') return json(res, snapshot());

  if (p === '/api/show' && req.method === 'POST') {
    const { id } = await readBody(req);
    if (!byId.has(Number(id))) return json(res, { error: 'unknown problem' }, 404);
    if (state.problemId) state.history.push(state.problemId);
    state.history = state.history.slice(-100);
    state.problemId = Number(id);
    state.mode = 'problem';
    broadcast();
    return json(res, { ok: true });
  }
  if (p === '/api/back' && req.method === 'POST') {
    const prev = state.history.pop();
    if (prev) { state.problemId = prev; state.mode = 'problem'; broadcast(); }
    return json(res, { ok: true });
  }
  if (p === '/api/mode' && req.method === 'POST') {
    const { mode } = await readBody(req);
    if (['problem', 'calibrate', 'all', 'blank'].includes(mode)) { state.mode = mode; broadcast(); }
    return json(res, { ok: true });
  }
  if (p === '/api/config' && req.method === 'POST') {
    const body = await readBody(req);
    if (body.reset) config = structuredClone(DEFAULT_CONFIG);
    for (const k of ['radius', 'thickness', 'brightness', 'coordOffset']) if (typeof body[k] === 'number') config[k] = body[k];
    for (const k of ['showLabel', 'showCoords']) if (typeof body[k] === 'boolean') config[k] = body[k];
    if (body.corners) for (const c of ['tl', 'tr', 'br', 'bl']) {
      const v = body.corners[c];
      if (Array.isArray(v) && v.length === 2 && v.every(Number.isFinite)) config.corners[c] = v;
    }
    if (body.nudge && config.corners[body.nudge.corner]) { // {corner, dx, dy} in window fractions
      const c = config.corners[body.nudge.corner];
      config.corners[body.nudge.corner] = [c[0] + (body.nudge.dx || 0), c[1] + (body.nudge.dy || 0)];
    }
    saveConfig(); broadcast();
    return json(res, { ok: true, config });
  }

  // static
  const file = p === '/' ? '/remote.html' : p === '/beamer' ? '/projector.html' : p;
  const full = path.join(ROOT, 'public', path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  if (!full.startsWith(path.join(ROOT, 'public'))) { res.writeHead(403); return res.end(); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('\nMoonBeam is running.\n');
  console.log(`  Beamer (open on this laptop, fullscreen on the projector):  http://localhost:${PORT}/beamer`);
  for (const ip of ips) console.log(`  Phone remote (same Wi-Fi):                                 http://${ip}:${PORT}/`);
  console.log('');
});
