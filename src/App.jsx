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
  Gift,
  Settings as SettingsIcon,
  HelpCircle,
  Shield,
} from "lucide-react";
import { authClient } from "../lib/auth-client";
import Settings from "./Settings";
import InfoPage from "./InfoPage";
import { familyRequest, disableDevicePush } from "./lib/family-client";

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

const INITIAL_TRAVEL = [];
const INITIAL_BILLS = [];
const INITIAL_GROCERIES = [];
const INITIAL_SCHEDULE = [];

export default function App() {
  const [activeTab, setActiveTab] = useState("feeds");
  const [logs, setLogs] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [customPrompt, setCustomPrompt] = useState("");
  const [newGrocery, setNewGrocery] = useState("");

  const agents = INITIAL_AGENTS;

  // Auth & Household state - must be before dashboard data that depends on user
  const [authMode, setAuthMode] = useState("signin");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [helpPage, setHelpPage] = useState(null);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [household, setHousehold] = useState(null);
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [family, setFamily] = useState({ household: null, members: [], reminders: [], invites: [] });
  const [familyError, setFamilyError] = useState("");
  const [familyNotice, setFamilyNotice] = useState("");
  const [familyBusy, setFamilyBusy] = useState(false);
  const workspaceRequest = useRef(0);
  const [sharedRevision, setSharedRevision] = useState(0);

  const [travelItinerary, setTravelItinerary] = useState(INITIAL_TRAVEL);
  const [bills, setBills] = useState(INITIAL_BILLS);
  const [groceries, setGroceries] = useState(INITIAL_GROCERIES);
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);
  const [userPreferences, setUserPreferences] = useState({
    familySize: 4,
    monthlyBudgetCap: 5000,
    dietary: "Halal / Low-Sugar",
    homeLocation: "Kuala Lumpur",
    targetSleepDuration: "8 Hours",
    travelBudgetLimit: 1500,
  });

  const applySharedData = (data = {}) => {
    setTravelItinerary(data.travel || []);
    setBills(data.bills || []);
    setGroceries(data.groceries || []);
    setSchedule(data.schedule || []);
    setUserPreferences({ familySize: 4, monthlyBudgetCap: 5000, dietary: "Halal / Low-Sugar", homeLocation: "Kuala Lumpur", targetSleepDuration: "8 Hours", travelBudgetLimit: 1500, ...data.prefs });
  };
  const runFamily = async (input, applyData = false) => {
    const request = ++workspaceRequest.current;
    setFamilyBusy(true); setFamilyError(""); setFamilyNotice("");
    try {
      const result = await familyRequest(input);
      if (request !== workspaceRequest.current) return null;
      setFamily(result); setHousehold(result.household); setHouseholdMembers(result.members);
      if (applyData || ["create", "join", "leave", "delete-household"].includes(input?.action)) {
        applySharedData(result.household?.data); setSharedRevision(result.household?.revision || 0);
      } else if (input?.action === "save") {
        setSharedRevision(result.household.revision); setFamilyNotice("Household changes saved.");
      }
      return result;
    } catch (err) { if (request === workspaceRequest.current) setFamilyError(err.message); return null; }
    finally { if (request === workspaceRequest.current) setFamilyBusy(false); }
  };
  const refreshFamily = async () => {
    const { data, error } = await authClient.getSession();
    if (error) throw new Error(error.message);
    if (data?.user) setUser(data.user);
    return runFamily();
  };
  useEffect(() => {
    workspaceRequest.current++;
    setFamily({ household: null, members: [], reminders: [], invites: [] });
    setHousehold(null); setHouseholdMembers([]); applySharedData(); setLogs([]); setFamilyBusy(false); setFamilyError(""); setFamilyNotice("");
    if (user && user.id !== "guest") runFamily(undefined, true);
    return () => { workspaceRequest.current++; };
  }, [user?.id]);

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

  useEffect(() => {
    if (agentError || agentResult || isRunning)
      feedbackRef.current?.scrollIntoView({ block: "start" });
  }, [agentError, agentResult, isRunning]);

  // Check Better Auth session - instant signup, no email limits
  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      setUser(data?.user ?? null);
    }).catch(() => setAuthError("Session check failed. Please sign in again."));
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const { error } = await authClient.signUp.email({
          email: authEmail,
          password: authPassword,
          name: authName || authEmail.split("@")[0],
          ...(authUsername ? { username: authUsername } : {}),
        });
        if (error) throw new Error(error.message);
        // Instant signup - no email confirmation needed!
        const { data, error: sessionError } = await authClient.getSession();
        if (sessionError || !data?.user) throw new Error(sessionError?.message || "Sign in again to finish account setup.");
        setUser(data.user);
      } else {
        const credentials = authEmail.includes("@")
          ? { email: authEmail, password: authPassword }
          : { username: authEmail, password: authPassword };
        const { error } = await (authEmail.includes("@") ? authClient.signIn.email(credentials) : authClient.signIn.username(credentials));
        if (error) throw new Error(error.message);
        const { data, error: sessionError } = await authClient.getSession();
        if (sessionError || !data?.user) throw new Error(sessionError?.message || "Sign in again to finish account setup.");
        setUser(data.user);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const resetAccount = () => {
    workspaceRequest.current++;
    setUser(null); setHousehold(null); setHouseholdMembers([]); applySharedData(); setLogs([]);
    setAuthPassword(""); setAuthEmail(""); setAuthName(""); setAuthUsername(""); setAuthError(""); setActiveTab("feeds");
  };
  const handleSignOut = async () => {
    if (user?.id !== "guest") {
      await disableDevicePush();
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message);
    }
    resetAccount();
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
    { id: "settings", label: "Settings", icon: SettingsIcon },
    { id: "faq", label: "FAQ", icon: HelpCircle },
    { id: "privacy", label: "Privacy policy", icon: Shield },
  ];
  const currentTab = TABS.find((tab) => tab.id === activeTab);

  // Auth gate - show welcome screen if not logged in
  const showAuthGate = !user;
  if (helpPage) return <div className="public-info"><InfoPage page={helpPage} onBack={() => setHelpPage(null)} /></div>;

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
            {authMode === "signup" && <div className="auth-field"><label htmlFor="auth-username">Username (use the one assigned by your family anchor)</label><input id="auth-username" value={authUsername} onChange={e => setAuthUsername(e.target.value)} pattern="[A-Za-z0-9_.]{3,30}" minLength={3} maxLength={30} autoComplete="username" placeholder="Optional for a new family anchor" /></div>}
            <div className="auth-field">
              <label htmlFor="auth-email">{authMode === "signup" ? "Email" : "Email or username"}</label>
              <div className="input-wrap">
                <Mail size={16} />
                <input
                  id="auth-email"
                  type={authMode === "signup" ? "email" : "text"}
                  autoComplete="username"
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
                  placeholder="At least 8 characters"
                  required
                  minLength={authMode === "signup" ? 8 : undefined}
                />
              </div>
            </div>
            {authError && <p className="auth-error" role="alert">{authError}</p>}
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
              setUser({ id: "guest", email: "guest@llama.local", name: "Guest" });
            }}
          >
            Continue as guest · Try LLAMA free
          </button>

          <p className="auth-footnote">
            Connect your household to save and share with family.
          </p>
          <div className="settings-row"><button className="button ghost" onClick={() => setHelpPage("faq")}>FAQ</button><button className="button ghost" onClick={() => setHelpPage("privacy")}>Privacy policy</button></div>
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
            <button className="icon-button" onClick={() => handleSignOut().catch(err => { setFamilyError(err.message); setActiveTab("settings"); })} aria-label="Sign out" title="Sign out">
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

          {activeTab === "settings" ? <Settings user={user} family={family} error={familyError} busy={familyBusy} run={runFamily} refresh={refreshFamily} onLogout={handleSignOut} onDeleted={resetAccount} onHelp={setActiveTab} /> : ["faq", "privacy"].includes(activeTab) ? <InfoPage page={activeTab} /> : <>
          {user?.id !== "guest" && <div className="panel shared-banner">
            <div><strong>{household ? `Shared with ${household.name}` : "Connect your household"}</strong><p>{household ? "Save publishes all current lists and preferences. Refresh replaces unsaved edits with the latest shared version." : "Create or join a household in Settings. Data here is not shared until you save it."}</p></div>
            <div className="settings-row"><button className="button" onClick={() => setActiveTab("settings")}>Household settings</button>{household && <><button className="button" disabled={familyBusy} onClick={() => { if (window.confirm("Replace unsaved edits with the latest shared household data?")) runFamily(undefined, true); }}>Refresh shared data</button><button className="button primary" disabled={familyBusy} onClick={() => runFamily({ action: "save", revision: sharedRevision, data: { travel: travelItinerary, bills, groceries, schedule, prefs: userPreferences } })}>Save household changes</button></>}</div>
            {familyError && <p className="auth-error" role="alert">{familyError}</p>}
            {familyNotice && <p role="status">{familyNotice}</p>}
          </div>}
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
                  <h2>Your travel plans</h2>
                  <p>
                    {travelItinerary.length === 0 ? "No trips yet — add your first destination below." : `${travelItinerary.length} destinations · ${rm(travelTotal)} of ${rm(userPreferences.travelBudgetLimit)} budget`}
                  </p>
                </div>
                <button className="button primary" onClick={triggerTripWorkflow} disabled={isRunning}>
                  <Sparkles size={16} /> Ask LLAMA for ideas
                </button>
              </div>
              <div className="budget-line">
                <strong>{rm(travelTotal)} <span>of {rm(userPreferences.travelBudgetLimit)} budget</span></strong>
                <span>{overTravelBudget ? "Over budget" : travelItinerary.length === 0 ? "Add trips to track" : "Room to explore"}</span>
              </div>
              <div className={`budget-track ${overTravelBudget ? "over-budget" : ""}`}>
                <span style={{ width: `${Math.min(100, (travelTotal / Math.max(1, userPreferences.travelBudgetLimit)) * 100)}%` }} />
              </div>
              <form className="grocery-form" onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const title = fd.get("title")?.toString().trim();
                const cost = Number(fd.get("cost"));
                const notes = fd.get("notes")?.toString().trim();
                if (!title) return;
                setTravelItinerary(prev => [...prev, { day: `Day ${prev.length + 1}`, title, cost: isFinite(cost) ? cost : 0, status: "Planned", notes: notes || "" }]);
                e.target.reset();
              }}>
                <input name="title" placeholder="Destination / activity (e.g. Langkawi beach day)" required style={{flex:2}} />
                <input name="cost" type="number" placeholder="Cost RM" min="0" step="0.01" style={{flex:1}} />
                <input name="notes" placeholder="Notes (optional)" style={{flex:2}} />
                <button className="button primary"><Plus size={16} /> Add</button>
              </form>
              {travelItinerary.length === 0 ? (
                <div className="panel empty-state"><Plane size={28} /><strong>No travel plans yet</strong><p>Add destinations above or ask LLAMA for suggestions.</p></div>
              ) : (
                <div className="trip-grid">
                  {travelItinerary.map((item, i) => (
                    <article className="panel trip-card" key={item.day + i}>
                      <div className={`trip-illustration trip-day-${i % 3}`}><Plane size={52} strokeWidth={1.2} /><span>0{i + 1}</span></div>
                      <div className="trip-body">
                        <div className="card-meta"><span>{item.day}</span><strong>{rm(item.cost)}</strong></div>
                        <h3>{item.title}</h3>
                        <p>{item.notes || "No notes"}</p>
                        <div style={{display:"flex",gap:8,marginTop:8}}>
                          <span className="trip-status"><CheckCircle2 size={15} />{item.status}</span>
                          <button className="icon-button delete-button" aria-label="Remove" onClick={() => setTravelItinerary(p => p.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "bills" && (
            <section className="view-section">
              <div className="view-banner peach">
                <div>
                  <span className="eyebrow">A CLEARER PICTURE</span>
                  <h2>Your bills & budget</h2>
                  <p>{bills.length === 0 ? "No bills yet — add your first bill below." : `${rm(pendingTotal)} pending · Monthly budget ${rm(userPreferences.monthlyBudgetCap)}`}</p>
                </div>
                <button className="button dark" onClick={triggerBillsWorkflow} disabled={isRunning}><RotateCcw size={16} /> Ask LLAMA to review</button>
              </div>
              <form className="grocery-form" onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const name = fd.get("name")?.toString().trim();
                const amount = Number(fd.get("amount"));
                const dueDate = fd.get("dueDate")?.toString().trim();
                const category = fd.get("category")?.toString().trim() || "General";
                if (!name || !isFinite(amount)) return;
                setBills(prev => [...prev, { id: uid(), name, amount, dueDate: dueDate || "—", status: "PENDING", category, agentNote: "Added by you" }]);
                e.target.reset();
              }}>
                <input name="name" placeholder="Bill name (e.g. Internet, Rent)" required style={{flex:2}} />
                <input name="amount" type="number" placeholder="Amount RM" min="0" step="0.01" required style={{flex:1}} />
                <input name="dueDate" placeholder="Due date (e.g. Nov 15)" style={{flex:1}} />
                <input name="category" placeholder="Category" style={{flex:1}} />
                <button className="button primary"><Plus size={16} /> Add bill</button>
              </form>
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
                          <button className={`bill-status ${bill.status === "PAID" ? "paid" : "pending"}`} onClick={() => toggleBill(bill.id)}>
                            {bill.status === "PAID" && <CheckCircle2 size={13} />}{bill.status.toLowerCase()}
                          </button>
                        </td>
                        <td><button className="icon-button delete-button" onClick={() => setBills(p => p.filter(b => b.id !== bill.id))}><Trash2 size={14} /></button></td>
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
                  <span className="eyebrow">YOUR DAILY RHYTHM</span>
                  <h2>Your routine</h2>
                  <p>{schedule.length === 0 ? "No routine yet — add your first time block below." : `${userPreferences.homeLocation} · Sleep target: ${userPreferences.targetSleepDuration}`}</p>
                </div>
                <Clock size={48} strokeWidth={1.3} />
              </div>
              <form className="grocery-form" onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const time = fd.get("time")?.toString().trim();
                const task = fd.get("task")?.toString().trim();
                const category = fd.get("category")?.toString().trim() || "General";
                if (!time || !task) return;
                setSchedule(prev => [...prev, { time, task, category, focus: "" }]);
                e.target.reset();
              }}>
                <input name="time" placeholder="Time (e.g. 08:00 - 09:00)" required style={{flex:1}} />
                <input name="task" placeholder="Activity (e.g. Morning workout)" required style={{flex:2}} />
                <input name="category" placeholder="Category (Work/Family/Wellness)" style={{flex:1}} />
                <button className="button primary"><Plus size={16} /> Add block</button>
              </form>
              {schedule.length === 0 ? (
                <div className="panel empty-state"><Clock size={28} /><strong>No routine yet</strong><p>Add time blocks above to build your day.</p></div>
              ) : (
                <div className="schedule-list">
                  {schedule.map((block, i) => (
                    <article className="panel schedule-item" key={block.time + i}>
                      <span className="schedule-number">{String(i + 1).padStart(2, "0")}</span>
                      <time>{block.time}</time>
                      <div><h3>{block.task}</h3><p>{block.focus || block.category}</p></div>
                      <span className={`category-tag ${block.category === "Work" ? "lavender" : block.category === "Family" ? "peach" : "lime"}`}>{block.category}</span>
                      <button className="icon-button delete-button" onClick={() => setSchedule(p => p.filter((_, idx) => idx !== i))}><Trash2 size={16} /></button>
                    </article>
                  ))}
                </div>
              )}
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
                <div className="prefs-grid" style={{display:"grid",gap:12,marginBottom:16}}>
                  <label>Family size <input type="number" min="1" value={userPreferences.familySize} onChange={e => setUserPreferences(p => ({...p, familySize: Number(e.target.value) || 1}))} /></label>
                  <label>Home location <input value={userPreferences.homeLocation} onChange={e => setUserPreferences(p => ({...p, homeLocation: e.target.value}))} placeholder="Kuala Lumpur" /></label>
                  <label>Dietary <input value={userPreferences.dietary} onChange={e => setUserPreferences(p => ({...p, dietary: e.target.value}))} placeholder="Halal / Low-Sugar" /></label>
                  <label>Sleep target <input value={userPreferences.targetSleepDuration} onChange={e => setUserPreferences(p => ({...p, targetSleepDuration: e.target.value}))} placeholder="8 Hours" /></label>
                  <label>Monthly budget (RM) <input type="number" min="0" value={userPreferences.monthlyBudgetCap} onChange={e => setUserPreferences(p => ({...p, monthlyBudgetCap: Number(e.target.value) || 0}))} /></label>
                  <label>Travel budget (RM) <input type="number" min="0" value={userPreferences.travelBudgetLimit} onChange={e => setUserPreferences(p => ({...p, travelBudgetLimit: Number(e.target.value) || 0}))} /></label>
                </div>
                <div className="panel" style={{marginBottom:16}}>
                  <h3>Household members</h3>
                  <p>{householdMembers.length ? householdMembers.map(m => m.name).join(", ") : "No shared household connected."}</p>
                  <button className="button ghost" onClick={() => setActiveTab("settings")}>Manage members in Settings</button>
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
members: ${householdMembers.map(m => `${m.name}`).join(", ") || "none yet"}

// A LITTLE LESS FRICTION
1. Align trips with school calendars & budgets.
2. Check pantry memory before buying more.
3. Make room for ${userPreferences.targetSleepDuration} of sleep.
4. Keep everyday life working together.`}</pre>
              </div>
            </section>
          )}
          </>}
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
