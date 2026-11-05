import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Terminal,
  Plane,
  Receipt,
  ShoppingCart,
  Clock,
  RotateCcw,
  CheckCircle2,
  Brain,
  Database,
  Sparkles,
  Zap,
  Trash2,
  Plus,
  AlertCircle,
  ArrowUpRight,
  Asterisk,
  LogOut,
  Users,
  Home,
  Mail,
  Lock,
  UserPlus,
  LogIn,
  Crown,
  Gift,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "./lib/supabase";

const nowTime = () => new Date().toTimeString().slice(0, 8);
const uid = () => Date.now() + Math.random().toString(16).slice(2);
const rm = (n) => `RM ${Number(n).toFixed(2)}`;

const INITIAL_AGENTS = [
  {
    id: "travel",
    name: "LOGISTICS-01",
    role: "Travel & Vacation Planner",
    color: "indigo",
    icon: Plane,
    activity:
      "Itineraries, budget estimates and questions to check before booking.",
    skills: ["Travel proposals", "Budget planning"],
  },
  {
    id: "bills",
    name: "ADMIN-02",
    role: "Life Admin & Bill Manager",
    color: "amber",
    icon: Receipt,
    activity: "Bill summaries and payment priorities. No bank connection.",
    skills: ["Bill review", "Cashflow advice"],
  },
  {
    id: "groceries",
    name: "HOME-03",
    role: "Pantry & Grocery Agent",
    color: "emerald",
    icon: ShoppingCart,
    activity:
      "Meal suggestions and shopping ideas based on the pantry you supply.",
    skills: ["Pantry context", "Meal ideas"],
  },
  {
    id: "schedule",
    name: "ROUTINE-04",
    role: "Routine & Wellness Scheduler",
    color: "sky",
    icon: Clock,
    activity: "Balanced time blocks and routines. No calendar integration.",
    skills: ["Routine proposals", "Time blocks"],
  },
];

