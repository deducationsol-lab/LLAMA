import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal, Plane, Receipt, ShoppingCart, Clock, Play, Pause,
  RotateCcw, CheckCircle2, Brain, Database, Sparkles, Zap,
  Trash2, Plus, AlertCircle
} from 'lucide-react';

const nowTime = () => new Date().toTimeString().slice(0, 8);
const uid = () => Date.now() + Math.random().toString(16).slice(2);
const rm = (n) => `RM ${Number(n).toFixed(2)}`;

const INITIAL_AGENTS = [
  { id: 'agent-travel',  name: 'LOGISTICS-01', role: 'Travel & Vacation Planner',   status: 'ACTIVE',   color: 'indigo',  icon: Plane,        activity: 'Querying flights & school holiday calendars for Penang trip...', load: 38, processedEvents: 1420, skills: ['School Holiday Alignment', 'Flights API Tool', 'Itinerary Builder'] },
  { id: 'agent-admin',   name: 'ADMIN-02',     role: 'Life Admin & Bill Manager',   status: 'ACTIVE',   color: 'amber',   icon: Receipt,      activity: 'Parsing electricity & internet invoice cycles...',               load: 54, processedEvents: 3210, skills: ['Bill Recurrence OCR', 'Due-Date Forecasting', 'Budget Reconciliation'] },
  { id: 'agent-home',    name: 'HOME-03',      role: 'Pantry RAG & Grocery Agent',  status: 'THINKING', color: 'emerald', icon: ShoppingCart, activity: 'Cross-referencing recipes with Pantry Vector RAG...',            load: 82, processedEvents: 4590, skills: ['Pantry Vector RAG', 'Grocery Builder', 'Dietary Guard'] },
  { id: 'agent-routine', name: 'ROUTINE-04',   role: 'Routine & Wellness Scheduler',status: 'READY',    color: 'sky',     icon: Clock,        activity: 'Calculating optimal 8-hr sleep window & time-blocks...',         load: 22, processedEvents: 2100, skills: ['Conflict-Free Timeblocker', 'Bedtime Optimizer', 'School Run Resolver'] },
];

const INITIAL_LOGS = [
  { id: 1, time: '08:15:02', agent: 'LOGISTICS-01', type: 'TOOL',    msg: 'llama_stack.call_tool("google_flights_search", { destination: "PEN" })' },
  { id: 2, time: '08:15:06', agent: 'ADMIN-02',     type: 'SUCCESS', msg: 'Detected upcoming utility bill: Tenaga Nasional (RM 185.00) due in 4 days.' },
  { id: 3, time: '08:15:10', agent: 'HOME-03',      type: 'TOOL',    msg: 'vector_rag.query("pantry_inventory", { query: "milk, eggs, spices, chicken" })' },
  { id: 4, time: '08:15:14', agent: 'ROUTINE-04',   type: 'ACTION',  msg: 'Adjusted target bedtime to 22:30 based on early morning flight departure.' },
];

const INITIAL_TRAVEL = [
  { day: 'Day 1', title: 'Arrival & Georgetown Heritage Walk',              cost: 350, status: 'Booked',  notes: 'Morning flight MH-1142. Check-in at Eastern & Oriental. Dinner at Gurney Drive.' },
  { day: 'Day 2', title: 'Penang Hill Funicular & Entopia Butterfly Park',  cost: 420, status: 'Planned', notes: 'Kids school holiday discount applied. Pre-purchased fast-track tickets.' },
  { day: 'Day 3', title: 'Batu Ferringhi Beach & Culinary Souvenirs',       cost: 380, status: 'Planned', notes: 'Seafood lunch at Teluk Bahang, souvenirs at Chowrasta Market.' },
];

