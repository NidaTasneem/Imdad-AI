# Imdad AI

Imdad AI is a role-based AI ticket management system for technical support. Users can get Knowledge Base and AI troubleshooting help before raising a ticket, support engineers can manage and resolve tickets, and admins can monitor users, engineers, tickets, Knowledge Base entries, and analytics.

## Core Features

- Role-based authentication for User, Support Engineer, and Admin
- AI Help flow with Knowledge Base search first and Ollama Llama 3.2 fallback
- Automatic ticket creation when an issue is not resolved
- Auto-generated ticket IDs such as `TKT-0001`
- Automatic priority detection and team assignment
- User-only ticket and chat history access
- Support engineer ticket workflow with assignment, remarks, resolution notes, status updates, and resolution history
- Admin dashboard with analytics, reports, users, engineers, tickets, and Knowledge Base management
- Supabase-backed database persistence with live data updates and refresh fallback
- Premium SaaS-style UI with role-based navigation and responsive pages

## Tech Stack

- Frontend: React 19, TypeScript, Vite
- Styling: CSS with a custom premium Imdad AI theme
- Backend: Node.js, Express
- Database: Supabase PostgreSQL
- AI: Ollama with Llama 3.2
- Icons: Lucide React

## Project Structure

```text
AI_TICKET_PROTOTYPE/
├── public/
│   ├── brand/                 # Imdad AI logo and brand assets
│   └── visuals/               # 3D UI visual assets
├── src/
│   ├── App.tsx                # Main app routes, pages, and UI logic
│   ├── main.tsx               # React entry point
│   ├── styles.css             # App theme and responsive styling
│   ├── supabaseClient.ts      # Supabase client configuration
│   └── supabaseStore.ts       # Database read/write helpers
├── server/
│   └── index.js               # Express API for AI troubleshooting
├── supabase/
│   ├── schema.sql             # Base database schema
│   └── fix_schema_and_reset_demo.sql
├── scripts/                   # Report, screenshot, and diagram generators
├── docs/                      # Project report, presentation, and diagrams
├── .env.example               # Environment variable template
├── .gitignore
├── package.json
└── vite.config.mjs
```

## Database Tables

The Supabase database uses these tables:

- `users`
- `tickets`
- `knowledge_base`
- `chat_history`
- `ticket_resolution_history`

Run `supabase/fix_schema_and_reset_demo.sql` in the Supabase SQL Editor to repair the schema and reset demo data.

## Environment Setup

Create a local `.env` file from `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Do not commit `.env`. It is intentionally ignored by git.

## Install and Run

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Run the backend AI API in a second terminal:

```bash
npm run server
```

Build the project:

```bash
npm run build
```

## Ollama AI Setup

Install Ollama and pull Llama 3.2:

```bash
ollama pull llama3.2
```

Make sure Ollama is running locally at:

```text
http://127.0.0.1:11434
```

The Express server sends unresolved Knowledge Base issues to Ollama through `/api/troubleshoot`.

## Role Flow

User:

- Sign up or log in
- Describe an issue in AI Help
- Receive a Knowledge Base answer or AI suggestion
- Mark the issue resolved or proceed with human support
- View own tickets, ticket details, and chat history

Support Engineer:

- Log in to protected dashboard
- View assigned and available tickets
- Review issue details and AI recommendations
- Assign tickets, update status, add remarks and resolution notes
- Resolve or close tickets and maintain resolution history

Admin:

- Log in to admin dashboard
- View users, engineers, tickets, analytics, and system activity
- Manage Knowledge Base entries
- Monitor ticket status, priority, category trends, and engineer performance

## Security Note

This is an academic prototype. It uses a Supabase-backed custom users table and role-based UI/session handling. For production, enable strict Supabase Auth, Row Level Security policies, audit logging, deployment secrets, and server-side authorization checks.

## Documentation

The `docs/` folder includes the editable project report, PDF report, presentation, flowchart document, screenshots, and architecture diagrams prepared for mentor presentation.
