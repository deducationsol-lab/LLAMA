import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Terminal,
  Plane,
  Receipt,
  ShoppingCart,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Brain,
  Database,
  Sparkles,
  Zap,
  Trash2,
  Plus,
  AlertCircle,
} from "lucide-react";

const nowTime = () => new Date().toTimeString().slice(0, 8);
const uid = () => Date.now() + Math.random().toString(16).slice(2);
const rm = (n) => `RM ${Number(n).toFixed(2)}`;

const INITIAL_AGENTS = [
  {
    id: "agent-travel",
    name: "LOGISTICS-01",
    role: "Travel & Vacation Planner",
    status: "ACTIVE",
    color: "indigo",
    icon: Plane,
    activity: "Querying flights & school holiday calendars for Penang trip...",
    load: 38,
    processedEvents: 1420,
    skills: [
      "School Holiday Alignment",
      "Flights API Tool",
      "Itinerary Builder",
    ],
  },
  {
    id: "agent-admin",
    name: "ADMIN-02",
    role: "Life Admin & Bill Manager",
    status: "ACTIVE",
    color: "amber",
    icon: Receipt,
    activity: "Parsing electricity & internet invoice cycles...",
    load: 54,
    processedEvents: 3210,
    skills: [
      "Bill Recurrence OCR",
      "Due-Date Forecasting",
      "Budget Reconciliation",
    ],
  },
  {
    id: "agent-home",
    name: "HOME-03",
    role: "Pantry RAG & Grocery Agent",
    status: "THINKING",
    color: "emerald",
    icon: ShoppingCart,
    activity: "Cross-referencing recipes with Pantry Vector RAG...",
    load: 82,
    processedEvents: 4590,
    skills: ["Pantry Vector RAG", "Grocery Builder", "Dietary Guard"],
  },
  {
    id: "agent-routine",
    name: "ROUTINE-04",
    role: "Routine & Wellness Scheduler",
    status: "READY",
    color: "sky",
    icon: Clock,
    activity: "Calculating optimal 8-hr sleep window & time-blocks...",
    load: 22,
    processedEvents: 2100,
    skills: [
      "Conflict-Free Timeblocker",
      "Bedtime Optimizer",
      "School Run Resolver",
    ],
  },
];

const INITIAL_LOGS = [
  {
    id: 1,
    time: "08:15:02",
    agent: "LOGISTICS-01",
    type: "TOOL",
    msg: 'llama_stack.call_tool("google_flights_search", { destination: "PEN" })',
  },
  {
    id: 2,
    time: "08:15:06",
    agent: "ADMIN-02",
    type: "SUCCESS",
    msg: "Detected upcoming utility bill: Tenaga Nasional (RM 185.00) due in 4 days.",
  },
  {
    id: 3,
    time: "08:15:10",
    agent: "HOME-03",
    type: "TOOL",
    msg: 'vector_rag.query("pantry_inventory", { query: "milk, eggs, spices, chicken" })',
  },
  {
    id: 4,
    time: "08:15:14",
    agent: "ROUTINE-04",
    type: "ACTION",
    msg: "Adjusted target bedtime to 22:30 based on early morning flight departure.",
  },
];

const INITIAL_TRAVEL = [
  {
    day: "Day 1",
    title: "Arrival & Georgetown Heritage Walk",
    cost: 350,
    status: "Booked",
    notes:
      "Morning flight MH-1142. Check-in at Eastern & Oriental. Dinner at Gurney Drive.",
  },
  {
    day: "Day 2",
    title: "Penang Hill Funicular & Entopia Butterfly Park",
    cost: 420,
    status: "Planned",
    notes:
      "Kids school holiday discount applied. Pre-purchased fast-track tickets.",
  },
  {
    day: "Day 3",
    title: "Batu Ferringhi Beach & Culinary Souvenirs",
    cost: 380,
    status: "Planned",
    notes: "Seafood lunch at Teluk Bahang, souvenirs at Chowrasta Market.",
  },
];

const INITIAL_BILLS = [
  {
    id: 1,
    name: "Home Internet (Unifi 300Mbps)",
    amount: 139.0,
    dueDate: "Nov 05",
    status: "PENDING",
    category: "Utilities",
    agentNote: "Auto-debit scheduled",
  },
  {
    id: 2,
    name: "Electricity (TNB Utility)",
    amount: 185.5,
    dueDate: "Nov 08",
    status: "PENDING",
    category: "Utilities",
    agentNote: "Peak usage +12% vs last month",
  },
  {
    id: 3,
    name: "School Bus & Tuition Fee",
    amount: 450.0,
    dueDate: "Nov 01",
    status: "PAID",
    category: "Education",
    agentNote: "Verified receipt #994",
  },
  {
    id: 4,
    name: "Car Loan Installment",
    amount: 680.0,
    dueDate: "Nov 12",
    status: "PENDING",
    category: "Finance",
    agentNote: "Sufficient balance in main account",
  },
];