const INITIAL_TRAVEL = [
  {
    day: "Day 1",
    title: "Arrival & Georgetown Heritage Walk",
    cost: 350,
    status: "Sample",
    notes:
      "Example only: explore Georgetown and local food. Flights and accommodation are not booked.",
  },
  {
    day: "Day 2",
    title: "Penang Hill Funicular & Entopia Butterfly Park",
    cost: 420,
    status: "Sample",
    notes:
      "Example only: consider Penang Hill and Entopia. Verify opening times, ticket prices and school dates.",
  },
  {
    day: "Day 3",
    title: "Batu Ferringhi Beach & Culinary Souvenirs",
    cost: 380,
    status: "Sample",
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
    agentNote: "Sample bill · no bank connected",
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
    agentNote: "Sample paid status · not verified",
  },
  {
    id: 4,
    name: "Car Loan Installment",
    amount: 680.0,
    dueDate: "Nov 12",
    status: "PENDING",
    category: "Finance",
    agentNote: "Sample bill · balance not checked",
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
  const [logs, setLogs] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [customPrompt, setCustomPrompt] = useState("");
  const [newGrocery, setNewGrocery] = useState("");

  const agents = INITIAL_AGENTS;
  const [travelItinerary] = useState(INITIAL_TRAVEL);
  const [bills, setBills] = useState(INITIAL_BILLS);
  const [groceries, setGroceries] = useState(INITIAL_GROCERIES);
  const [schedule] = useState(INITIAL_SCHEDULE);

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

  const [connection, setConnection] = useState({
    configured: false,
    loading: true,
    missing: [],
  });
  const [isRunning, setIsRunning] = useState(false);
  const [agentResult, setAgentResult] = useState(null);
  const [agentError, setAgentError] = useState("");
  const [hasConnected, setHasConnected] = useState(false);
  const requestInFlight = useRef(false);
  const feedbackRef = useRef(null);

  // Auth & Household state
  const [user, setUser] = useState(null);
  const [household, setHousehold] = useState(null);
  const [authMode, setAuthMode] = useState("signin"); // signin | signup
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [householdError, setHouseholdError] = useState("");
  const [showHouseholdSetup, setShowHouseholdSetup] = useState(false);

  useEffect(() => {
    if (agentError || agentResult || isRunning)
      feedbackRef.current?.scrollIntoView({ block: "start" });
  }, [agentError, agentResult, isRunning]);

  // Check Supabase auth
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchHousehold(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchHousehold(session.user.id);
      } else {
        setHousehold(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchHousehold = async (userId) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("household_members")
      .select("household_id, households(name)")
      .eq("user_id", userId)
      .single();
    
    if (data) {
      setHousehold({ id: data.household_id, name: data.households.name });
      setShowHouseholdSetup(false);
    } else {
      setShowHouseholdSetup(true);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setAuthError("Authentication not configured. You can continue as guest.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: { data: { display_name: authName } }
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setAuthError("Account created! Check your email (including spam) to confirm, then sign in. Supabase free tier limits to 3 emails/hour — if you don't see it in 2 minutes, try resending or continue as guest.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setHousehold(null);
  };

  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    if (!supabase || !user) return;
    setHouseholdError("");
    try {
      const { data, error } = await supabase.rpc("create_household", {
        household_name: householdName,
        member_name: authName || user.email?.split("@")[0] || "Member"
      });
      if (error) throw error;
      setHousehold({ id: data, name: householdName });
      setShowHouseholdSetup(false);
      setHouseholdName("");
    } catch (err) {
      setHouseholdError(err.message);
    }
  };

  const handleJoinHousehold = async (e) => {
    e.preventDefault();
    if (!supabase || !user) return;
    setHouseholdError("");
    try {
      const { data, error } = await supabase.rpc("join_household", {
        invite_token: inviteCode,
        member_name: authName || user.email?.split("@")[0] || "Member"
      });
      if (error) throw error;
      // Fetch household name
      const { data: hData } = await supabase.from("households").select("name").eq("id", data).single();
      setHousehold({ id: data, name: hData?.name || "Household" });
      setShowHouseholdSetup(false);
      setInviteCode("");
    } catch (err) {
      setHouseholdError(err.message);
    }
  };

  const checkConnection = async (signal) => {
    try {
      const response = await fetch("/api/agent", { signal });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setConnection({ ...data, loading: false });
    } catch (error) {
      if (error.name !== "AbortError")
        setConnection({
          configured: false,
          loading: false,
          missing: [],
          unavailable: true,
        });
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    checkConnection(controller.signal);
    return () => controller.abort();
  }, []);

  const runHouseholdAgent = async (task, prompt) => {
    if (requestInFlight.current) return;
    setAgentError("");
    if (!connection.configured) {
      setAgentError(
        "LLAMA AI is not configured yet. Check server setup.",
      );
      return;
    }
    requestInFlight.current = true;
    setIsRunning(true);
    setAgentResult(null);
    pushLogs([
      {
        agent: "COORDINATOR",
        type: "INFO",
        msg: `Requesting a ${task === "general" ? "household" : task} suggestion via LLAMA AI. No records will be changed.`,
      },
    ]);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        signal: AbortSignal.timeout(35000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          prompt,
          context: {
            preferences: userPreferences,
            bills,
            groceries,
            travel: travelItinerary,
            schedule,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 503) checkConnection();
        throw new Error(data.error || "The model request failed. Try again.");
      }
      if (typeof data.answer !== "string" || !data.answer.trim())
        throw new Error("The model returned no usable suggestion.");
      setAgentResult(data);
      setHasConnected(true);
      pushLogs([
        {
          agent: data.agent,
          type: "SUCCESS",
          msg: "LLAMA suggestion received. Review it above; no actions have been executed.",
        },
      ]);
      setCustomPrompt("");
    } catch (error) {
      const message = ["AbortError", "TimeoutError"].includes(error.name)
        ? "The request timed out. Please try again."
        : error.message;
      setAgentError(message);
      pushLogs([{ agent: "COORDINATOR", type: "ERROR", msg: message }]);
    } finally {
      requestInFlight.current = false;
      setIsRunning(false);
    }
  };

  const triggerTripWorkflow = () =>
    runHouseholdAgent(
      "travel",
      "Suggest a three-day Penang family itinerary within our travel budget. Show estimated costs and what needs checking. Do not book anything.",
    );
  const triggerBillsWorkflow = () =>
    runHouseholdAgent(
      "bills",
      "Review our household bills, summarize unpaid totals and suggest payment priorities. Do not make payments or set reminders.",
    );
  const triggerGroceryWorkflow = () =>
    runHouseholdAgent(
      "groceries",
      "Suggest meals and a grocery list using our pantry, dietary preferences and budget. Distinguish pantry items from suggested purchases.",
    );

  const toggleBill = (id) => {
    setBills((prev) =>
      prev.map((bill) =>
        bill.id === id
          ? { ...bill, status: bill.status === "PAID" ? "PENDING" : "PAID" }
          : bill,
      ),
    );
    pushLogs([
      {
        agent: "ADMIN-02",
        type: "ACTION",
        msg: "Bill status changed manually in this browser session. No payment was made.",
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
        recipeNeeded: "Added manually · estimated price",
      },
    ]);
  };
  const handleCustomPromptSubmit = (e) => {
    e.preventDefault();
    if (customPrompt.trim()) runHouseholdAgent("general", customPrompt.trim());
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

  // Auth gate - show welcome screen if not logged in and Supabase is configured
  const showAuthGate = isSupabaseConfigured && !user;
  const showHouseholdGate = isSupabaseConfigured && user && showHouseholdSetup;

  if (showAuthGate) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-header">
            <img src="/llama-logo.png" alt="" width="56" height="56" className="auth-logo" />
            <h1>llama<span className="brand-dot">.</span></h1>
            <p>A little help. A lot more life.</p>
            <div className="free-badge">
              <Gift size={16} /> Free for everyone
            </div>
          </div>

          <div className="auth-tabs">
            <button
              className={authMode === "signin" ? "active" : ""}
              onClick={() => setAuthMode("signin")}
            >
              <LogIn size={16} /> Sign in
            </button>
            <button
              className={authMode === "signup" ? "active" : ""}
              onClick={() => setAuthMode("signup")}
            >
              <UserPlus size={16} /> Create account
            </button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {authMode === "signup" && (
              <div className="auth-field">
                <label htmlFor="auth-name">Your name</label>
                <div className="input-wrap">
                  <Users size={16} />
                  <input
                    id="auth-name"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Aisha"
                    required={authMode === "signup"}
                  />
                </div>
              </div>
            )}
            <div className="auth-field">
              <label htmlFor="auth-email">Email</label>
              <div className="input-wrap">
                <Mail size={16} />
                <input
                  id="auth-email"
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <div className="input-wrap">
                <Lock size={16} />
                <input
                  id="auth-password"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>
            {authError && (
              <div className="auth-error-wrap" role="alert">
                <p className="auth-error">{authError}</p>
                {authError.includes("Check your email") && (
                  <button
                    type="button"
                    className="button ghost small"
                    onClick={async () => {
                      if (!authEmail) return;
                      setAuthError("");
                      const { error } = await supabase.auth.resend({
                        type: "signup",
                        email: authEmail,
                      });
                      setAuthError(error ? error.message : "Resent! Check email & spam (3/hour limit).");
                    }}
                  >
                    Resend confirmation email
                  </button>
                )}
              </div>
            )}
            <button type="submit" className="button primary auth-submit" disabled={authLoading}>
              {authLoading ? "Please wait…" : authMode === "signup" ? "Create free account" : "Sign in"}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            className="button ghost auth-guest"
            onClick={() => {
              // Guest mode - set a dummy user to bypass auth
              setUser({ id: "guest", email: "guest@llama.local" });
              setHousehold({ id: "guest-household", name: "Demo Household" });
            }}
          >
            Continue as guest · Try LLAMA free
          </button>

          <p className="auth-footnote">
            Connect your household to save and share with family.
          </p>
        </div>

        <div className="auth-features">
          <h2>Your everyday, lighter.</h2>
          <div className="feature-list">
            <div className="feature">
              <span className="feature-icon lavender"><Plane size={20} /></span>
              <div>
                <strong>Plan trips together</strong>
                <span>Penang itineraries, budgets, and checklists</span>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon peach"><Receipt size={20} /></span>
              <div>
                <strong>Stay on top of bills</strong>
                <span>Cashflow summaries and payment priorities</span>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon lime"><ShoppingCart size={20} /></span>
              <div>
                <strong>Shop smarter</strong>
                <span>Pantry-aware meals and grocery lists</span>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon butter"><Clock size={20} /></span>
              <div>
                <strong>Find your rhythm</strong>
                <span>Balanced routines for the whole family</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showHouseholdGate) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-header">
            <Home size={32} />
            <h1>Connect your household</h1>
            <p>One household, shared everywhere. Free forever.</p>
          </div>

          <form onSubmit={handleCreateHousehold} className="auth-form">
            <h3><Crown size={16} /> Create a new household</h3>
            <div className="auth-field">
              <label htmlFor="household-name">Household name</label>
              <div className="input-wrap">
                <Home size={16} />
                <input
                  id="household-name"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g. The Ahmad Family"
                  required
                />
              </div>
            </div>
            <button type="submit" className="button primary auth-submit">
              Create household
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={handleJoinHousehold} className="auth-form">
            <h3><Users size={16} /> Join with invite code</h3>
            <div className="auth-field">
              <label htmlFor="invite-code">Invite code</label>
              <div className="input-wrap">
                <Mail size={16} />
                <input
                  id="invite-code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Paste invite code"
                  required
                />
              </div>
            </div>
            <button type="submit" className="button dark auth-submit">
              Join household
            </button>
          </form>

          {householdError && <p className="auth-error" role="alert">{householdError}</p>}

          <button className="button ghost" onClick={handleSignOut} style={{ marginTop: 16, width: "100%" }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    );
  }

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
          <img
            className="brand-logo"
            src="/llama-logo.png"
            alt=""
            width="48"
            height="48"
          />
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
          <span>LLAMA · Free</span>
        </div>
        <div className="household">
          <span className="avatar">{household ? household.name.slice(0, 2).toUpperCase() : "KL"}</span>
          <div>
            <strong>{household ? household.name : "Your household"}</strong>
            <small>
              {userPreferences.homeLocation} · {userPreferences.familySize}{" "}
              people
            </small>
          </div>
          {user && user.id !== "guest" && (
            <button className="icon-button" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Your space</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{currentTab.label}</strong>
          </div>
          <span className="demo-badge free-badge">
            <Gift size={12} /> Free
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
                  <Asterisk size={32} />
                </span>
              </h1>
              <p>
                {activeTab === "feeds"
                  ? "Your everyday, working together. Here's the big picture."
                  : "One less thing on your mind. Let's make room for what matters."}
              </p>
            </div>
            <button
              className="button loop-button"
              onClick={() => checkConnection()}
              disabled={isRunning}
            >
              <RotateCcw size={15} /> Recheck API
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
                label: "Daily routine",
                icon: Clock,
                tone: "lime",
                value: `${schedule.length} blocks`,
                sub: "Your sample schedule",
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
                label: "Already in pantry",
                icon: Brain,
                tone: "butter",
                value: `${groceries.filter((g) => g.inPantry).length} items`,
                sub: "From your household list",
                tab: "groceries",
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
                  <span aria-hidden="true">
                    <ArrowUpRight size={16} />
                  </span>
                </span>
              </button>
            ))}
          </section>

          <section
            className="panel api-setup"
            ref={feedbackRef}
            aria-label="LLAMA connection for LLAMA"
          >
            <div className="panel-heading">
              <div>
                <h2>
                  {connection.loading
                    ? "Checking AI setup…"
                    : connection.configured
                      ? "LLAMA ready · Free for everyone"
                      : "AI is not connected yet"}
                </h2>
                <p>
                  Your household data is used for suggestions only.
                </p>
              </div>
              <span className="status-pill">
                {hasConnected
                  ? "Response received"
                  : "No request yet"}
              </span>
            </div>
            {!connection.loading && !connection.configured && (
              <div className="setup-details">
                <p>
                  {connection.unavailable
                    ? "API unavailable. Start the dev server with npm run dev."
                    : `Server needs: ${connection.missing.join(", ")}.`}
                </p>
                <p>
                  Contact support if this persists.
                </p>
              </div>
            )}
            {connection.configured && (
              <div className="free-tier-notice">
                <Gift size={16} />
                <span>Just ask — your household assistant is ready.</span>
              </div>
            )}
            {isRunning && (
              <p className="agent-working" role="status">
                LLAMA is preparing a suggestion for LLAMA… No household
                records will be changed.
              </p>
            )}
            {agentError && (
              <p className="agent-error" role="alert">
                {agentError}
              </p>
            )}
          </section>
          {agentResult && (
            <section className="panel agent-answer" aria-live="polite">
              <div className="panel-heading">
                <div>
                  <h2>{agentResult.agent} · suggestion</h2>
                  <p>
                    LLAMA AI · Free
                  </p>
                </div>
                <Sparkles size={23} />
              </div>
              <div className="answer-text">{agentResult.answer}</div>
              <p className="answer-caveat">
                Review estimates and details. Nothing was booked, paid,
                purchased, scheduled or automatically changed.
              </p>
            </section>
          )}

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
                    From your next getaway to tonight's grocery run.
                    <br className="desktop-break" /> Give the small stuff to
                    your team.
                  </p>
                  <button
                    className="button hero-button"
                    onClick={triggerTripWorkflow}
                    disabled={isRunning}
                  >
                    Let's plan a getaway <Plane size={17} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <span className="art-orbit" />
                  <span className="art-star star-one">
                    <Asterisk size={40} />
                  </span>
                  <span className="art-star star-two">
                    <Sparkles size={23} />
                  </span>
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
                  <h2>What's on your mind?</h2>
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
                    <button
                      className="quick-card"
                      key={title}
                      onClick={action}
                      disabled={isRunning}
                    >
                      <span className={`quick-icon ${tone}`}>
                        <Icon size={22} />
                      </span>
                      <div>
                        <strong>{title}</strong>
                        <span>{detail}</span>
                      </div>
                      <span className="quick-arrow" aria-hidden="true">
                        <ArrowUpRight size={16} />
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
                      <p>Your team's activity, in one place.</p>
                    </div>
                    <span
                      className={`status-pill ${isRunning ? "running" : ""}`}
                    >
                      <span />
                      {isRunning ? "Working" : "Idle"}
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
                    aria-label="Agent request activity"
                  >
                    {logs.length === 0 ? (
                      <div className="empty-state">
                        <Terminal size={27} />
                        <strong>A fresh start.</strong>
                        <p>
                          Your actual requests and results will show up here.
                        </p>
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
                      placeholder="Ask about meals, travel, bills or routines…"
                      maxLength={2000}
                      disabled={isRunning}
                    />
                    <button
                      className="button primary"
                      type="submit"
                      disabled={isRunning}
                    >
                      Send{" "}
                      <span aria-hidden="true">
                        <ArrowUpRight size={16} />
                      </span>
                    </button>
                  </form>
                </section>
                <section className="panel team-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Meet your team</h2>
                      <p>Four roles, routed to LLAMA AI (free).</p>
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
                            {isRunning
                              ? "request active"
                              : connection.configured
                                ? "free · ready"
                                : "not connected"}
                          </span>
                        </div>
                        <p>{agent.activity}</p>
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
                  disabled={isRunning}
                >
                  <Sparkles size={16} /> Suggest a trip
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
                <button
                  className="button dark"
                  onClick={triggerBillsWorkflow}
                  disabled={isRunning}
                >
                  <RotateCcw size={16} /> Review bills
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
                  disabled={isRunning}
                >
                  <Sparkles size={16} /> Suggest meals & groceries
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
                    Your supplied pantry list is sent as context when you ask
                    the home agent for suggestions. No vector database is
                    connected.
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
                    <p>
                      Share preferences with LLAMA AI when you send
                      a request.
                    </p>
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
                  Changes update your session budgets and the preferences shared
                  in this session.
                </p>
              </div>
              <div className="panel prompt-preview">
                <div className="panel-heading">
                  <div>
                    <h2>Behind the everyday</h2>
                    <p>Household context used for planning.</p>
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
          <span>
            LLAMA · {household ? household.name : "Demo"} · Free for everyone
          </span>
        </footer>
      </div>
    </div>
  );
}