const INITIAL_BILLS = [
  { id: 1, name: 'Home Internet (Unifi 300Mbps)', amount: 139.00, dueDate: 'Nov 05', status: 'PENDING', category: 'Utilities', agentNote: 'Auto-debit scheduled' },
  { id: 2, name: 'Electricity (TNB Utility)',     amount: 185.50, dueDate: 'Nov 08', status: 'PENDING', category: 'Utilities', agentNote: 'Peak usage +12% vs last month' },
  { id: 3, name: 'School Bus & Tuition Fee',      amount: 450.00, dueDate: 'Nov 01', status: 'PAID',    category: 'Education', agentNote: 'Verified receipt #994' },
  { id: 4, name: 'Car Loan Installment',          amount: 680.00, dueDate: 'Nov 12', status: 'PENDING', category: 'Finance',   agentNote: 'Sufficient balance in main account' },
];

const INITIAL_GROCERIES = [
  { id: 1, name: 'Fresh Chicken Breast (1kg)', category: 'Proteins',    inPantry: false, estPrice: 22.00, recipeNeeded: 'Nasi Ayam & Stir-Fry' },
  { id: 2, name: 'Organic Eggs (30s pack)',    category: 'Dairy & Eggs',inPantry: true,  estPrice: 18.50, recipeNeeded: 'Breakfast & Baking' },
  { id: 3, name: 'Fresh Spinach & Bok Choy',   category: 'Produce',     inPantry: false, estPrice: 8.00,  recipeNeeded: 'Daily Greens' },
  { id: 4, name: 'Basmati Rice (5kg)',         category: 'Staples',     inPantry: true,  estPrice: 38.00, recipeNeeded: 'Dinner Staples' },
  { id: 5, name: 'Soy Sauce & Cooking Oil',    category: 'Condiments',  inPantry: false, estPrice: 19.50, recipeNeeded: 'Pantry Refresh' },
];

const INITIAL_SCHEDULE = [
  { time: '06:30 - 07:15', task: 'Morning Routine & Healthy Breakfast',             category: 'Wellness', focus: 'Low stress' },
  { time: '07:15 - 08:00', task: 'School Run Drop-off',                             category: 'Family',   focus: 'Routine traffic window' },
  { time: '08:30 - 12:30', task: 'Deep Work Block: Core Project Development',       category: 'Work',     focus: 'High focus / No notifications' },
  { time: '12:30 - 13:30', task: 'Lunch & Quick Pantry Check',                      category: 'Wellness', focus: 'Meal prep' },
  { time: '14:00 - 17:00', task: 'Work Block & Agent Swarm Review',                 category: 'Work',     focus: 'Collaborative tasks' },
  { time: '17:30 - 18:30', task: 'School Pick-up & Park Walk with Kids',            category: 'Family',   focus: 'Active outdoor time' },
  { time: '21:30 - 22:30', task: 'Wind-down & Reading (Target Bedtime 22:30)',      category: 'Wellness', focus: 'Optimal 8h sleep prep' },
];

