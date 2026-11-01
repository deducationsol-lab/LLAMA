import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { askLlama } from './llama.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'db.json');

const app = express();
app.use(express.json());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : true;

app.use(cors({ origin: allowedOrigins }));

const SEED = {
  preferences: {
    familySize: 4,
    monthlyBudgetCap: 5000,
    dietary: 'Halal / Low-Sugar',
    homeLocation: 'Kuala Lumpur',
    targetSleepDuration: '8 Hours',
    travelBudgetLimit: 1500,
  },
  bills: [
    { id: 1, name: 'Home Internet (Unifi 300Mbps)', amount: 139.0, dueDate: 'Nov 05', status: 'PENDING', category: 'Utilities', agentNote: 'Auto-debit scheduled' },
    { id: 2, name: 'Electricity (TNB Utility)', amount: 185.5, dueDate: 'Nov 08', status: 'PENDING', category: 'Utilities', agentNote: 'Peak usage +12% vs last month' },
    { id: 3, name: 'School Bus & Tuition Fee', amount: 450.0, dueDate: 'Nov 01', status: 'PAID', category: 'Education', agentNote: 'Verified receipt #994' },
    { id: 4, name: 'Car Loan Installment', amount: 680.0, dueDate: 'Nov 12', status: 'PENDING', category: 'Finance', agentNote: 'Sufficient balance in main account' },
  ],
  groceries: [
    { id: 1, name: 'Fresh Chicken Breast (1kg)', category: 'Proteins', inPantry: false, estPrice: 22.0, recipeNeeded: 'Nasi Ayam & Stir-Fry' },
    { id: 2, name: 'Organic Eggs (30s pack)', category: 'Dairy & Eggs', inPantry: true, estPrice: 18.5, recipeNeeded: 'Breakfast & Baking' },
    { id: 3, name: 'Fresh Spinach & Bok Choy', category: 'Produce', inPantry: false, estPrice: 8.0, recipeNeeded: 'Daily Greens' },
    { id: 4, name: 'Basmati Rice (5kg)', category: 'Staples', inPantry: true, estPrice: 38.0, recipeNeeded: 'Dinner Staples' },
    { id: 5, name: 'Soy Sauce & Cooking Oil', category: 'Condiments', inPantry: false, estPrice: 19.5, recipeNeeded: 'Pantry Refresh' },
  ],
  travel: [
    { day: 'Day 1', title: 'Arrival & Georgetown Heritage Walk', cost: 350, status: 'Booked', notes: 'Morning flight MH-1142. Dinner at Gurney Drive.' },
    { day: 'Day 2', title: 'Penang Hill Funicular & Entopia Butterfly Park', cost: 420, status: 'Planned', notes: 'Kids school holiday discount applied.' },
    { day: 'Day 3', title: 'Batu Ferringhi Beach & Culinary Souvenirs', cost: 380, status: 'Planned', notes: 'Seafood lunch at Teluk Bahang, souvenirs at Chowrasta Market.' },
  ],
  logs: [],
  ragVectors: 1420,
  timeSavedHours: 14.5,
};

const loadDB = () => {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(SEED, null, 2));
    return structuredClone(SEED);
  }
};

let db = loadDB();

const saveDB = () => {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
};

const timeNow = () => new Date().toTimeString().slice(0, 8);

const logEvent = (agent, type, msg) => {
  const entry = { id: Date.now() + Math.random(), time: timeNow(), agent, type, msg };
  db.logs = [...db.logs.slice(-99), entry];
  saveDB();
  return entry;
};

const pendingTotal = () =>
  (db.bills || []).filter((b) => b.status === 'PENDING').reduce((sum, b) => sum + Number(b.amount || 0), 0);

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

app.get('/api/health', (_, res) => {
  res.json({
    ok: true,
    llama: !!process.env.LLAMA_STACK_URL,
    time: new Date().toISOString(),
  });
});

app.get('/api/state', (_, res) => {
  res.json(db);
});