const INITIAL_GROCERIES = [
  {
    id: 1,
    name: "Fresh Chicken Breast (1kg)",
    category: "Proteins",
    inPantry: false,
    estPrice: 22.0,
    recipeNeeded: "Nasi Ayam & Stir-Fry",
  },
  {
    id: 2,
    name: "Organic Eggs (30s pack)",
    category: "Dairy & Eggs",
    inPantry: true,
    estPrice: 18.5,
    recipeNeeded: "Breakfast & Baking",
  },
  {
    id: 3,
    name: "Fresh Spinach & Bok Choy",
    category: "Produce",
    inPantry: false,
    estPrice: 8.0,
    recipeNeeded: "Daily Greens",
  },
  {
    id: 4,
    name: "Basmati Rice (5kg)",
    category: "Staples",
    inPantry: true,
    estPrice: 38.0,
    recipeNeeded: "Dinner Staples",
  },
  {
    id: 5,
    name: "Soy Sauce & Cooking Oil",
    category: "Condiments",
    inPantry: false,
    estPrice: 19.5,
    recipeNeeded: "Pantry Refresh",
  },
];

const INITIAL_SCHEDULE = [
  {
    time: "06:30 - 07:15",
    task: "Morning Routine & Healthy Breakfast",
    category: "Wellness",
    focus: "Low stress",
  },
  {
    time: "07:15 - 08:00",
    task: "School Run Drop-off",
    category: "Family",
    focus: "Routine traffic window",
  },
  {
    time: "08:30 - 12:30",
    task: "Deep Work Block: Core Project Development",
    category: "Work",
    focus: "High focus / No notifications",
  },
  {
    time: "12:30 - 13:30",
    task: "Lunch & Quick Pantry Check",
    category: "Wellness",
    focus: "Meal prep",
  },
  {
    time: "14:00 - 17:00",
    task: "Work Block & Agent Swarm Review",
    category: "Work",
    focus: "Collaborative tasks",
  },
  {
    time: "17:30 - 18:30",
    task: "School Pick-up & Park Walk with Kids",
    category: "Family",
    focus: "Active outdoor time",
  },
  {
    time: "21:30 - 22:30",
    task: "Wind-down & Reading (Target Bedtime 22:30)",
    category: "Wellness",
    focus: "Optimal 8h sleep prep",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("feeds");
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);
  const [customPrompt, setCustomPrompt] = useState("");
  const [newGrocery, setNewGrocery] = useState("");

  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [travelItinerary, setTravelItinerary] = useState(INITIAL_TRAVEL);
  const [bills, setBills] = useState(INITIAL_BILLS);
  const [groceries, setGroceries] = useState(INITIAL_GROCERIES);
  const [schedule] = useState(INITIAL_SCHEDULE);

  const [ragVectors, setRagVectors] = useState(1420);
  const [timeSaved, setTimeSaved] = useState(14.5);

  const [userPreferences, setUserPreferences] = useState({
    familySize: 4,
    monthlyBudgetCap: 5000,
    dietary: "Halal / Low-Sugar",
    homeLocation: "Kuala Lumpur",
    targetSleepDuration: "8 Hours",
    travelBudgetLimit: 1500,
  });

  const logBoxRef = useRef(null);

  const pendingBills = useMemo(
    () => bills.filter((b) => b.status === "PENDING"),
    [bills],
  );
  const pendingTotal = useMemo(
    () => pendingBills.reduce((s, b) => s + b.amount, 0),
    [pendingBills],
  );
  const travelTotal = useMemo(
    () => travelItinerary.reduce((s, i) => s + Number(i.cost), 0),
    [travelItinerary],
  );
  const basket = useMemo(
    () => groceries.filter((g) => !g.inPantry),
    [groceries],
  );
  const basketTotal = useMemo(
    () => basket.reduce((s, g) => s + g.estPrice, 0),
    [basket],
  );
  const overTravelBudget = travelTotal > userPreferences.travelBudgetLimit;
  const overMonthlyCap =
    pendingTotal + travelTotal + basketTotal > userPreferences.monthlyBudgetCap;

  const pushLogs = (entries) =>
    setLogs((prev) => [
      ...prev.slice(-99),
      ...entries.map((e, i) => ({ id: uid() + i, time: nowTime(), ...e })),
    ]);

  useEffect(() => {
    if (autoScroll && logBoxRef.current)
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
  }, [logs, autoScroll]);

  useEffect(() => {
    if (!isSimulating) return;
    const pool = [
      {
        agent: "LOGISTICS-01",
        type: "TOOL",
        msg: 'llama_stack.call_tool("weather_forecast_api", { location: "Penang", days: 3 })',
      },
      {
        agent: "ADMIN-02",
        type: "SUCCESS",
        msg: "Reconciled e-Wallet balance against recurring weekly grocery budget.",
      },
      {
        agent: "HOME-03",
        type: "INFO",
        msg: "Updated Vector RAG store with fresh items added to refrigerator.",
      },
      {
        agent: "ROUTINE-04",
        type: "ACTION",
        msg: "Optimized calendar buffer: Added 15m transition slot before afternoon work block.",
      },
      {
        agent: "HOME-03",
        type: "TOOL",
        msg: `vector_rag.query("pantry_inventory", { filter: "Dietary: ${userPreferences.dietary}" })`,
      },
      {
        agent: "ADMIN-02",
        type: "INFO",
        msg: `Cashflow forecast: ${rm(pendingTotal)} pending before Nov 15.`,
      },
    ];
    const id = setInterval(() => {
      if (Math.random() > 0.4)
        pushLogs([pool[Math.floor(Math.random() * pool.length)]]);
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          load: Math.max(
            8,
            Math.min(96, a.load + Math.round((Math.random() - 0.5) * 18)),
          ),
          processedEvents: a.processedEvents + Math.floor(Math.random() * 4),
        })),
      );
    }, 2500);
    return () => clearInterval(id);
  }, [isSimulating, pendingTotal, userPreferences.dietary]);

  const triggerTripWorkflow = () => {
    pushLogs([
      {
        agent: "LOGISTICS-01",
        type: "TOOL",
        msg: `⚡ WORKFLOW: "Plan Penang Trip under ${rm(userPreferences.travelBudgetLimit)}"`,
      },
      {
        agent: "LOGISTICS-01",
        type: "TOOL",
        msg: 'llama_stack.call_tool("google_flights", { origin: "KUL", dest: "PEN", price_cap: 400 })',
      },
      {
        agent: "ROUTINE-04",
        type: "SUCCESS",
        msg: "Cross-referenced school holiday dates (Nov 18-24). Flight slots available.",
      },
      {
        agent: "ADMIN-02",
        type: "ACTION",
        msg: `Budget check: itinerary total must stay ≤ ${rm(userPreferences.travelBudgetLimit)}.`,
      },
    ]);
    setTravelItinerary([
      {
        day: "Day 1",
        title: "Morning Flight & Georgetown Heritage Walk",
        cost: 310,
        status: "Booked",
        notes: "Flight MH-1142 confirmed. Lunch at Line Clear Nasi Kandar.",
      },
      {
        day: "Day 2",
        title: "Penang Hill Funicular & Entopia Park",
        cost: 390,
        status: "Booked",
        notes: "Family ticket deal applied. Evening dinner at Gurney Drive.",
      },
      {
        day: "Day 3",
        title: "Teluk Bahang Beach & Souvenirs",
        cost: 320,
        status: "Planned",
        notes: "Checked-out. Souvenirs within budget.",
      },
    ]);
    setTimeSaved((h) => +(h + 0.5).toFixed(1));
    setActiveTab("travel");
  };

  const triggerBillsWorkflow = () => {
    pushLogs([
      {
        agent: "ADMIN-02",
        type: "TOOL",
        msg: '⚡ WORKFLOW: "Reconcile Monthly Bills & Cashflow Forecast"',
      },
      {
        agent: "ADMIN-02",
        type: "SUCCESS",
        msg: `${bills.length} bills analyzed. Pending: ${rm(pendingTotal)} across ${pendingBills.length} items.`,
      },
      {
        agent: "ROUTINE-04",
        type: "ACTION",
        msg: "Set payment reminder alerts 2 days prior to each due date.",
      },
    ]);
    setActiveTab("bills");
  };

  const triggerGroceryWorkflow = () => {
    pushLogs([
      {
        agent: "HOME-03",
        type: "TOOL",
        msg: '⚡ WORKFLOW: "Weekly Meal & Grocery RAG Optimization"',
      },
      {
        agent: "HOME-03",
        type: "TOOL",
        msg: `vector_rag.query("household_pantry", { filter: "Dietary: ${userPreferences.dietary}" })`,
      },
      {
        agent: "HOME-03",
        type: "SUCCESS",
        msg: `Meal plan generated. ${groceries.filter((g) => g.inPantry).length} items already in pantry, ${basket.length} to buy (${rm(basketTotal)}).`,
      },
    ]);
    setRagVectors((v) => v + groceries.length);
    setActiveTab("groceries");
  };

  const toggleBill = (id) => {
    const bill = bills.find((b) => b.id === id);
    setBills((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, status: b.status === "PAID" ? "PENDING" : "PAID" }
          : b,
      ),
    );
    if (bill)
      pushLogs([
        {
          agent: "ADMIN-02",
          type: "ACTION",
          msg: `"${bill.name}" marked ${bill.status === "PAID" ? "PENDING" : "PAID"} (${rm(bill.amount)}).`,
        },
      ]);
  };

  const togglePantry = (id) =>
    setGroceries((prev) =>
      prev.map((g) => (g.id === id ? { ...g, inPantry: !g.inPantry } : g)),
    );

  const addGrocery = (name, price = 15) => {
    if (!name.trim()) return;
    setGroceries((prev) => [
      ...prev,
      {
        id: uid(),
        name: name.trim(),
        category: "Custom",
        inPantry: false,
        estPrice: price,
        recipeNeeded: "Added via prompt",
      },
    ]);
    setRagVectors((v) => v + 1);
  };

  const handleCustomPromptSubmit = (e) => {
    e?.preventDefault();
    const text = customPrompt.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    pushLogs([
      { agent: "ADMIN-02", type: "TOOL", msg: `✨ CUSTOM PROMPT: "${text}"` },
    ]);

    const addMatch = lower.match(/add (.+?)( to|$)/);
    if (
      lower.includes("grocery") ||
      lower.includes("basket") ||
      lower.includes("shopping") ||
      addMatch
    ) {
      addGrocery(
        addMatch
          ? addMatch[1]
          : text.replace(/add|to.*list/gi, "").trim() || "New grocery item",
      );
      pushLogs([
        {
          agent: "HOME-03",
          type: "SUCCESS",
          msg: "Item added to basket and indexed in Pantry RAG.",
        },
      ]);
      setActiveTab("groceries");
    } else if (
      lower.includes("penang") ||
      lower.includes("trip") ||
      lower.includes("flight") ||
      lower.includes("holiday")
    ) {
      triggerTripWorkflow();
    } else if (
      lower.includes("bill") ||
      lower.includes("tuition") ||
      lower.includes("fee") ||
      lower.includes("pay")
    ) {
      triggerBillsWorkflow();
    } else if (
      lower.includes("sleep") ||
      lower.includes("schedule") ||
      lower.includes("routine") ||
      lower.includes("calendar")
    ) {
      pushLogs([
        {
          agent: "ROUTINE-04",
          type: "SUCCESS",
          msg: `Routine checked against ${userPreferences.targetSleepDuration} sleep target. No conflicts.`,
        },
      ]);
      setActiveTab("schedule");
    } else {
      pushLogs([
        {
          agent: "LOGISTICS-01",
          type: "SUCCESS",
          msg: "Swarm evaluated multi-agent dependencies and re-calculated optimal execution path.",
        },
      ]);
      setActiveTab("feeds");
    }
    setCustomPrompt("");
  };

  const TABS = [
    { id: "feeds", label: "Overview", icon: Sparkles },
    {
      id: "travel",
      label: "Travel plans",
      icon: Plane,
      count: travelItinerary.length,
    },
    {
      id: "bills",
      label: "Bills & budget",
      icon: Receipt,
      count: pendingBills.length,
    },
    {
      id: "groceries",
      label: "Smart pantry",
      icon: ShoppingCart,
      count: basket.length,
    },
    { id: "schedule", label: "Daily routine", icon: Clock },
    { id: "lab", label: "Memory lab", icon: Brain },
  ];
  const currentTab = TABS.find((tab) => tab.id === activeTab);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("feeds");
          }}
          aria-label="LLAMA overview"
        >
          <span className="brand-icon">
            <Zap size={23} fill="currentColor" />
          </span>
          llama<span className="brand-dot">.</span>
        </a>
        <p className="sidebar-caption">A little help. A lot more life.</p>
        <div className="nav-label">YOUR EVERYDAY</div>
        <nav aria-label="Main navigation">
          {TABS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? "selected" : ""}`}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {count !== undefined && (
                <span className="nav-count">{count}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="mini-spark">
            <Sparkles size={24} />
          </div>
          <strong>
            Less life admin.
            <br />
            More living.
          </strong>
          <p>Your four-agent team has the everyday covered.</p>
          <span>Powered by Meta Llama 3.3</span>
        </div>
        <div className="household">
          <span className="avatar">KL</span>
          <div>
            <strong>Your household</strong>
            <small>
              {userPreferences.homeLocation} · {userPreferences.familySize}{" "}
              people
            </small>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Your space</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{currentTab.label}</strong>
          </div>
          <span className="demo-badge">
            <span /> Interactive demo
          </span>
        </header>
        <main id="main-content" tabIndex={-1}>
          <section className="page-heading">
            <div>
              <p className="eyebrow">LIFE, A LITTLE LIGHTER</p>
              <h1>
                {activeTab === "feeds" ? (
                  <>
                    Big plans.
                    <br className="mobile-break" /> Less busywork
                    <span className="purple-text">.</span>
                  </>
                ) : (
                  currentTab.label
                )}
                <span className="heading-spark" aria-hidden="true">
                  ✳
                </span>
              </h1>
              <p>
                {activeTab === "feeds"
                  ? "Your everyday, working together. Here’s the big picture."
                  : "One less thing on your mind. Let’s make room for what matters."}
              </p>
            </div>
            <button
              className="button loop-button"
              onClick={() => setIsSimulating((s) => !s)}
              aria-pressed={isSimulating}
            >
              {isSimulating ? <Pause size={15} /> : <Play size={15} />}
              {isSimulating ? "Pause demo" : "Resume demo"}
            </button>
          </section>

          <section className="stats-grid" aria-label="Household summary">
            {[
              {
                label: "Bills to take care of",
                icon: Receipt,
                tone: "peach",
                value: rm(pendingTotal),
                sub: `${pendingBills.length} pending bills`,
                tab: "bills",
              },
              {
                label: "Time back this week",
                icon: Clock,
                tone: "lime",
                value: `${timeSaved} hrs`,
                sub: "Demo estimate · more you-time",
                tab: "schedule",
              },
              {
                label: "Your grocery basket",
                icon: ShoppingCart,
                tone: "lavender",
                value: rm(basketTotal),
                sub: `${basket.length} items on your list`,
                tab: "groceries",
              },
              {
                label: "Household memory",
                icon: Brain,
                tone: "butter",
                value: ragVectors.toLocaleString(),
                sub: "Demo vectors · made for your family",
                tab: "lab",
              },
            ].map(({ label, icon: Icon, tone, value, sub, tab }) => (
              <button
                className={`stat-card ${tone}`}
                key={label}
                onClick={() => setActiveTab(tab)}
              >
                <div className="stat-top">
                  <span>{label}</span>
                  <Icon size={19} />
                </div>
                <strong>{value}</strong>
                <span className="stat-sub">
                  {sub}
                  <span aria-hidden="true">↗</span>
                </span>
              </button>
            ))}
          </section>

          {(overTravelBudget || overMonthlyCap) && (
            <div className="budget-alert" role="status">
              <AlertCircle size={19} />
              <div>
                {overTravelBudget && (
                  <p>
                    Travel total {rm(travelTotal)} exceeds your{" "}
                    {rm(userPreferences.travelBudgetLimit)} limit.
                  </p>
                )}
                {overMonthlyCap && (
                  <p>
                    Projected spend exceeds your monthly budget of{" "}
                    {rm(userPreferences.monthlyBudgetCap)}.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "feeds" && (
            <>
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="hero-kicker">
                    <Sparkles size={14} /> YOUR EVERYDAY SUPERPOWER
                  </span>
                  <h2>
                    A little delegation.
                    <br />A whole lot of possibility.
                  </h2>
                  <p>
                    From your next getaway to tonight’s grocery run.
                    <br className="desktop-break" /> Give the small stuff to
                    your team.
                  </p>
                  <button
                    className="button hero-button"
                    onClick={triggerTripWorkflow}
                  >
                    Let’s plan a getaway <Plane size={17} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <span className="art-orbit" />
                  <span className="art-star star-one">✳</span>
                  <span className="art-star star-two">✦</span>
                  <div className="art-card art-trip">
                    <Plane size={24} />
                    <span>Next stop</span>
                    <strong>Penang, please.</strong>
                    <span className="art-line" />
                  </div>
                  <div className="art-card art-done">
                    <span className="done-circle">
                      <CheckCircle2 size={27} />
                    </span>
                    <div>
                      <strong>Little things. Handled.</strong>
                      <span>Make space for the good stuff.</span>
                    </div>
                  </div>
                  <div className="art-sun">
                    <Sparkles size={36} />
                  </div>
                </div>
              </section>
              <section className="quick-section">
                <div className="section-heading">
                  <h2>What’s on your mind?</h2>
                  <span>One click to get things moving</span>
                </div>
                <div className="quick-grid">
                  {[
                    {
                      title: "A change of scenery",
                      detail: "Build your Penang family itinerary",
                      icon: Plane,
                      tone: "lavender",
                      action: triggerTripWorkflow,
                    },
                    {
                      title: "Bills, without the blur",
                      detail: "Review your monthly cashflow",
                      icon: Receipt,
                      tone: "peach",
                      action: triggerBillsWorkflow,
                    },
                    {
                      title: "Good food. Less guesswork.",
                      detail: "Make a smarter grocery list",
                      icon: ShoppingCart,
                      tone: "lime",
                      action: triggerGroceryWorkflow,
                    },
                  ].map(({ title, detail, icon: Icon, tone, action }) => (
                    <button className="quick-card" key={title} onClick={action}>
                      <span className={`quick-icon ${tone}`}>
                        <Icon size={22} />
                      </span>
                      <div>
                        <strong>{title}</strong>
                        <span>{detail}</span>
                      </div>
                      <span className="quick-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="overview-grid">
                <section className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>The everyday feed</h2>
                      <p>Your team’s activity, in one place.</p>
                    </div>
                    <span
                      className={`status-pill ${isSimulating ? "running" : ""}`}
                    >
                      <span />
                      {isSimulating ? "Simulating" : "Paused"}
                    </span>
                  </div>
                  <div className="feed-tools">
                    <button
                      onClick={() => setAutoScroll((s) => !s)}
                      aria-pressed={autoScroll}
                    >
                      Auto-scroll {autoScroll ? "on" : "off"}
                    </button>
                    <button onClick={() => setLogs([])}>
                      <RotateCcw size={13} /> Clear feed
                    </button>
                  </div>
                  <div
                    className="feed-list"
                    ref={logBoxRef}
                    aria-label="Demo agent activity"
                  >
                    {logs.length === 0 ? (
                      <div className="empty-state">
                        <Terminal size={27} />
                        <strong>A fresh start.</strong>
                        <p>Your next demo activity will show up here.</p>
                      </div>
                    ) : (
                      logs.map((log) => {
                        const agent = agents.find((a) => a.name === log.agent);
                        const Icon = agent?.icon || Zap;
                        return (
                          <article className="feed-item" key={log.id}>
                            <span
                              className={`feed-icon ${agent?.color || "sky"}`}
                            >
                              <Icon size={16} />
                            </span>
                            <div>
                              <div className="feed-meta">
                                <strong>{log.agent}</strong>
                                <span>{log.type.toLowerCase()}</span>
                                <time>{log.time}</time>
                              </div>
                              <p>{log.msg}</p>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                  <form
                    className="prompt-form"
                    onSubmit={handleCustomPromptSubmit}
                  >
                    <Sparkles size={18} />
                    <input
                      aria-label="Ask your team"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Try “add salmon to grocery list”"
                    />
                    <button className="button primary" type="submit">
                      Send <span aria-hidden="true">↗</span>
                    </button>
                  </form>
                </section>
                <section className="panel team-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Meet your team</h2>
                      <p>Four specialists. One everyday.</p>
                    </div>
                    <span className="team-count">04</span>
                  </div>
                  {agents.map((agent) => {
                    const Icon = agent.icon;
                    return (
                      <article className="agent-card" key={agent.id}>
                        <div className="agent-top">
                          <span className={`agent-icon ${agent.color}`}>
                            <Icon size={21} />
                          </span>
                          <div>
                            <h3>{agent.role.split(" & ")[0]}</h3>
                            <span>{agent.name}</span>
                          </div>
                          <span className="agent-status">
                            {isSimulating
                              ? agent.status.toLowerCase()
                              : "paused"}
                          </span>
                        </div>
                        <p>{agent.activity}</p>
                        <div
                          className={`load-track ${agent.color}`}
                          role="meter"
                          aria-label={`${agent.name} demo load`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={agent.load}
                        >
                          <span style={{ width: `${agent.load}%` }} />
                        </div>
                        <div className="agent-foot">
                          <span>{agent.load}% demo load</span>
                          <span>
                            {agent.processedEvents.toLocaleString()} events
                          </span>
                        </div>
                        <div className="skill-tags">
                          {agent.skills.map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </section>
              </div>
            </>
          )}

          {activeTab === "travel" && (
            <section className="view-section">
              <div className="view-banner lavender">
                <div>
                  <span className="eyebrow">YOUR NEXT CHAPTER</span>
                  <h2>Three days. All Penang.</h2>
                  <p>
                    A family of {userPreferences.familySize}, heading out from{" "}
                    {userPreferences.homeLocation}.
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={triggerTripWorkflow}
                >
                  <Sparkles size={16} /> Re-optimize trip
                </button>
              </div>
              <div className="budget-line">
                <strong>
                  {rm(travelTotal)}{" "}
                  <span>of {rm(userPreferences.travelBudgetLimit)} budget</span>
                </strong>
                <span>
                  {overTravelBudget ? "Over budget" : "Room to explore"}
                </span>
              </div>
              <div
                className={`budget-track ${overTravelBudget ? "over-budget" : ""}`}
              >
                <span
                  style={{
                    width: `${Math.min(100, (travelTotal / Math.max(1, userPreferences.travelBudgetLimit)) * 100)}%`,
                  }}
                />
              </div>
              <div className="trip-grid">
                {travelItinerary.map((item, i) => (
                  <article className="panel trip-card" key={item.day}>
                    <div className={`trip-illustration trip-day-${i}`}>
                      <Plane size={52} strokeWidth={1.2} />
                      <span>0{i + 1}</span>
                    </div>
                    <div className="trip-body">
                      <div className="card-meta">
                        <span>{item.day}</span>
                        <strong>{rm(item.cost)}</strong>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.notes}</p>
                      <span className="trip-status">
                        <CheckCircle2 size={15} />
                        {item.status} · demo itinerary
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === "bills" && (
            <section className="view-section">
              <div className="view-banner peach">
                <div>
                  <span className="eyebrow">A CLEARER PICTURE</span>
                  <h2>Small bills. Big peace of mind.</h2>
                  <p>
                    {rm(pendingTotal)} pending · Monthly budget{" "}
                    {rm(userPreferences.monthlyBudgetCap)}
                  </p>
                </div>
                <button className="button dark" onClick={triggerBillsWorkflow}>
                  <RotateCcw size={16} /> Scan bill cycles
                </button>
              </div>
              <div
                className="panel table-wrap"
                role="region"
                aria-label="Recurring bills, scroll horizontally on small screens"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      {[
                        "Recurring item",
                        "Category",
                        "Amount",
                        "Due date",
                        "Agent insight",
                        "Status",
                      ].map((h) => (
                        <th scope="col" key={h}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.id}>
                        <th scope="row">{bill.name}</th>
                        <td>{bill.category}</td>
                        <td className="amount">{rm(bill.amount)}</td>
                        <td>{bill.dueDate}</td>
                        <td>{bill.agentNote}</td>
                        <td>
                          <button
                            className={`bill-status ${bill.status === "PAID" ? "paid" : "pending"}`}
                            aria-label={`${bill.name}: ${bill.status.toLowerCase()}, click to mark ${bill.status === "PAID" ? "pending" : "paid"}`}
                            onClick={() => toggleBill(bill.id)}
                          >
                            {bill.status === "PAID" && (
                              <CheckCircle2 size={13} />
                            )}
                            {bill.status.toLowerCase()}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="view-note">
                Tap a status to mark a demo bill paid or pending. No payments
                are made.
              </p>
            </section>
          )}

          {activeTab === "groceries" && (
            <section className="view-section">
              <div className="view-banner lime">
                <div>
                  <span className="eyebrow">A WELL-STOCKED EVERYDAY</span>
                  <h2>Good things in your basket.</h2>
                  <p>
                    {userPreferences.dietary} · {basket.length} items to buy ·{" "}
                    {rm(basketTotal)}
                  </p>
                </div>
                <button
                  className="button dark"
                  onClick={triggerGroceryWorkflow}
                >
                  <Sparkles size={16} /> Generate list
                </button>
              </div>
              <form
                className="grocery-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  addGrocery(newGrocery);
                  setNewGrocery("");
                }}
              >
                <label className="sr-only" htmlFor="new-grocery">
                  New grocery item
                </label>
                <input
                  id="new-grocery"
                  value={newGrocery}
                  onChange={(e) => setNewGrocery(e.target.value)}
                  placeholder="What else do you need?"
                />
                <button className="button primary">
                  <Plus size={17} /> Add item
                </button>
              </form>
              <div className="grocery-layout">
                <div className="grocery-list">
                  {groceries.length === 0 && (
                    <div className="panel empty-state">
                      <ShoppingCart size={28} />
                      <strong>A little room for something good.</strong>
                      <p>Add your first grocery item above.</p>
                    </div>
                  )}
                  {groceries.map((item) => (
                    <article className="panel grocery-item" key={item.id}>
                      <span
                        className={`grocery-symbol ${item.inPantry ? "lime" : "lavender"}`}
                      >
                        <ShoppingCart size={21} />
                      </span>
                      <div className="grocery-detail">
                        <h3>{item.name}</h3>
                        <p>
                          {item.category} · {item.recipeNeeded}
                        </p>
                      </div>
                      <strong>{rm(item.estPrice)}</strong>
                      <button
                        className={`pantry-toggle ${item.inPantry ? "stocked" : ""}`}
                        aria-label={`${item.name}: ${item.inPantry ? "in pantry, move to basket" : "in basket, move to pantry"}`}
                        onClick={() => togglePantry(item.id)}
                      >
                        {item.inPantry ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <Plus size={14} />
                        )}
                        {item.inPantry ? "In pantry" : "To buy"}
                      </button>
                      <button
                        className="icon-button delete-button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() =>
                          setGroceries((p) => p.filter((g) => g.id !== item.id))
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </article>
                  ))}
                </div>
                <aside className="panel pantry-summary">
                  <span className="quick-icon lime">
                    <Database size={25} />
                  </span>
                  <h3>A pantry that remembers.</h3>
                  <p>
                    Your demo home agent checks what’s already in stock, so you
                    don’t double up.
                  </p>
                  <dl>
                    <div>
                      <dt>Already in pantry</dt>
                      <dd>
                        {groceries.filter((g) => g.inPantry).length} items
                      </dd>
                    </div>
                    <div>
                      <dt>On the shopping list</dt>
                      <dd>{basket.length} items</dd>
                    </div>
                    <div>
                      <dt>Basket estimate</dt>
                      <dd>{rm(basketTotal)}</dd>
                    </div>
                    <div>
                      <dt>Memory vectors</dt>
                      <dd>{ragVectors.toLocaleString()}</dd>
                    </div>
                  </dl>
                </aside>
              </div>
            </section>
          )}

          {activeTab === "schedule" && (
            <section className="view-section">
              <div className="view-banner butter">
                <div>
                  <span className="eyebrow">FIND YOUR EVERYDAY RHYTHM</span>
                  <h2>Make time for a little balance.</h2>
                  <p>
                    {userPreferences.homeLocation} · Sleep target:{" "}
                    {userPreferences.targetSleepDuration}
                  </p>
                </div>
                <Clock size={48} strokeWidth={1.3} />
              </div>
              <div className="schedule-list">
                {schedule.map((block, i) => (
                  <article className="panel schedule-item" key={block.time}>
                    <span className="schedule-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <time>{block.time}</time>
                    <div>
                      <h3>{block.task}</h3>
                      <p>{block.focus}</p>
                    </div>
                    <span
                      className={`category-tag ${block.category === "Work" ? "lavender" : block.category === "Family" ? "peach" : "lime"}`}
                    >
                      {block.category}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === "lab" && (
            <section className="memory-grid">
              <div className="panel memory-panel">
                <div className="panel-heading">
                  <div>
                    <h2>A little more you.</h2>
                    <p>Give your demo team the bigger picture.</p>
                  </div>
                  <Brain size={25} />
                </div>
                <div className="preferences-grid">
                  {[
                    ["Family size", "familySize", "number"],
                    ["Dietary preferences", "dietary", "text"],
                    ["Home location", "homeLocation", "text"],
                    ["Sleep target", "targetSleepDuration", "text"],
                    ["Monthly budget (RM)", "monthlyBudgetCap", "number"],
                    ["Travel budget (RM)", "travelBudgetLimit", "number"],
                  ].map(([label, key, type]) => (
                    <div className="preference-field" key={key}>
                      <label htmlFor={`pref-${key}`}>{label}</label>
                      <input
                        id={`pref-${key}`}
                        type={type}
                        min={
                          type === "number"
                            ? key === "familySize"
                              ? 1
                              : 0
                            : undefined
                        }
                        value={userPreferences[key]}
                        onChange={(e) =>
                          setUserPreferences((p) => ({
                            ...p,
                            [key]:
                              type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <p className="memory-note">
                  <Sparkles size={17} />
                  Changes update your budgets and pantry preferences instantly
                  in this session.
                </p>
              </div>
              <div className="panel prompt-preview">
                <div className="panel-heading">
                  <div>
                    <h2>Behind the everyday</h2>
                    <p>Your generated Llama 3.3 system prompt.</p>
                  </div>
                  <Terminal size={22} />
                </div>
                <pre>{`// EVERYDAY LIFE SWARM
You are the household orchestrator.

// YOUR HOUSEHOLD
family_size: ${userPreferences.familySize}
home: ${userPreferences.homeLocation}
dietary: ${userPreferences.dietary}
sleep_target: ${userPreferences.targetSleepDuration}
monthly_cap: ${rm(userPreferences.monthlyBudgetCap)}
travel_cap: ${rm(userPreferences.travelBudgetLimit)}

// A LITTLE LESS FRICTION
1. Align trips with school calendars & budgets.
2. Check pantry memory before buying more.
3. Make room for ${userPreferences.targetSleepDuration} of sleep.
4. Keep everyday life working together.`}</pre>
              </div>
            </section>
          )}
        </main>
        <footer className="footer">
          <span>
            Made for the beautifully busy everyday
            <span className="purple-text">.</span>
          </span>
          <span>Meta Llama 3.3 · Demo data · Changes reset on refresh</span>
        </footer>
      </div>
    </div>
  );
}
