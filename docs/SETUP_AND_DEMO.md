# Imdad AI Setup and Demo Guide

## 1. Prerequisites

- Node.js installed
- npm installed
- Supabase project created
- Ollama installed for local AI suggestions

## 2. Configure Supabase

1. Open the Supabase SQL Editor.
2. Run `supabase/fix_schema_and_reset_demo.sql`.
3. Confirm these tables exist:
   - `users`
   - `tickets`
   - `knowledge_base`
   - `chat_history`
   - `ticket_resolution_history`

## 3. Configure Environment

Create `.env` in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Use `.env.example` as the template.

## 4. Install Dependencies

```bash
npm install
```

## 5. Run Frontend

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## 6. Run AI Backend

In another terminal:

```bash
npm run server
```

The AI API runs at:

```text
http://127.0.0.1:5050
```

## 7. Run Ollama

```bash
ollama pull llama3.2
ollama serve
```

## 8. Demo Flow

### User Flow

1. Log in as a user.
2. Open AI Help.
3. Type an issue.
4. Get Knowledge Base or AI suggestion.
5. Mark resolved or proceed with human support.
6. Create or view the generated ticket.
7. Check My Tickets and Chat History.

### Engineer Flow

1. Log in as Support Engineer.
2. Open the dashboard.
3. Review KPI cards and ticket list.
4. Open a ticket.
5. Assign engineer, add remarks, update status, and add resolution notes.
6. Resolve or close the ticket.

### Admin Flow

1. Log in as Admin.
2. Review analytics dashboard.
3. Open Users, Tickets, and Knowledge Base pages.
4. Add, edit, or delete Knowledge Base entries.
5. Monitor ticket status, priority, category, and engineer performance.

## 9. Build Verification

```bash
npm run build
```

A successful build confirms that the React and TypeScript project compiles correctly.