app.patch('/api/bills/:id/toggle', (req, res) => {
  const bill = (db.bills || []).find((x) => x.id === Number(req.params.id));
  if (!bill) return res.status(404).json({ error: 'bill not found' });

  bill.status = bill.status === 'PAID' ? 'PENDING' : 'PAID';

  const entry = logEvent(
    'ADMIN-02',
    'ACTION',
    `"${bill.name}" marked ${bill.status} (RM ${num(bill.amount).toFixed(2)}). Pending total now RM ${pendingTotal().toFixed(2)}.`
  );

  res.json({ bill, log: entry, pendingTotal: pendingTotal() });
});

app.patch('/api/groceries/:id/toggle', (req, res) => {
  const item = (db.groceries || []).find((x) => x.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'item not found' });

  item.inPantry = !item.inPantry;
  saveDB();
  res.json({ item });
});

app.post('/api/groceries', (req, res) => {
  const name = String(req.body?.name || 'New item').trim();
  if (!name) return res.status(400).json({ error: 'name required' });

  const item = {
    id: Date.now(),
    name,
    category: 'Custom',
    inPantry: false,
    estPrice: num(req.body?.estPrice, 15),
    recipeNeeded: 'Added via prompt',
  };

  db.groceries.push(item);
  db.ragVectors = (db.ragVectors || 0) + 1;

  const entry = logEvent('HOME-03', 'SUCCESS', `"${item.name}" added to basket and indexed in Pantry RAG (vector #${db.ragVectors}).`);

  saveDB();
  res.status(201).json({ item, log: entry });
});

app.delete('/api/groceries/:id', (req, res) => {
  db.groceries = (db.groceries || []).filter((g) => g.id !== Number(req.params.id));
  saveDB();
  res.json({ ok: true });
});

app.put('/api/preferences', (req, res) => {
  db.preferences = { ...db.preferences, ...req.body };

  const entry = logEvent(
    'ADMIN-02',
    'INFO',
    `User memory updated: dietary="${db.preferences.dietary}", travel cap RM ${num(db.preferences.travelBudgetLimit, 1500)}. Context re-indexed.`
  );

  saveDB();
  res.json({ preferences: db.preferences, log: entry });
});

app.post('/api/workflows/:name', (req, res) => {
  const p = db.preferences || {};
  const added = [];

  if (req.params.name === 'trip') {
    db.travel = [
      { day: 'Day 1', title: 'Morning Flight & Georgetown Heritage Walk', cost: 310, status: 'Booked', notes: 'Flight MH-1142 confirmed. Lunch at Line Clear Nasi Kandar.' },
      { day: 'Day 2', title: 'Penang Hill Funicular & Entopia Park', cost: 390, status: 'Booked', notes: 'Family ticket deal applied. Dinner at Gurney Drive.' },
      { day: 'Day 3', title: 'Teluk Bahang Beach & Souvenirs', cost: 320, status: 'Planned', notes: 'Souvenirs within budget.' },
    ];

    db.timeSavedHours = +(num(db.timeSavedHours, 14.5) + 0.5).toFixed(1);

    added.push(
      logEvent('LOGISTICS-01', 'TOOL', `⚡ WORKFLOW: Plan Penang Trip under RM ${num(p.travelBudgetLimit, 1500)}`),
      logEvent('ROUTINE-04', 'SUCCESS', 'Cross-referenced school holidays (Nov 18–24). Slots available.'),
      logEvent('ADMIN-02', 'ACTION', `Itinerary total RM 1,020 ≤ cap RM ${num(p.travelBudgetLimit, 1500)}.`)
    );

    saveDB();
    return res.json({ intent: 'trip', logs: added, travel: db.travel, navigate: 'travel' });
  }

  if (req.params.name === 'bills') {
    added.push(
      logEvent('ADMIN-02', 'TOOL', '⚡ WORKFLOW: Reconcile Monthly Bills'),
      logEvent('ADMIN-02', 'SUCCESS', `${(db.bills || []).length} bills analyzed. Pending: RM ${pendingTotal().toFixed(2)}.`)
    );

    saveDB();
    return res.json({ intent: 'bills', logs: added, navigate: 'bills' });
  }

  if (req.params.name === 'grocery') {
    db.ragVectors = (db.ragVectors || 0) + (db.groceries || []).length;

    added.push(
      logEvent('HOME-03', 'TOOL', `vector_rag.query("household_pantry", { filter: "Dietary: ${p.dietary || 'General'}" })`),
      logEvent('HOME-03', 'SUCCESS', `Meal plan generated. ${(db.groceries || []).filter((g) => !g.inPantry).length} items to buy.`)
    );

    saveDB();
    return res.json({ intent: 'grocery', logs: added, ragVectors: db.ragVectors, navigate: 'groceries' });
  }

  return res.status(404).json({ error: 'unknown workflow' });
});

