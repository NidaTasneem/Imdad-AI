# Imdad AI Project Requirements

## Objective

Build a smart AI-powered help desk system where users receive instant troubleshooting support, tickets are created when human help is needed, support engineers manage the resolution workflow, and admins monitor the complete support process.

## Roles

### User

- Create an account
- Log in and maintain a session
- Describe a technical issue
- Receive Knowledge Base suggestions
- Receive AI troubleshooting suggestions when no Knowledge Base solution matches
- Mark issue as resolved
- Create a support ticket when unresolved
- View only own tickets
- View only own chat history
- Track ticket status and resolution updates

### Support Engineer

- Log in to the system
- Access a protected engineer dashboard
- View assigned and available tickets
- Search and filter tickets
- View ticket details, issue description, AI suggestion, and AI recommendation context
- Assign tickets and update assigned engineer
- Add engineer remarks and resolution notes
- Update ticket status
- Resolve or close tickets
- View ticket and resolution history

### Admin

- Log in to the system
- Access a protected admin dashboard
- View all users and support engineers
- View all tickets
- View ticket statistics and analytics
- Monitor status, priority, category, and support engineer performance
- View system activity and chat history
- Add, update, and delete Knowledge Base entries

## Functional Modules

### Module 1: Authentication

- User signup
- User login
- Role-based login
- Password protection
- Session management
- Logout
- Role-based redirection after login

### Module 2: AI Help

- Issue input
- Knowledge Base keyword search
- AI fallback through Ollama Llama 3.2
- Troubleshooting response
- Resolved or unresolved user decision
- Chat history save
- Automatic ticket creation when unresolved

### Module 3: Knowledge Base

- Common IT issue storage
- Issue name, category, keywords, solution, created date, updated date
- Search by issue, keyword, and solution text
- User-facing Knowledge Base list
- Admin Knowledge Base management

### Module 4: Ticket Management

- Automatic ticket ID generation
- User details saved with ticket
- Issue title and description
- AI suggestion
- Priority
- Assigned team
- Assigned support engineer
- Status
- Resolution notes
- Created and updated timestamps

### Module 5: Priority and Team Assignment

- Keyword-based priority detection
- Keyword-based support team assignment
- Priority levels: Low, Medium, High, Critical
- Teams: Network, IT Support, Hardware, Access Management, Software Support, General Support

### Module 6: Engineer Dashboard

- KPI cards
- Ticket statistics
- Recent ticket activity
- Priority overview
- Category overview
- Open ticket management

### Module 7: Resolution Workflow

- Engineer remarks
- Resolution notes
- Status updates
- Engineer assignment
- Close and resolve actions
- Resolution history

### Module 8: Reports and Analytics

- Ticket analytics dashboard
- Category-wise analysis
- Priority-wise analysis
- Resolution trends
- Engineer performance metrics

## Database Requirements

The project uses Supabase PostgreSQL with these tables:

- `users`
- `tickets`
- `knowledge_base`
- `chat_history`
- `ticket_resolution_history`

## UI Requirements

- Premium SaaS-style layout
- Clean navbar with role-based links
- Separate focused pages instead of one-page content dump
- Responsive cards, forms, tables, and dashboards
- Consistent Imdad AI theme
- 3D UI assets used across important pages
- Clear typography, spacing, padding, and visual hierarchy

## Current Completion Status

The prototype includes all core user, engineer, admin, AI Help, ticket management, Knowledge Base, analytics, and Supabase database modules required for mentor demonstration.
