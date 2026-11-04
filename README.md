# LLAMA

<p align="center">
  <img src="public/llama-logo.png" alt="LLAMA mascot: a blue llama with orange ears and a lightning-bolt medallion" width="220" height="220" />
</p>

# 🤖 LLAMA Everyday — Free for Everyone

> Your household's everyday superpower. Plan trips, track bills, shop smarter, and find your rhythm — all in one colorful dashboard.

**Free tier powered by LLAMA AI. No credit card required. Just connect your household.**

## 🚀 Live Demo & Resources
- **Web App**: [https://llama-everyday.vercel.app/](https://llama-everyday.vercel.app/)
- **Demo Video**: [Watch on YouTube](https://youtu.be/RMFK-iADpJE?si=aAjyI44PpvYHot2-)
- **GitHub Repository**: [https://github.com/deducationsol-lab/LLAMA](https://github.com/deducationsol-lab/LLAMA)

---

## ✨ What's New: Free for Everyone

LLAMA is now **free for everyone** — no demo codes, no paywalls:

- **🆓 Free AI**: Powered by LLAMA AI (free tier) — 10 requests/minute, no API key needed from users
- **👨‍👩‍👧‍👦 Household Connect**: Create or join a household to save and share with family
- **🔐 Simple Auth**: Sign up with email or continue as guest to try instantly
- **💾 Persistent Storage**: Household data saved to Supabase (when connected)
- **🎨 Same Beautiful UI**: All your favorite features, now accessible to all

---

## 🎯 Track: Build for Your World
Everyday life admin—flight bookings, bill recurrence, dietary meal planning, and schedule reconciliation—forces users to context-switch across 10+ disconnected apps. We built an integrated household dashboard that orchestrates daily execution loops end-to-end.

---

## 🛠️ Architecture & Tech Stack
- **AI Brain**: LLAMA AI 3 Flash (free tier) — orchestrated for household planning
- **Multi-Agent Domains**: 
  - *Logistics & Travel*: Automated family trip planning & itinerary syncs
  - *Life Admin & Bills*: Bill recurrence, budget tracking, and cashflow alerts
  - *Home & Groceries*: Pantry memory, smart weekly meal suggestions, and categorized shopping lists
  - *Routine & Wellness*: Schedule reconciliation, school holiday coordination, and bedtime/work block alignment
- **Frontend**: React 18, Tailwind CSS, Lucide Icons
- **Backend**: Vercel Serverless Functions + Supabase (auth, households, persistence)
- **Memory**: Supabase for household preferences, bills, groceries, and activity

---

## ⚙️ Local Setup & Development

```bash
# Clone the repository
git clone https://github.com/deducationsol-lab/LLAMA.git
cd LLAMA

# Install dependencies
npm install

# Set up environment (get free LLAMA AI key at https://aistudio.google.com)
cp .env.example .env.local
# Add: AI_API_KEY=your_key (managed)
# Add: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (optional, for household features)

# Run the development server
npm run dev
# Open http://localhost:3000
```

**Environment Variables:**

| Variable | Purpose | Required |
|----------|---------|----------|
| `AI_API_KEY` | LLAMA AI key (managed) | Yes |
| `AI_MODEL_ID` | AI model (managed) | No |
| `VITE_SUPABASE_URL` | Supabase project URL | For household features |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | For household features |

**Free LLAMA AI Setup:**
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create a free API key (no credit card, generous free tier)
3. Add to your environment as `AI_API_KEY` (managed)
4. That's it — LLAMA will use LLAMA AI for all AI suggestions

---

## 🏠 Household Features

**For Guests (no account):**
- Try all features instantly
- Sample data, session-only
- Full AI access via LLAMA AI free tier

**For Members (with account):**
- Create or join a household
- Save bills, groceries, preferences
- Share with family members
- Invite via code
- Persistent across devices

---

## 🎨 Features

- **Overview Dashboard**: Bills, routine, groceries, and pantry at a glance
- **Travel Plans**: 3-day Penang itineraries with budget tracking
- **Bills & Budget**: Recurring bills, due dates, and cashflow insights
- **Smart Pantry**: Pantry-aware grocery lists and meal suggestions
- **Daily Routine**: Balanced time blocks for work, family, and wellness
- **Memory Lab**: Household preferences that personalize AI suggestions
- **AI Assistant**: Ask anything — powered by LLAMA AI, free for all

---

## 🔒 Security & Privacy

- **Free Tier**: No API keys exposed to client, all AI calls server-side
- **Rate Limiting**: 10 req/min, 100 req/hour per IP (prevents abuse)
- **Household Data**: Only sent to LLAMA AI when you ask for suggestions
- **No Sensitive Data**: Don't enter real bank credentials or sensitive info
- **Supabase RLS**: Row-level security ensures households only see their data

---

## 💡 Suggestions for Next Steps

**High Impact, Low Effort:**
1. **Bill Reminders**: Push notifications for due dates (via Supabase + Vercel Cron)
2. **Grocery Price History**: Track price changes over time, suggest best time to buy
3. **Travel Wishlist**: Save multiple itineraries, compare budgets
4. **Family Calendar**: Shared calendar with school holidays and events
5. **Recipe Collection**: Save AI-suggested meals, rate and share

**Medium Effort, High Value:**
6. **Expense Analytics**: Monthly spending charts, category breakdowns
7. **Pantry Barcode Scanner**: Scan items to auto-add to pantry
8. **Bill Photo Upload**: OCR to auto-extract bill details
9. **Household Chat**: Family members can discuss plans in-app
10. **Offline Mode**: PWA with offline access to household data

**Advanced Features:**
11. **Smart Notifications**: AI-powered insights ("You're spending 20% more on groceries")
12. **Integration Hub**: Connect to Google Calendar, bank feeds (with consent)
13. **Voice Assistant**: "Hey LLAMA, what's for dinner?"
14. **Multi-language**: Support for Bahasa Malaysia, Mandarin, Tamil
15. **Kids Mode**: Simplified UI for children to contribute to household tasks

---

## 🧪 Checks

```bash
npm run check:agent  # Test AI handler
npm run build        # Production build
```

---

## 📱 Project Branding

The app and README use the supplied mascot in `public/llama-logo.png`. Browser and Apple touch icons are alongside it.

---

**A little help. A lot more life.** — LLAMA is free for everyone. Connect your household and get started.