const COLOR = {
  indigo:  'bg-indigo-950 text-indigo-400 border-indigo-800',
  amber:   'bg-amber-950 text-amber-400 border-amber-800',
  emerald: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  sky:     'bg-sky-950 text-sky-400 border-sky-800',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('feeds');
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');
  const [newGrocery, setNewGrocery] = useState('');

  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [travelItinerary, setTravelItinerary] = useState(INITIAL_TRAVEL);
  const [bills, setBills] = useState(INITIAL_BILLS);
  const [groceries, setGroceries] = useState(INITIAL_GROCERIES);
  const [schedule] = useState(INITIAL_SCHEDULE);

  const [ragVectors, setRagVectors] = useState(1420);
  const [timeSaved, setTimeSaved] = useState(14.5);

  const [userPreferences, setUserPreferences] = useState({
    familySize: 4, monthlyBudgetCap: 5000, dietary: 'Halal / Low-Sugar',
    homeLocation: 'Kuala Lumpur', targetSleepDuration: '8 Hours', travelBudgetLimit: 1500,
  });

  const logBoxRef = useRef(null);

  const pendingBills = useMemo(() => bills.filter(b => b.status === 'PENDING'), [bills]);
  const pendingTotal = useMemo(() => pendingBills.reduce((s, b) => s + b.amount, 0), [pendingBills]);
  const travelTotal  = useMemo(() => travelItinerary.reduce((s, i) => s + Number(i.cost), 0), [travelItinerary]);
  const basket       = useMemo(() => groceries.filter(g => !g.inPantry), [groceries]);
  const basketTotal  = useMemo(() => basket.reduce((s, g) => s + g.estPrice, 0), [basket]);
  const overTravelBudget = travelTotal > userPreferences.travelBudgetLimit;
  const overMonthlyCap   = pendingTotal + travelTotal + basketTotal > userPreferences.monthlyBudgetCap;

  const pushLogs = (entries) =>
    setLogs(prev => [...prev.slice(-99), ...entries.map((e, i) => ({ id: uid() + i, time: nowTime(), ...e }))]);

  useEffect(() => {
    if (autoScroll && logBoxRef.current) logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
  }, [logs, autoScroll]);

  useEffect(() => {
    if (!isSimulating) return;
    const pool = [
      { agent: 'LOGISTICS-01', type: 'TOOL',    msg: 'llama_stack.call_tool("weather_forecast_api", { location: "Penang", days: 3 })' },
      { agent: 'ADMIN-02',     type: 'SUCCESS', msg: 'Reconciled e-Wallet balance against recurring weekly grocery budget.' },
      { agent: 'HOME-03',      type: 'INFO',    msg: 'Updated Vector RAG store with fresh items added to refrigerator.' },
      { agent: 'ROUTINE-04',   type: 'ACTION',  msg: 'Optimized calendar buffer: Added 15m transition slot before afternoon work block.' },
      { agent: 'HOME-03',      type: 'TOOL',    msg: `vector_rag.query("pantry_inventory", { filter: "Dietary: ${userPreferences.dietary}" })` },
      { agent: 'ADMIN-02',     type: 'INFO',    msg: `Cashflow forecast: ${rm(pendingTotal)} pending before Nov 15.` },
    ];
    const id = setInterval(() => {
      if (Math.random() > 0.4) pushLogs([pool[Math.floor(Math.random() * pool.length)]]);
      setAgents(prev => prev.map(a => ({
        ...a,
        load: Math.max(8, Math.min(96, a.load + Math.round((Math.random() - 0.5) * 18))),
        processedEvents: a.processedEvents + Math.floor(Math.random() * 4),
      })));
    }, 2500);
    return () => clearInterval(id);
  }, [isSimulating, pendingTotal, userPreferences.dietary]);

  const triggerTripWorkflow = () => {
    pushLogs([
      { agent: 'LOGISTICS-01', type: 'TOOL',    msg: `⚡ WORKFLOW: "Plan Penang Trip under ${rm(userPreferences.travelBudgetLimit)}"` },
      { agent: 'LOGISTICS-01', type: 'TOOL',    msg: 'llama_stack.call_tool("google_flights", { origin: "KUL", dest: "PEN", price_cap: 400 })' },
      { agent: 'ROUTINE-04',   type: 'SUCCESS', msg: 'Cross-referenced school holiday dates (Nov 18-24). Flight slots available.' },
      { agent: 'ADMIN-02',     type: 'ACTION',  msg: `Budget check: itinerary total must stay ≤ ${rm(userPreferences.travelBudgetLimit)}.` },
    ]);
    setTravelItinerary([
      { day: 'Day 1', title: 'Morning Flight & Georgetown Heritage Walk', cost: 310, status: 'Booked',  notes: 'Flight MH-1142 confirmed. Lunch at Line Clear Nasi Kandar.' },
      { day: 'Day 2', title: 'Penang Hill Funicular & Entopia Park',      cost: 390, status: 'Booked',  notes: 'Family ticket deal applied. Evening dinner at Gurney Drive.' },
      { day: 'Day 3', title: 'Teluk Bahang Beach & Souvenirs',            cost: 320, status: 'Planned', notes: 'Checked-out. Souvenirs within budget.' },
    ]);
    setTimeSaved(h => +(h + 0.5).toFixed(1));
    setActiveTab('travel');
  };

  const triggerBillsWorkflow = () => {
    pushLogs([
      { agent: 'ADMIN-02',   type: 'TOOL',    msg: '⚡ WORKFLOW: "Reconcile Monthly Bills & Cashflow Forecast"' },
      { agent: 'ADMIN-02',   type: 'SUCCESS', msg: `${bills.length} bills analyzed. Pending: ${rm(pendingTotal)} across ${pendingBills.length} items.` },
      { agent: 'ROUTINE-04', type: 'ACTION',  msg: 'Set payment reminder alerts 2 days prior to each due date.' },
    ]);
    setActiveTab('bills');
  };

  const triggerGroceryWorkflow = () => {
    pushLogs([
      { agent: 'HOME-03', type: 'TOOL',    msg: '⚡ WORKFLOW: "Weekly Meal & Grocery RAG Optimization"' },
      { agent: 'HOME-03', type: 'TOOL',    msg: `vector_rag.query("household_pantry", { filter: "Dietary: ${userPreferences.dietary}" })` },
      { agent: 'HOME-03', type: 'SUCCESS', msg: `Meal plan generated. ${groceries.filter(g => g.inPantry).length} items already in pantry, ${basket.length} to buy (${rm(basketTotal)}).` },
    ]);
    setRagVectors(v => v + groceries.length);
    setActiveTab('groceries');
  };

  const toggleBill = (id) => {
    const bill = bills.find(b => b.id === id);
    setBills(prev => prev.map(b => b.id === id ? { ...b, status: b.status === 'PAID' ? 'PENDING' : 'PAID' } : b));
    if (bill) pushLogs([{ agent: 'ADMIN-02', type: 'ACTION', msg: `"${bill.name}" marked ${bill.status === 'PAID' ? 'PENDING' : 'PAID'} (${rm(bill.amount)}).` }]);
  };

  const togglePantry = (id) =>
    setGroceries(prev => prev.map(g => g.id === id ? { ...g, inPantry: !g.inPantry } : g));

  const addGrocery = (name, price = 15) => {
    if (!name.trim()) return;
    setGroceries(prev => [...prev, { id: uid(), name: name.trim(), category: 'Custom', inPantry: false, estPrice: price, recipeNeeded: 'Added via prompt' }]);
    setRagVectors(v => v + 1);
  };

  const handleCustomPromptSubmit = (e) => {
    e?.preventDefault();
    const text = customPrompt.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    pushLogs([{ agent: 'ADMIN-02', type: 'TOOL', msg: `✨ CUSTOM PROMPT: "${text}"` }]);

    const addMatch = lower.match(/add (.+?)( to|$)/);
    if (lower.includes('grocery') || lower.includes('basket') || lower.includes('shopping') || addMatch) {
      addGrocery(addMatch ? addMatch[1] : text.replace(/add|to.*list/gi, '').trim() || 'New grocery item');
      pushLogs([{ agent: 'HOME-03', type: 'SUCCESS', msg: 'Item added to basket and indexed in Pantry RAG.' }]);
      setActiveTab('groceries');
    } else if (lower.includes('penang') || lower.includes('trip') || lower.includes('flight') || lower.includes('holiday')) {
      triggerTripWorkflow();
    } else if (lower.includes('bill') || lower.includes('tuition') || lower.includes('fee') || lower.includes('pay')) {
      triggerBillsWorkflow();
    } else if (lower.includes('sleep') || lower.includes('schedule') || lower.includes('routine') || lower.includes('calendar')) {
      pushLogs([{ agent: 'ROUTINE-04', type: 'SUCCESS', msg: `Routine checked against ${userPreferences.targetSleepDuration} sleep target. No conflicts.` }]);
      setActiveTab('schedule');
    } else {
      pushLogs([{ agent: 'LOGISTICS-01', type: 'SUCCESS', msg: 'Swarm evaluated multi-agent dependencies and re-calculated optimal execution path.' }]);
      setActiveTab('feeds');
    }
    setCustomPrompt('');
  };

  const TABS = [
    { id: 'feeds',     label: 'LLAMA 3.3 EXECUTION STREAM', icon: Terminal },
    { id: 'travel',    label: `TRAVEL & VACATION (${travelItinerary.length} DAYS)`, icon: Plane },
    { id: 'bills',     label: `BILL TRACKER (${pendingBills.length} PENDING)`, icon: Receipt },
    { id: 'groceries', label: `SMART PANTRY (${basket.length} TO BUY)`, icon: ShoppingCart },
    { id: 'schedule',  label: 'DAILY TIMEBLOCK ROUTINE', icon: Clock },
    { id: 'lab',       label: 'PROMPT & USER MEMORY LAB', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-slate-950">
      <header className="border-b border-indigo-500/20 bg-slate-900/90 backdrop-blur-md px-4 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="relative shrink-0">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping absolute inset-0 opacity-75" />
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border border-emerald-200 relative" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 flex flex-wrap items-center gap-2">
              EVERYDAY LIFE SWARM
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-mono font-normal">Meta Llama 3.3 Stack</span>
            </h1>
            <p className="text-xs text-slate-400">Build for Your World Track <span className="text-slate-600">|</span> <span className="text-emerald-400 font-mono">● Live Agent Memory Grid</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setIsSimulating(s => !s)} className={`px-3 py-1.5 rounded text-xs font-mono font-semibold flex items-center gap-1.5 border ${isSimulating ? 'bg-amber-950/60 border-amber-500/40 text-amber-300' : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'}`}>
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}{isSimulating ? 'PAUSE AGENT LOOP' : 'RESUME AGENT LOOP'}
          </button>
          <button onClick={triggerTripWorkflow} className="px-2.5 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-200 text-xs rounded flex items-center gap-1 font-mono"><Plane className="w-3 h-3" />+Plan Penang Trip</button>
          <button onClick={triggerBillsWorkflow} className="px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-200 text-xs rounded flex items-center gap-1 font-mono"><Receipt className="w-3 h-3" />+Reconcile Bills</button>
          <button onClick={triggerGroceryWorkflow} className="px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 text-xs rounded flex items-center gap-1 font-mono"><ShoppingCart className="w-3 h-3" />+Pantry Grocery RAG</button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-slate-800 font-mono">
        {[
          { label: 'UPCOMING BILLS DUE', icon: Receipt, color: 'text-amber-400', value: rm(pendingTotal), sub: `${pendingBills.length} pending items` },
          { label: 'WEEKLY TIME SAVED', icon: Clock, color: 'text-sky-400', value: <>{timeSaved} <span className="text-xs text-slate-500">Hours</span></>, sub: 'Automated admin routines' },
          { label: 'GROCERY BASKET', icon: ShoppingCart, color: 'text-indigo-400', value: rm(basketTotal), sub: `${basket.length} items to buy` },
          { label: 'PANTRY RAG MEMORY', icon: Database, color: 'text-emerald-400', value: <>{ragVectors} <span className="text-xs text-slate-500">Vectors</span></>, sub: 'Household preferences & receipts' },
        ].map(({ label, icon: Icon, color, value, sub }) => (
          <div key={label} className="bg-slate-900/60 border border-slate-800 rounded p-3">
            <div className="text-slate-400 text-xs flex items-center justify-between"><span>{label}</span><Icon className={`w-3.5 h-3.5 ${color}`} /></div>
            <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
            <div className="text-[10px] text-slate-500 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {(overTravelBudget || overMonthlyCap) && (
        <div className="mx-4 mt-3 px-3 py-2 rounded bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {overTravelBudget && <span>Travel {rm(travelTotal)} exceeds cap {rm(userPreferences.travelBudgetLimit)}.</span>}
          {overMonthlyCap && <span>Projected spend exceeds monthly cap {rm(userPreferences.monthlyBudgetCap)}.</span>}
        </div>
      )}

      <nav className="border-b border-slate-800 bg-slate-900/40 px-4 flex items-center gap-1 overflow-x-auto text-xs font-mono mt-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`px-4 py-3 font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === id ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            <Icon className="w-4 h-4" /><span>{label}</span>
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'feeds' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-lg flex flex-col h-[560px] shadow-xl">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" /><div className="w-3 h-3 rounded-full bg-amber-500/80" /><div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs text-slate-400 ml-2 font-mono">llama_agent_swarm_telemetry.log</span>
                </div>
                <div className="flex items-center space-x-3 text-xs font-mono">
                  <button onClick={() => setAutoScroll(s => !s)} className={autoScroll ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>[Auto-scroll: {autoScroll ? 'ON' : 'OFF'}]</button>
                  <button onClick={() => setLogs([])} className="text-slate-400 hover:text-slate-200 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Clear</button>
                </div>
              </div>
              <div ref={logBoxRef} className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-xs bg-slate-950/90">
                {logs.length === 0
                  ? <div className="text-slate-600 italic text-center py-10">No log entries. Agent swarm standing by...</div>
                  : logs.map(log => (
                    <div key={log.id} className="flex items-start space-x-2 hover:bg-slate-900/50 p-1 rounded">
                      <span className="text-slate-500 shrink-0">[{log.time}]</span>
                      <span className={`shrink-0 px-1.5 text-[10px] rounded font-bold border ${COLOR[agents.find(a => a.name === log.agent)?.color] || COLOR.sky}`}>{log.agent}</span>
                      <span className={`shrink-0 font-bold ${log.type === 'SUCCESS' ? 'text-emerald-400' : log.type === 'TOOL' ? 'text-indigo-400' : log.type === 'ACTION' ? 'text-amber-400' : 'text-slate-400'}`}>[{log.type}]</span>
                      <span className="text-slate-200 break-all">{log.msg}</span>
                    </div>
                  ))}
              </div>
              <form onSubmit={handleCustomPromptSubmit} className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2 text-xs font-mono">
                <span className="text-indigo-400 font-bold">$</span>
                <input value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Try: 'add salmon to grocery list' / 'plan penang trip' / 'check bills'..." className="flex-1 bg-transparent placeholder-slate-600 focus:outline-none" />
                <button type="submit" className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded">SEND</button>
              </form>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
              <h2 className="text-sm font-bold border-b border-slate-800 pb-2 mb-4 flex justify-between font-mono"><span>SWARM ARCHITECTURE</span><span className="text-xs font-normal text-emerald-400">Meta Llama Stack</span></h2>
              <div className="space-y-3">
                {agents.map(agent => { const Icon = agent.icon; return (
                  <div key={agent.id} className="bg-slate-950 p-3 rounded border border-slate-800">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded border ${COLOR[agent.color]}`}><Icon className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2"><span className="text-xs font-bold">{agent.name}</span><span className="text-[10px] text-slate-500 font-mono">{agent.load}% CPU · {agent.processedEvents} events</span></div>
                        <p className="text-[11px] text-indigo-300">{agent.role} · {agent.status}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{agent.activity}</p>
                        <div className="h-1 bg-slate-800 rounded mt-2 overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${agent.load}%` }} /></div>
                        <div className="flex flex-wrap gap-1 mt-2">{agent.skills.map(s => <span key={s} className="text-[9px] px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400">{s}</span>)}</div>
                      </div>
                    </div>
                  </div>
                );})}
              </div>
              <p className="mt-4 pt-3 border-t border-slate-800 text-center font-mono text-[11px] text-slate-500 flex items-center justify-center gap-1"><Zap className="w-3 h-3" /> Multi-agent tool call interval: 250ms</p>
            </div>
          </div>
        )}

        {activeTab === 'travel' && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between gap-4 bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-lg">
              <div><h2 className="font-bold text-indigo-300 flex gap-2"><Plane className="w-5 h-5" />LOGISTICS & VACATION ITINERARY AGENT</h2>
              <p className="text-xs text-slate-400">Penang Family Trip · Total {rm(travelTotal)} / Cap {rm(userPreferences.travelBudgetLimit)} · Family of {userPreferences.familySize} from {userPreferences.homeLocation}</p></div>
              <button onClick={triggerTripWorkflow} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded flex gap-1.5 h-fit"><Sparkles className="w-4 h-4" />RE-OPTIMIZE</button>
            </div>
            <div className="h-2 bg-slate-800 rounded overflow-hidden"><div className={`h-full ${overTravelBudget ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, travelTotal / userPreferences.travelBudgetLimit * 100)}%` }} /></div>
            <div className="grid md:grid-cols-3 gap-4">
              {travelItinerary.map((item, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
                  <div><div className="flex justify-between mb-2"><span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">{item.day}</span><span className="text-xs font-mono font-bold text-emerald-400">{rm(item.cost)}</span></div>
                  <h3 className="text-sm font-bold mb-2">{item.title}</h3><p className="text-xs text-slate-400 mb-4">{item.notes}</p></div>
                  <div className="pt-3 border-t border-slate-800 flex justify-between text-xs"><span className="text-slate-500">Status:</span><span className="text-emerald-400 font-semibold flex gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{item.status}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bills' && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between gap-4 bg-amber-950/30 border border-amber-500/30 p-4 rounded-lg">
              <div><h2 className="font-bold text-amber-300 flex gap-2"><Receipt className="w-5 h-5" />RECURRING BILLS & CASHFLOW</h2><p className="text-xs text-slate-400">Pending {rm(pendingTotal)} · Monthly cap {rm(userPreferences.monthlyBudgetCap)}. Click a status to toggle paid/pending.</p></div>
              <button onClick={triggerBillsWorkflow} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded flex gap-1.5 h-fit"><RotateCcw className="w-4 h-4" />SCAN CYCLES</button>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800"><tr>{['RECURRING ITEM','CATEGORY','AMOUNT','DUE','AGENT INSIGHT','STATUS'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-800">{bills.map(bill => (
                  <tr key={bill.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-semibold">{bill.name}</td><td className="p-3 text-slate-400">{bill.category}</td>
                    <td className="p-3 font-mono font-bold">{rm(bill.amount)}</td><td className="p-3 font-mono text-amber-400">{bill.dueDate}</td>
                    <td className="p-3 text-slate-400 text-[11px]">{bill.agentNote}</td>
                    <td className="p-3"><button onClick={() => toggleBill(bill.id)} className={`px-3 py-1 rounded text-xs font-bold font-mono border ${bill.status === 'PAID' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-amber-950 text-amber-400 border-amber-800'}`}>{bill.status}</button></td>
                  </tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'groceries' && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between gap-4 bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-lg">
              <div><h2 className="font-bold text-emerald-300 flex gap-2"><ShoppingCart className="w-5 h-5" />PANTRY VECTOR RAG & GROCERY BUILDER</h2><p className="text-xs text-slate-400">Dietary: {userPreferences.dietary} · Basket total {rm(basketTotal)}</p></div>
              <button onClick={triggerGroceryWorkflow} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded flex gap-1.5 h-fit"><Sparkles className="w-4 h-4" />GENERATE LIST</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); addGrocery(newGrocery); setNewGrocery(''); }} className="flex gap-2">
              <input value={newGrocery} onChange={e => setNewGrocery(e.target.value)} placeholder="Add grocery item..." className="flex-1 bg-slate-900 border border-slate-800 rounded p-2 text-xs" />
              <button className="px-3 py-2 bg-emerald-600 rounded text-xs font-bold flex gap-1"><Plus className="w-4 h-4" />Add</button>
            </form>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">{groceries.map(item => (
                <div key={item.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-2">
                  <div><div className="flex gap-2 flex-wrap"><span className="text-sm font-bold">{item.name}</span><span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-400 text-[10px] rounded font-mono">{item.category}</span></div>
                  <div className="text-xs text-slate-400 mt-0.5">Needed for: {item.recipeNeeded}</div></div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-bold text-emerald-400">{rm(item.estPrice)}</span>
                    <button onClick={() => togglePantry(item.id)} className={`px-3 py-1 rounded text-xs font-bold font-mono border ${item.inPantry ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-emerald-950 text-emerald-300 border-emerald-800'}`}>{item.inPantry ? 'IN PANTRY ✓' : '+ BASKET'}</button>
                    <button onClick={() => setGroceries(p => p.filter(g => g.id !== item.id))} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>))}
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 h-fit">
                <h3 className="text-xs font-bold text-emerald-400 font-mono border-b border-slate-800 pb-2 mb-3">PANTRY VECTOR RAG STATE</h3>
                <p className="text-xs text-slate-300 mb-4">Home Agent queries vector embeddings of stored goods to prevent duplicate purchases.</p>
                <div className="space-y-2 font-mono text-xs">
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between"><span className="text-slate-400">In pantry:</span><span className="text-emerald-400 font-bold">{groceries.filter(g => g.inPantry).length} items</span></div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between"><span className="text-slate-400">To buy:</span><span className="text-indigo-400 font-bold">{basket.length} items · {rm(basketTotal)}</span></div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between"><span className="text-slate-400">Vectors indexed:</span><span className="font-bold">{ragVectors}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-3">
            <div className="bg-sky-950/30 border border-sky-500/30 p-4 rounded-lg"><h2 className="font-bold text-sky-300 flex gap-2"><Clock className="w-5 h-5" />DAILY TIMEBLOCK & ROUTINE SCHEDULER</h2><p className="text-xs text-slate-400">Sleep target: {userPreferences.targetSleepDuration} · Home: {userPreferences.homeLocation}</p></div>
            {schedule.map((b, i) => (
              <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex flex-wrap justify-between gap-2">
                <div className="flex gap-3"><span className="font-mono text-xs font-bold text-sky-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 h-fit">{b.time}</span>
                <div><div className="text-xs font-bold">{b.task}</div><div className="text-[11px] text-slate-500">{b.focus}</div></div></div>
                <span className={`px-2 py-0.5 text-[10px] rounded font-bold font-mono border h-fit ${b.category === 'Work' ? COLOR.indigo : b.category === 'Family' ? COLOR.amber : COLOR.sky}`}>{b.category}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'lab' && (
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
              <h3 className="text-xs font-bold text-purple-400 font-mono border-b border-slate-800 pb-2 mb-4 flex gap-2"><Brain className="w-4 h-4" />GLOBAL USER MEMORY & PREFERENCES</h3>
              <div className="space-y-4 text-xs font-mono">
                {[
                  ['Family Size', 'familySize', 'number'], ['Dietary Restrictions', 'dietary', 'text'],
                  ['Home Location', 'homeLocation', 'text'], ['Target Sleep Duration', 'targetSleepDuration', 'text'],
                  ['Monthly Budget Cap (RM)', 'monthlyBudgetCap', 'number'], ['Travel Budget Cap (RM)', 'travelBudgetLimit', 'number'],
                ].map(([label, key, type]) => (
                  <div key={key}><label className="block text-slate-400 mb-1">{label}</label>
                    <input type={type} value={userPreferences[key]} onChange={e => setUserPreferences(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded p-2" /></div>
                ))}
                <div className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-400"><span className="text-purple-400 font-bold">Live effect:</span> Travel cap {rm(userPreferences.travelBudgetLimit)} · Monthly cap {rm(userPreferences.monthlyBudgetCap)} · Dietary filter “{userPreferences.dietary}” is now used by HOME-03 logs & grocery tab.</div>
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
              <h3 className="text-xs font-bold text-indigo-400 font-mono border-b border-slate-800 pb-2 mb-4">SYSTEM PROMPT (LLAMA 3.3) — GENERATED FROM YOUR MEMORY</h3>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-3 whitespace-pre-wrap">{`// System Role
You are the Everyday Life Swarm Orchestrator (Llama Stack).

// User Memory (live)
family_size: ${userPreferences.familySize}
home: ${userPreferences.homeLocation}
dietary: ${userPreferences.dietary}
sleep_target: ${userPreferences.targetSleepDuration}
monthly_cap: ${rm(userPreferences.monthlyBudgetCap)}
travel_cap: ${rm(userPreferences.travelBudgetLimit)}

// Core Directives
1. Minimize household mental friction.
2. Cross-reference school calendars with vacation budgets.
3. Prevent duplicate pantry purchases via Vector RAG.
4. Enforce bedtime alignment (${userPreferences.targetSleepDuration}).`}</div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 px-4 py-2 text-xs font-mono text-slate-500 flex flex-wrap justify-between gap-2">
        <span className="text-indigo-400">● META HACKATHON — BUILD FOR YOUR WORLD TRACK</span>
        <span>Llama Stack Tool Engine: <span className="text-emerald-400">ONLINE</span> · Pending {rm(pendingTotal)}</span>
      </footer>
    </div>
  );
}