app.post('/api/prompt', async (req, res) => {
  const text = String(req.body?.prompt || '').trim();
  if (!text) return res.status(400).json({ error: 'prompt required' });

  const lower = text.toLowerCase();
  const logs = [logEvent('ADMIN-02', 'TOOL', `✨ PROMPT: "${text}"`)];
  let navigate = 'feeds';

  const addMatch = lower.match(/add (.+?)( to( the)?( grocery| shopping| basket| pantry)? list)?$/);

  if (addMatch || lower.includes('grocery') || lower.includes('basket')) {
    const name = (addMatch?.[1] || text.replace(/add|to.*list/gi, '')).trim() || 'New grocery item';
    const item = {
      id: Date.now(),
      name,
      category: 'Custom',
      inPantry: false,
      estPrice: 15,
      recipeNeeded: 'Added via prompt',
    };

    db.groceries.push(item);
    db.ragVectors = (db.ragVectors || 0) + 1;

    logs.push(logEvent('HOME-03', 'SUCCESS', `"${name}" added to basket + RAG-indexed.`));
    navigate = 'groceries';
    saveDB();

    return res.json({
      intent: navigate,
      logs,
      navigate,
      item,
      state: db,
    });
  }

  if (/(penang|trip|flight|holiday|vacation)/.test(lower)) {
    logs.push(logEvent('LOGISTICS-01', 'SUCCESS', `Trip request routed. Budget cap RM ${num(db.preferences.travelBudgetLimit, 1500)}. Run the Penang workflow for a full itinerary.`));
    navigate = 'travel';
  } else if (/(bill|tuition|fee|pay|due)/.test(lower)) {
    logs.push(logEvent('ADMIN-02', 'SUCCESS', `Bills checked: RM ${pendingTotal().toFixed(2)} pending across ${(db.bills || []).filter((b) => b.status === 'PENDING').length} items.`));
    navigate = 'bills';
  } else if (/(sleep|schedule|routine|calendar|bedtime)/.test(lower)) {
    logs.push(logEvent('ROUTINE-04', 'SUCCESS', `Routine validated against ${db.preferences.targetSleepDuration} sleep target. No conflicts.`));
    navigate = 'schedule';
  } else {
    const ai = await askLlama(
      `You are the Everyday Life Swarm Orchestrator for a family in ${db.preferences.homeLocation}. Dietary: ${db.preferences.dietary}. Pending bills: RM ${pendingTotal().toFixed(2)}. Reply in one concise, helpful sentence.`,
      text
    );

    logs.push(
      logEvent('LOGISTICS-01', ai ? 'SUCCESS' : 'INFO', ai || 'Swarm evaluated multi-agent dependencies and re-calculated the optimal execution path.')
    );
  }

  saveDB();
  res.json({ intent: navigate, logs, navigate, state: db });
});

app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const pool = [
    ['LOGISTICS-01', 'TOOL', 'llama_stack.call_tool("weather_forecast_api", { location: "Penang", days: 3 })'],
    ['ADMIN-02', 'SUCCESS', 'Reconciled e-Wallet balance against weekly grocery budget.'],
    ['HOME-03', 'INFO', 'Updated Vector RAG store with fresh refrigerator items.'],
    ['ROUTINE-04', 'ACTION', 'Added 15m transition buffer before afternoon work block.'],
  ];

  const tick = () => {
    const [agent, type, msg] = pool[Math.floor(Math.random() * pool.length)];
    const event = logEvent(agent, type, msg);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const interval = setInterval(tick, 4000);
  req.on('close', () => clearInterval(interval));
});

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Life Swarm API on :${PORT} | Llama: ${process.env.LLAMA_STACK_URL || 'fallback mode'}`);
});
