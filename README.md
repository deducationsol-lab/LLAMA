# LLAMA

A lightweight React + Vite dashboard for the Meta Hackathon project, built around a multi-agent household orchestration concept: travel planning, bill tracking, pantry RAG, and daily scheduling.

## Features

- Live swarm-style log stream
- Agent cards with status, load, and activity
- Penang trip budgeting and itinerary planner
- Monthly bill tracking and reconciliation workflow
- Pantry vector/RAG grocery planner
- Routine scheduler and memory lab

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Lucide React icons

## Getting Started

```bash
npm install
npm run dev
```

Then open the Vite app in your browser.

## Production Build

```bash
npm run build
```

## Environment Variables

Create a `.env` file in the project root:

```bash
VITE_API_URL=http://localhost:8080
```

The backend server should also have its own `.env` file in `server/.env` with:

```bash
PORT=8080
CORS_ORIGIN=http://localhost:5173
LLAMA_STACK_URL=
LLAMA_MODEL=meta-llama/Llama-3.3-70B-Instruct
LLAMA_API_KEY=
```

Keep Llama credentials server-side only. The browser should only ever know the API URL.
