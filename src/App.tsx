import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Edit3,
  Eye,
  Gauge,
  History,
  LogIn,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import {
  deleteStoredKnowledgeEntry,
  loadInitialData,
  persistChatRecord,
  persistKnowledgeEntry,
  persistResolutionHistory,
  persistTicket,
  persistUserAccount,
  updateStoredKnowledgeEntry,
  updateStoredTicket,
  type ResolutionHistoryRecord,
  type UserAccountRecord,
} from "./supabaseStore";

type Role = "User" | "Support Engineer" | "Admin";
type Priority = "Low" | "Medium" | "High" | "Critical";
type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

type TicketRecord = {
  id: string;
  userId: string;
  user: string;
  email: string;
  issueTitle: string;
  issue: string;
  aiSuggestion: string;
  priority: Priority;
  team: string;
  status: TicketStatus;
  assignedTo: string;
  resolution: string;
  createdAt: string;
  updatedAt: string;
};

type KnowledgeEntry = {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  solution: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
};

type ChatRecord = {
  id: string;
  userId: string;
  user: string;
  email: string;
  issue: string;
  source: "Knowledge Base" | "AI Assistant";
  suggestion: string;
  outcome: string;
  ticketId: string | null;
  createdAt: string;
};

type TicketResolutionHistory = ResolutionHistoryRecord;
type UserAccount = UserAccountRecord;

type AuthSession = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  startedAt: string;
};

type DraftTicket = {
  issueTitle: string;
  issue: string;
  aiSuggestion: string;
  priority: Priority;
  team: string;
};

const sessionKey = "ai-ticket-desk-session";

const roleDefaults: Record<Role, { id: string; name: string; email: string; password: string; department: string }> = {
  User: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Aarav Mehta",
    email: "aarav.mehta@acme.local",
    password: "password123",
    department: "Employee Portal",
  },
  "Support Engineer": {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Priya Nair",
    email: "priya.nair@support.local",
    password: "support123",
    department: "Support",
  },
  Admin: {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Maya Rao",
    email: "maya.rao@admin.local",
    password: "admin123",
    department: "IT Operations",
  },
};

const signupDepartments: Record<"User" | "Support Engineer", string[]> = {
  User: ["Finance", "Human Resources", "Operations", "Sales", "Information Technology"],
  "Support Engineer": [
    "Network Team",
    "IT Support Team",
    "Hardware Team",
    "Access Management Team",
    "Software Support Team",
    "General Support Team",
  ],
};

const knowledgeCategories = ["General", "Network", "Email", "Identity", "Hardware", "Software", "System", "Collaboration", "Access"];

const initialKb: KnowledgeEntry[] = [
  {
    id: "KB-101",
    title: "VPN connection issue",
    category: "Network",
    keywords: ["vpn", "network", "remote", "connection", "tunnel", "timeout", "mfa"],
    solution:
      "Confirm internet access, restart the VPN client, clear saved credentials, and reconnect using MFA. If the gateway still times out, attach the error code to a network ticket.",
    owner: "Network Team",
    createdAt: "2026-07-10 09:00",
    updatedAt: "2026-07-18 09:30",
  },
  {
    id: "KB-102",
    title: "Wi-Fi not working",
    category: "Network",
    keywords: ["wifi", "wi-fi", "wireless", "network", "internet", "ssid", "router"],
    solution:
      "Forget and reconnect to the corporate Wi-Fi, confirm the correct SSID, restart the wireless adapter, and test another network. Escalate with device name and location if DHCP or signal fails.",
    owner: "Network Team",
    createdAt: "2026-07-10 09:20",
    updatedAt: "2026-07-18 10:10",
  },
  {
    id: "KB-103",
    title: "Email not receiving",
    category: "Email",
    keywords: ["email", "outlook", "mail", "receive", "receiving", "inbox", "sync"],
    solution:
      "Check mailbox quota, junk rules, focused inbox, and service health. Restart Outlook or webmail, then remove and re-add the profile if incoming mail remains delayed.",
    owner: "IT Support Team",
    createdAt: "2026-07-10 09:40",
    updatedAt: "2026-07-17 14:05",
  },
  {
    id: "KB-104",
    title: "Email blocked",
    category: "Email",
    keywords: ["email", "blocked", "quarantine", "spam", "delivery", "bounce", "sender"],
    solution:
      "Check quarantine, blocked sender rules, and mail flow notices. Ask the sender for the bounce message and release the email only after verifying it is safe.",
    owner: "IT Support Team",
    createdAt: "2026-07-10 10:00",
    updatedAt: "2026-07-17 15:15",
  },
  {
    id: "KB-105",
    title: "Password reset",
    category: "Identity",
    keywords: ["password", "reset", "forgot", "locked", "mfa", "credential"],
    solution:
      "Use the self-service password portal, verify MFA, then wait two minutes before signing in again. Escalate if the account is locked after three attempts.",
    owner: "Access Management Team",
    createdAt: "2026-07-10 10:20",
    updatedAt: "2026-07-15 11:20",
  },
  {
    id: "KB-106",
    title: "Login issue",
    category: "Identity",
    keywords: ["login", "signin", "sign in", "authentication", "mfa", "account", "locked"],
    solution:
      "Confirm the username, password, MFA approval, and account status. Try a private browser window and capture the exact login error if access still fails.",
    owner: "Access Management Team",
    createdAt: "2026-07-10 10:40",
    updatedAt: "2026-07-16 09:35",
  },
  {
    id: "KB-107",
    title: "Access denied",
    category: "Access",
    keywords: ["access", "denied", "permission", "unauthorized", "role"],
    solution:
      "Capture the application name and request the correct access group. Ask the user's manager to approve the entitlement before assignment.",
    owner: "Access Management Team",
    createdAt: "2026-07-10 11:00",
    updatedAt: "2026-07-14 16:50",
  },
  {
    id: "KB-108",
    title: "Slow system",
    category: "Device",
    keywords: ["slow", "performance", "laptop", "system", "hang"],
    solution:
      "Restart the device, close high-memory apps, check disk space, install pending updates, and run the endpoint health scan from Company Portal.",
    owner: "Hardware Team",
    createdAt: "2026-07-10 11:20",
    updatedAt: "2026-07-13 10:10",
  },
  {
    id: "KB-109",
    title: "Printer issue",
    category: "Hardware",
    keywords: ["printer", "print", "paper", "queue", "spooler"],
    solution:
      "Confirm the printer is online, clear the local print queue, restart the print spooler, and reinstall the printer from the managed printer catalog.",
    owner: "Hardware Team",
    createdAt: "2026-07-10 11:40",
    updatedAt: "2026-07-12 12:40",
  },
  {
    id: "KB-110",
    title: "Software installation issue",
    category: "Software",
    keywords: ["software", "install", "installation", "application", "license", "setup"],
    solution:
      "Check whether the app is approved in the software catalog. If approved, install through Company Portal; otherwise submit a license and security review request.",
    owner: "Software Support Team",
    createdAt: "2026-07-10 12:00",
    updatedAt: "2026-07-11 09:15",
  },
  {
    id: "KB-111",
    title: "Laptop screen flickering",
    category: "Device",
    keywords: ["laptop", "screen", "flickering", "display", "monitor", "graphics"],
    solution:
      "Restart the laptop, update display drivers, test with an external monitor, and capture whether flicker appears before login.",
    owner: "Hardware Team",
    createdAt: "2026-07-10 12:20",
    updatedAt: "2026-07-12 13:05",
  },
  {
    id: "KB-112",
    title: "Teams meeting issue",
    category: "Collaboration",
    keywords: ["teams", "meeting", "audio", "camera", "microphone", "call", "conference"],
    solution:
      "Restart Teams, check microphone and camera permissions, switch audio devices, clear Teams cache, and join from the browser if the desktop client fails.",
    owner: "IT Support Team",
    createdAt: "2026-07-10 12:40",
    updatedAt: "2026-07-12 14:25",
  },
  {
    id: "KB-113",
    title: "Portal down",
    category: "Application",
    keywords: ["portal", "down", "unavailable", "website", "page", "error", "service"],
    solution:
      "Check the service status page, try a different browser, clear cache, and confirm whether multiple users are affected. Escalate as an incident if unavailable.",
    owner: "General Support Team",
    createdAt: "2026-07-10 13:00",
    updatedAt: "2026-07-12 15:10",
  },
  {
    id: "KB-114",
    title: "Server down",
    category: "Infrastructure",
    keywords: ["server", "down", "outage", "service", "unavailable", "production"],
    solution:
      "Validate monitoring alerts, check incident channels, confirm service health, and page the infrastructure on-call team with affected service, region, and start time.",
    owner: "General Support Team",
    createdAt: "2026-07-10 13:20",
    updatedAt: "2026-07-10 18:35",
  },
  {
    id: "KB-115",
    title: "Application not opening",
    category: "Application",
    keywords: ["application", "app", "not opening", "crash", "launch", "startup", "blank"],
    solution:
      "Restart the application, check for updates, clear local cache, and try launching as a different profile. Escalate with app version, screenshot, and event log details.",
    owner: "Software Support Team",
    createdAt: "2026-07-10 13:40",
    updatedAt: "2026-07-13 09:45",
  },
  {
    id: "KB-116",
    title: "File or folder missing",
    category: "Storage",
    keywords: ["file", "folder", "missing", "deleted", "onedrive", "sharepoint", "restore"],
    solution:
      "Check recycle bin, OneDrive or SharePoint version history, sync status, and recent moves. Escalate with file path, owner, and last known access time.",
    owner: "General Support Team",
    createdAt: "2026-07-10 14:00",
    updatedAt: "2026-07-14 10:30",
  },
];

const initialTickets: TicketRecord[] = [
  {
    id: "TKT-0001",
    userId: "22222222-2222-4222-8222-222222222222",
    user: "Neha Kapoor",
    email: "neha.kapoor@acme.local",
    issueTitle: "Access denied to finance dashboard",
    issue: "Access denied when opening the finance reporting dashboard.",
    aiSuggestion: "Likely missing finance-reporting entitlement. Verify group membership and manager approval.",
    priority: "High",
    team: "Access Management Team",
    status: "In Progress",
    assignedTo: "Priya Nair",
    resolution: "Approval received. Waiting for group sync.",
    createdAt: "2026-07-21 08:45",
    updatedAt: "2026-07-21 10:30",
  },
  {
    id: "TKT-0002",
    userId: "33333333-3333-4333-8333-333333333333",
    user: "Ravi Menon",
    email: "ravi.menon@acme.local",
    issueTitle: "Laptop slow after update",
    issue: "Laptop is slow after today's update and Teams calls freeze.",
    aiSuggestion: "Restart, check CPU and memory pressure, validate disk space, and run endpoint health scan.",
    priority: "Low",
    team: "Hardware Team",
    status: "Open",
    assignedTo: "Unassigned",
    resolution: "",
    createdAt: "2026-07-21 09:25",
    updatedAt: "2026-07-21 09:25",
  },
];

const initialChatHistory: ChatRecord[] = [
  {
    id: "CHAT-301",
    userId: roleDefaults.User.id,
    user: "Aarav Mehta",
    email: "aarav.mehta@acme.local",
    issue: "How do I reset my password?",
    source: "Knowledge Base",
    suggestion: initialKb[4].solution,
    outcome: "Resolved without ticket",
    ticketId: null,
    createdAt: "2026-07-20 17:05",
  },
  {
    id: "CHAT-302",
    userId: "22222222-2222-4222-8222-222222222222",
    user: "Neha Kapoor",
    email: "neha.kapoor@acme.local",
    issue: "Access denied when opening the finance reporting dashboard.",
    source: "Knowledge Base",
    suggestion: initialKb[6].solution,
    outcome: "Ticket created",
    ticketId: "TKT-0001",
    createdAt: "2026-07-21 07:55",
  },
];

const priorityTone: Record<Priority, string> = {
  Low: "tone-slate",
  Medium: "tone-blue",
  High: "tone-amber",
  Critical: "tone-red",
};

const statusTone: Record<TicketStatus, string> = {
  Open: "tone-blue",
  "In Progress": "tone-amber",
  Resolved: "tone-green",
  Closed: "tone-slate",
};

const publicRoutes = ["/", "/login", "/signup"];
const userRoutes = ["/ai-help", "/raise-ticket", "/my-tickets", "/chat-history", "/knowledge-base"];
const engineerRoutes = ["/engineer", "/engineer/tickets", "/chat-history", "/knowledge-base"];
const adminRoutes = ["/admin", "/admin/kb", "/admin/users", "/admin/tickets", "/chat-history"];

const nowStamp = () => new Date().toISOString();
const createStableUserId = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === roleDefaults.User.email) return roleDefaults.User.id;
  let hash = 0x811c9dc5;
  for (const char of normalizedEmail) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  const seed = `${normalizedEmail}:${Math.abs(hash)}`;
  let hex = "";
  for (let index = 0; hex.length < 32; index += 1) {
    const code = seed.charCodeAt(index % seed.length) + index * 17 + hash;
    hex += Math.abs(Math.imul(code, 2654435761)).toString(16).padStart(8, "0");
  }
  const chars = hex.slice(0, 32).split("");
  chars[12] = "4";
  chars[16] = "8";
  return `${chars.slice(0, 8).join("")}-${chars.slice(8, 12).join("")}-${chars.slice(12, 16).join("")}-${chars.slice(16, 20).join("")}-${chars.slice(20, 32).join("")}`;
};

const initialAccounts: UserAccount[] = (Object.keys(roleDefaults) as Role[]).map((role) => ({
  id: roleDefaults[role].id,
  name: roleDefaults[role].name,
  email: roleDefaults[role].email,
  role,
  employeeId: role === "Support Engineer" ? "ENG-2001" : role === "Admin" ? "ADM-3001" : "EMP-1001",
  department: roleDefaults[role].department,
  passwordHash: "",
  createdAt: "2026-07-21 00:00",
}));

const hashPassword = async (email: string, password: string) => {
  const payload = `${email.trim().toLowerCase()}:${password}`;
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatShortUserId = (value: string) => {
  if (!value || value === "Not linked") return "Not linked";
  const clean = value.replace(/-/g, "");
  return clean.length > 8 ? `USR-${clean.slice(0, 6).toUpperCase()}` : value;
};

const navigateTo = (path: string) => {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const createTicketId = (tickets: TicketRecord[]) => {
  const lastNumber = tickets.reduce((max, ticket) => {
    const match = ticket.id.match(/^(?:TKT-|TCK-\d{4}-)(\d{4})$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `TKT-${String(lastNumber + 1).padStart(4, "0")}`;
};

const createChatId = (records: ChatRecord[]) => {
  const lastNumber = records.reduce((max, record) => {
    const match = record.id.match(/^CHAT-(\d{3,})$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 300);
  return `CHAT-${String(lastNumber + 1).padStart(3, "0")}`;
};

const createIssueTitle = (issue: string, match?: KnowledgeEntry) => {
  if (match) return match.title;
  const firstSentence = issue.split(/[.!?]/)[0]?.trim() || issue.trim();
  return firstSentence.length > 80 ? `${firstSentence.slice(0, 77)}...` : firstSentence;
};

const buildIssueSignal = (issue: string, match?: KnowledgeEntry) =>
  [issue, match?.title, match?.category, match?.keywords.join(" ")].filter(Boolean).join(" ").toLowerCase();

const hasAny = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const scoreEntry = (entry: KnowledgeEntry, text: string) =>
  entry.keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0) +
  (text.includes(entry.category.toLowerCase()) ? 1 : 0) +
  (text.includes(entry.title.toLowerCase()) ? 2 : 0);

const findKnowledgeBaseMatch = (entries: KnowledgeEntry[], issue: string) => {
  const normalized = issue.toLowerCase();
  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, normalized) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.entry;
};

const inferPriority = (issue: string, match?: KnowledgeEntry): Priority => {
  const text = buildIssueSignal(issue, match);
  if (hasAny(text, ["critical", "security breach", "data loss", "ransomware"])) return "Critical";
  if (hasAny(text, ["email blocked", "mail blocked", "blocked email", "server down", "system down", "access denied", "denied"])) {
    return "High";
  }
  if (hasAny(text, ["vpn", "network", "wi-fi", "wifi", "wireless", "email", "outlook", "mail", "printer", "software"])) {
    return "Medium";
  }
  return "Low";
};

const inferTeam = (issue: string, match?: KnowledgeEntry) => {
  const text = buildIssueSignal(issue, match);
  if (hasAny(text, ["vpn", "network", "wi-fi", "wifi", "wireless"])) return "Network Team";
  if (hasAny(text, ["email", "outlook", "mail"])) return "IT Support Team";
  if (hasAny(text, ["printer", "laptop", "hardware", "screen", "display", "monitor"])) return "Hardware Team";
  if (hasAny(text, ["password", "login", "access", "denied", "credential", "mfa"])) return "Access Management Team";
  if (hasAny(text, ["software", "application", "installation", "install", "app"])) return "Software Support Team";
  return "General Support Team";
};

const generateAiSuggestion = (issue: string) => {
  const text = issue.toLowerCase();
  const priority = inferPriority(issue);
  const team = inferTeam(issue);

  if (hasAny(text, ["lag", "lags", "slow", "freeze", "freezing", "hang", "hanging", "performance"])) {
    return [
      "Try these steps for a slow or lagging computer:",
      "1. Restart the computer and close unused browser tabs or heavy apps.",
      "2. Open Task Manager and check CPU, memory, disk, and startup apps for anything using high resources.",
      "3. Confirm at least 15% free disk space, then clear temporary files and downloads if storage is low.",
      "4. Install pending OS, driver, and security updates, then restart again.",
      "5. Run a malware or endpoint security scan and check whether the issue started after a recent update or new software.",
      `If the lag continues, create a ${priority.toLowerCase()} priority ticket for ${team} with screenshots, device name, recent changes, and Task Manager usage details.`,
    ].join("\n");
  }

  if (hasAny(text, ["internet", "network", "wi-fi", "wifi", "vpn", "connection", "disconnect"])) {
    return [
      "Try these network troubleshooting steps:",
      "1. Confirm other websites or apps are affected, then restart Wi-Fi or reconnect the VPN.",
      "2. Turn airplane mode off, forget and reconnect to the network, or try a different network if available.",
      "3. Restart the router or VPN client and check whether MFA or saved credentials are blocking access.",
      "4. Run a speed test and capture any timeout, DNS, or authentication error message.",
      `If it still fails, create a ${priority.toLowerCase()} priority ticket for ${team} with network name, location, error code, and affected apps.`,
    ].join("\n");
  }

  if (hasAny(text, ["email", "outlook", "mail", "inbox", "send", "receive", "blocked"])) {
    return [
      "Try these email troubleshooting steps:",
      "1. Check webmail to confirm whether the issue is Outlook-only or account-wide.",
      "2. Review junk, quarantine, mailbox storage, and any rules that may move or block messages.",
      "3. Restart Outlook, update it, and re-add the account if sync is stuck.",
      "4. Capture sender, recipient, timestamp, bounce message, or blocked warning.",
      `If mail still does not work, create a ${priority.toLowerCase()} priority ticket for ${team} with the affected mailbox and error details.`,
    ].join("\n");
  }

  if (hasAny(text, ["password", "login", "access", "denied", "mfa", "credential", "account"])) {
    return [
      "Try these access troubleshooting steps:",
      "1. Confirm the username is correct and reset the password if sign-in fails.",
      "2. Check MFA prompts, authenticator time sync, and whether the account is locked.",
      "3. Try a private browser window or clear cached credentials for the affected app.",
      "4. Capture the app name, exact access denied message, and the access level needed.",
      `If access is still blocked, create a ${priority.toLowerCase()} priority ticket for ${team} with manager approval or entitlement details if required.`,
    ].join("\n");
  }

  if (hasAny(text, ["printer", "print", "laptop", "screen", "display", "hardware", "keyboard", "mouse"])) {
    return [
      "Try these hardware troubleshooting steps:",
      "1. Restart the device and check all cables, power, docking station, and peripheral connections.",
      "2. Confirm whether the issue happens with another cable, monitor, printer, or USB port.",
      "3. Update drivers and check device manager or printer queue for errors.",
      "4. Capture the device model, asset tag, error message, and photos if there is visible damage.",
      `If the issue remains, create a ${priority.toLowerCase()} priority ticket for ${team} with the device details and test results.`,
    ].join("\n");
  }

  if (hasAny(text, ["software", "application", "app", "install", "installation", "open", "crash", "license"])) {
    return [
      "Try these software troubleshooting steps:",
      "1. Restart the app and the computer, then try opening the app as the signed-in user.",
      "2. Check for updates, license messages, missing permissions, or recent installation changes.",
      "3. Clear the app cache if available, or reinstall the application if the installer is approved.",
      "4. Capture the app name, version, screenshot, crash message, and steps that reproduce the issue.",
      `If the app still fails, create a ${priority.toLowerCase()} priority ticket for ${team} with logs or screenshots.`,
    ].join("\n");
  }

  return [
    "Try these general troubleshooting steps:",
    "1. Restart the affected device or application and confirm whether the issue happens again.",
    "2. Check whether the problem affects only you or multiple users.",
    "3. Note recent changes such as updates, password changes, new software, network changes, or access requests.",
    "4. Capture screenshots, exact error messages, time of issue, and business impact.",
    `If the issue continues, create a ${priority.toLowerCase()} priority ticket for ${team} with the collected details.`,
  ].join("\n");
};

const requestAiSuggestion = async (issue: string) => {
  try {
    const response = await fetch("/api/troubleshoot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue }),
    });
    const data = (await response.json()) as { suggestion?: string };
    return data.suggestion?.trim() || generateAiSuggestion(issue);
  } catch {
    return generateAiSuggestion(issue);
  }
};

const mergeKnowledgeEntries = (remoteEntries: KnowledgeEntry[]) => {
  const byTitle = new Map<string, KnowledgeEntry>();
  [...initialKb, ...remoteEntries].forEach((entry) => byTitle.set(entry.title.toLowerCase(), entry));
  return Array.from(byTitle.values());
};

const mergeAccounts = (remoteAccounts: UserAccount[]) => {
  const byEmail = new Map<string, UserAccount>();
  [...initialAccounts, ...remoteAccounts].forEach((account) => byEmail.set(account.email.toLowerCase(), account));
  return Array.from(byEmail.values());
};

const applyHistoryAssignments = (ticketList: TicketRecord[], historyList: TicketResolutionHistory[]) => {
  const latestEngineerByTicket = new Map<string, string>();
  [...historyList]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .forEach((record) => {
      if (!latestEngineerByTicket.has(record.ticketId) && record.engineerName) {
        latestEngineerByTicket.set(record.ticketId, record.engineerName);
      }
    });
  return ticketList.map((ticket) => {
    if (ticket.assignedTo !== "Unassigned") return ticket;
    const engineerName = latestEngineerByTicket.get(ticket.id);
    return engineerName ? { ...ticket, assignedTo: engineerName } : ticket;
  });
};

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const stored = window.localStorage.getItem(sessionKey);
      return stored ? (JSON.parse(stored) as AuthSession) : null;
    } catch {
      return null;
    }
  });
  const [accounts, setAccounts] = useState<UserAccount[]>(initialAccounts);
  const [tickets, setTickets] = useState<TicketRecord[]>(() => (session?.role === "User" ? [] : initialTickets));
  const [kbEntries, setKbEntries] = useState<KnowledgeEntry[]>(initialKb);
  const [chatHistory, setChatHistory] = useState<ChatRecord[]>(initialChatHistory);
  const [resolutionHistory, setResolutionHistory] = useState<TicketResolutionHistory[]>([]);
  const [dataSource, setDataSource] = useState(isSupabaseConfigured ? "Connecting to Supabase" : "Demo data");
  const [currentUser, setCurrentUser] = useState({
    id: roleDefaults.User.id,
    name: roleDefaults.User.name,
    email: roleDefaults.User.email,
    department: roleDefaults.User.department,
  });
  const [currentEngineer, setCurrentEngineer] = useState({
    name: roleDefaults["Support Engineer"].name,
    email: roleDefaults["Support Engineer"].email,
  });
  const [currentAdmin, setCurrentAdmin] = useState({
    name: roleDefaults.Admin.name,
    email: roleDefaults.Admin.email,
  });
  const [issue, setIssue] = useState("");
  const [suggestion, setSuggestion] = useState<{
    source: "Knowledge Base" | "AI Assistant";
    text: string;
    match?: KnowledgeEntry;
  } | null>(null);
  const [aiOutcome, setAiOutcome] = useState("");
  const [isTroubleshooting, setIsTroubleshooting] = useState(false);
  const [draftTicket, setDraftTicket] = useState<DraftTicket>({
    issueTitle: "",
    issue: "",
    aiSuggestion: "",
    priority: "Low",
    team: "General Support Team",
  });
  const [selectedEngineerTicketId, setSelectedEngineerTicketId] = useState("TKT-0001");
  const [kbForm, setKbForm] = useState({ id: "", title: "", category: "General", keywords: "", solution: "" });

  useEffect(() => {
    if (!session) return;
    if (session.role === "User" && session.email !== roleDefaults.User.email && session.userId === roleDefaults.User.id) {
      const correctedSession = { ...session, userId: createStableUserId(session.email) };
      setSession(correctedSession);
      window.localStorage.setItem(sessionKey, JSON.stringify(correctedSession));
      return;
    }
    if (session.role === "User") {
      setCurrentUser({
        id: session.userId,
        name: session.name,
        email: session.email,
        department: session.department || "Employee Portal",
      });
    }
    if (session.role === "Support Engineer") {
      setCurrentEngineer({ name: session.name, email: session.email });
    }
    if (session.role === "Admin") {
      setCurrentAdmin({ name: session.name, email: session.email });
    }
  }, [session]);

  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    const animatedSelectors = [
      ".hero-copy",
      ".hero-visual",
      ".page-section",
      ".footer-showcase",
      ".auth-art",
      ".auth-card",
      ".page-heading",
      ".page-heading-art",
      ".page-frame > .card",
      ".table-wrap",
      ".dashboard-grid",
      ".engineer-analytics",
      ".history-list",
      ".form-grid",
      ".two-column",
      ".kb-grid",
    ].join(", ");
    const elements = Array.from(document.querySelectorAll<HTMLElement>(animatedSelectors));

    elements.forEach((element, index) => {
      const direction =
        element.classList.contains("page-section") ||
        element.classList.contains("dashboard-grid") ||
        element.classList.contains("history-list") ||
        element.classList.contains("form-grid") ||
        element.classList.contains("two-column") ||
        element.classList.contains("kb-grid")
          ? "section-rise"
          : element.classList.contains("hero-copy") ||
        element.classList.contains("auth-art") ||
        element.classList.contains("faq-visual")
          ? "fade-right"
          : element.classList.contains("hero-visual") ||
              element.classList.contains("auth-card") ||
              element.classList.contains("faq-content")
            ? "fade-left"
            : "fade-up";

      element.dataset.animate = direction;
      element.classList.remove("is-visible");
      element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 60}ms`);
    });

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    async function loadSupabaseData() {
      if (!isSupabaseConfigured) return;
      try {
        const data = await loadInitialData();
        if (!data || cancelled) return;
        if (data.accounts.length > 0) setAccounts(mergeAccounts(data.accounts));
        if (data.kbEntries.length > 0) setKbEntries(mergeKnowledgeEntries(data.kbEntries));
        if (data.chatHistory.length > 0) setChatHistory(data.chatHistory);
        setResolutionHistory(data.resolutionHistory);
        if (data.tickets.length > 0) setTickets(applyHistoryAssignments(data.tickets, data.resolutionHistory));
        setDataSource("Supabase connected");
      } catch {
        if (!cancelled) setDataSource("Demo data");
      }
    }
    loadSupabaseData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const supabaseClient = supabase;
    let cancelled = false;
    const refreshRealtimeData = async () => {
      try {
        const data = await loadInitialData();
        if (!data || cancelled) return;
        setAccounts(mergeAccounts(data.accounts));
        setKbEntries(mergeKnowledgeEntries(data.kbEntries));
        setChatHistory(data.chatHistory);
        setResolutionHistory(data.resolutionHistory);
        setTickets(applyHistoryAssignments(data.tickets, data.resolutionHistory));
        setDataSource("Supabase realtime connected");
      } catch {
        if (!cancelled) setDataSource("Realtime refresh pending");
      }
    };

    const channel = supabaseClient
      .channel("imdad-ai-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, refreshRealtimeData)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, refreshRealtimeData)
      .on("postgres_changes", { event: "*", schema: "public", table: "knowledge_base" }, refreshRealtimeData)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_history" }, refreshRealtimeData)
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_resolution_history" }, refreshRealtimeData)
      .subscribe((status) => {
        if (!cancelled && status === "SUBSCRIBED") setDataSource("Supabase realtime connected");
      });
    const refreshTimer = window.setInterval(refreshRealtimeData, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      supabaseClient.removeChannel(channel);
    };
  }, []);

  const startSession = (nextSession: AuthSession) => {
    setSession(nextSession);
    window.localStorage.setItem(sessionKey, JSON.stringify(nextSession));
    if (nextSession.role === "User") {
      setCurrentUser({
        id: nextSession.userId,
        name: nextSession.name,
        email: nextSession.email,
        department: nextSession.department || "Employee Portal",
      });
      navigateTo("/ai-help");
    }
    if (nextSession.role === "Support Engineer") {
      setCurrentEngineer({ name: nextSession.name, email: nextSession.email });
      navigateTo("/engineer");
    }
    if (nextSession.role === "Admin") {
      setCurrentAdmin({ name: nextSession.name, email: nextSession.email });
      navigateTo("/admin");
    }
  };

  const logout = () => {
    setSession(null);
    window.localStorage.removeItem(sessionKey);
    navigateTo("/");
  };

  const authenticateAccount = async (role: Role, email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) return "Email and password are required.";

    const account = accounts.find((item) => item.email === normalizedEmail && item.role === role);
    const defaults = roleDefaults[role];
    const defaultLoginMatches = normalizedEmail === defaults.email && password === defaults.password;

    if (!account && !defaultLoginMatches) {
      return "No matching account was found for this email and role.";
    }

    if (account?.passwordHash) {
      const enteredHash = await hashPassword(normalizedEmail, password);
      if (enteredHash !== account.passwordHash) return "Invalid password for this account.";
    } else if (!defaultLoginMatches) {
      return "This database account does not have a password yet. Please create the account again from Signup.";
    }

    const matchedAccount =
      account ??
      ({
        id: defaults.id,
        name: defaults.name,
        email: normalizedEmail,
        role,
        employeeId: role === "Support Engineer" ? "ENG-2001" : role === "Admin" ? "ADM-3001" : "EMP-1001",
        department: defaults.department,
        passwordHash: "",
        createdAt: nowStamp(),
      } as UserAccount);

    if (defaultLoginMatches && isSupabaseConfigured) {
      try {
        await persistUserAccount({
          ...matchedAccount,
          passwordHash: matchedAccount.passwordHash || (await hashPassword(normalizedEmail, password)),
        });
        setDataSource("Supabase account synced");
      } catch {
        setDataSource("Supabase connected");
      }
    }

    startSession({
      userId: matchedAccount.id,
      name: matchedAccount.name,
      email: matchedAccount.email,
      role: matchedAccount.role,
      department: matchedAccount.department,
      startedAt: nowStamp(),
    });
    return "";
  };

  const registerAccount = async (account: {
    role: "User" | "Support Engineer";
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    department: string;
  }) => {
    const normalizedEmail = account.email.trim().toLowerCase();
    if (!account.name.trim() || !normalizedEmail || !account.password.trim() || !account.department.trim()) {
      return "All fields are required.";
    }
    if (account.password !== account.confirmPassword) {
      return "Password and confirm password must match.";
    }
    if (accounts.some((item) => item.email === normalizedEmail)) {
      return "An account already exists with this email.";
    }

    const nextAccount: UserAccount = {
      id: createStableUserId(normalizedEmail),
      name: account.name.trim(),
      email: normalizedEmail,
      role: account.role,
      employeeId: account.role === "Support Engineer" ? `ENG-${Date.now().toString().slice(-4)}` : `EMP-${Date.now().toString().slice(-4)}`,
      department: account.department.trim(),
      passwordHash: await hashPassword(normalizedEmail, account.password),
      createdAt: nowStamp(),
    };

    setAccounts((current) => mergeAccounts([nextAccount, ...current]));
    try {
      await persistUserAccount(nextAccount);
      setDataSource(isSupabaseConfigured ? "Supabase account saved" : "Demo account saved locally");
    } catch {
      setDataSource("Account save pending");
      return "The account was created locally, but Supabase could not save it. Check that users.password_hash exists.";
    }

    startSession({
      userId: nextAccount.id,
      name: nextAccount.name,
      email: nextAccount.email,
      role: nextAccount.role,
      department: nextAccount.department,
      startedAt: nowStamp(),
    });
    return "";
  };

  const updateTicket = (ticketId: string, patch: Partial<TicketRecord>, remarks = "") => {
    setTickets((current) => {
      const original = current.find((ticket) => ticket.id === ticketId);
      const next = current.map((ticket) => (ticket.id === ticketId ? { ...ticket, ...patch, updatedAt: nowStamp() } : ticket));
      const updated = next.find((ticket) => ticket.id === ticketId);
      if (updated) {
        updateStoredTicket(updated).catch(() => setDataSource("Local changes pending"));
      }
      const shouldRecordHistory =
        Boolean(original && updated && remarks.trim()) &&
        (patch.status !== undefined || patch.assignedTo !== undefined || patch.resolution !== undefined);
      if (original && updated && shouldRecordHistory) {
        const actor =
          session?.role === "Admin"
            ? { name: currentAdmin.name, email: currentAdmin.email }
            : { name: currentEngineer.name, email: currentEngineer.email };
        const historyRecord: TicketResolutionHistory = {
          id: `HIST-${Date.now()}`,
          ticketId: updated.id,
          engineerName: actor.name,
          engineerEmail: actor.email,
          previousStatus: original.status,
          newStatus: updated.status,
          remarks: remarks.trim(),
          resolutionNotes: updated.resolution,
          createdAt: nowStamp(),
        };
        setResolutionHistory((history) => [historyRecord, ...history]);
        persistResolutionHistory(historyRecord).catch(() => setDataSource("Local history pending"));
      }
      return next;
    });
  };

  const saveChat = async (record: ChatRecord) => {
    setChatHistory((current) => [record, ...current]);
    try {
      await persistChatRecord(record);
    } catch {
      setDataSource("Local changes pending");
    }
  };

  const troubleshoot = async () => {
    const cleaned = issue.trim();
    if (!cleaned) return;
    setIsTroubleshooting(true);
    setAiOutcome("");
    const match = findKnowledgeBaseMatch(kbEntries, cleaned);
    const text = match ? match.solution : await requestAiSuggestion(cleaned);
    setSuggestion({ source: match ? "Knowledge Base" : "AI Assistant", text, match });
    setIsTroubleshooting(false);
  };

  const getKnowledgeBaseAnswer = () => {
    const cleaned = issue.trim();
    if (!cleaned) return;
    setAiOutcome("");
    const match = findKnowledgeBaseMatch(kbEntries, cleaned);
    setSuggestion({
      source: "Knowledge Base",
      text: match ? match.solution : "No matching Knowledge Base article was found. Try AI Suggestion for troubleshooting steps.",
      match,
    });
  };

  const getAiSuggestion = async () => {
    const cleaned = issue.trim();
    if (!cleaned) return;
    setIsTroubleshooting(true);
    setAiOutcome("");
    const text = await requestAiSuggestion(cleaned);
    setSuggestion({ source: "AI Assistant", text });
    setIsTroubleshooting(false);
  };

  const markIssueResolved = () => {
    if (!session || session.role !== "User" || !suggestion || !issue.trim()) return;
    saveChat({
      id: createChatId(chatHistory),
      userId: currentUser.id,
      user: currentUser.name,
      email: currentUser.email,
      issue,
      source: suggestion.source,
      suggestion: suggestion.text,
      outcome: "Resolved without ticket",
      ticketId: null,
      createdAt: nowStamp(),
    });
    setAiOutcome("Saved as resolved without ticket.");
    setSuggestion(null);
  };

  const prepareHumanSupport = () => {
    if (!suggestion || !issue.trim()) return;
    const nextDraft = {
      issueTitle: createIssueTitle(issue, suggestion.match),
      issue,
      aiSuggestion: suggestion.text,
      priority: inferPriority(issue, suggestion.match),
      team: inferTeam(issue, suggestion.match),
    };
    setDraftTicket(nextDraft);
    setAiOutcome("Issue forwarded to support. Review and create the ticket.");
    navigateTo("/raise-ticket");
  };

  const createTicket = async () => {
    if (!session || session.role !== "User" || !draftTicket.issueTitle.trim() || !draftTicket.issue.trim()) return;
    const ticket: TicketRecord = {
      id: createTicketId(tickets),
      userId: currentUser.id,
      user: currentUser.name,
      email: currentUser.email,
      issueTitle: draftTicket.issueTitle.trim(),
      issue: draftTicket.issue.trim(),
      aiSuggestion: draftTicket.aiSuggestion.trim() || generateAiSuggestion(draftTicket.issue),
      priority: draftTicket.priority,
      team: draftTicket.team,
      status: "Open",
      assignedTo: "Unassigned",
      resolution: "",
      createdAt: nowStamp(),
      updatedAt: nowStamp(),
    };
    const chatRecord: ChatRecord = {
      id: createChatId(chatHistory),
      userId: currentUser.id,
      user: currentUser.name,
      email: currentUser.email,
      issue: ticket.issue,
      source: suggestion?.source ?? "AI Assistant",
      suggestion: ticket.aiSuggestion,
      outcome: "Ticket created",
      ticketId: ticket.id,
      createdAt: nowStamp(),
    };
    setTickets((current) => [ticket, ...current]);
    try {
      await persistTicket(ticket);
      await saveChat(chatRecord);
      setDataSource(isSupabaseConfigured ? "Supabase ticket saved" : "Demo ticket saved locally");
    } catch {
      setDataSource("Local changes pending");
      void saveChat(chatRecord);
    }
    setDraftTicket({ issueTitle: "", issue: "", aiSuggestion: "", priority: "Low", team: "General Support Team" });
    setSuggestion(null);
    navigateTo(`/tickets/${ticket.id}`);
  };

  const saveKbEntry = () => {
    if (!kbForm.title.trim() || !kbForm.solution.trim()) return;
    const entry: KnowledgeEntry = {
      id: kbForm.id || `KB-${Math.floor(200 + Math.random() * 700)}`,
      title: kbForm.title.trim(),
      category: kbForm.category.trim() || "General",
      keywords: kbForm.keywords.split(",").map((keyword) => keyword.trim().toLowerCase()).filter(Boolean),
      solution: kbForm.solution.trim(),
      owner: currentAdmin.name,
      createdAt: kbForm.id ? kbEntries.find((item) => item.id === kbForm.id)?.createdAt ?? nowStamp() : nowStamp(),
      updatedAt: nowStamp(),
    };
    if (kbForm.id) {
      setKbEntries((current) => current.map((item) => (item.id === entry.id ? entry : item)));
      updateStoredKnowledgeEntry(entry).catch(() => setDataSource("Local changes pending"));
    } else {
      setKbEntries((current) => [entry, ...current]);
      persistKnowledgeEntry(entry).catch(() => setDataSource("Local changes pending"));
    }
    setKbForm({ id: "", title: "", category: "General", keywords: "", solution: "" });
  };

  const editKbEntry = (entry: KnowledgeEntry) => {
    setKbForm({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      keywords: entry.keywords.join(", "),
      solution: entry.solution,
    });
    navigateTo("/admin/kb");
  };

  const deleteKbEntry = (entryId: string) => {
    setKbEntries((current) => current.filter((entry) => entry.id !== entryId));
    deleteStoredKnowledgeEntry(entryId).catch(() => setDataSource("Local changes pending"));
  };

  const currentUserEmail = currentUser.email.toLowerCase();
  const userTickets = tickets.filter((ticket) => ticket.userId === currentUser.id || ticket.email.toLowerCase() === currentUserEmail);
  const userChatHistory = chatHistory.filter((record) => record.userId === currentUser.id || record.email.toLowerCase() === currentUserEmail);
  const engineerTickets = tickets.filter(
    (ticket) => ticket.assignedTo === currentEngineer.name || ticket.assignedTo === "Unassigned" || ["Open", "In Progress"].includes(ticket.status),
  );
  const selectedEngineerTicket = engineerTickets.find((ticket) => ticket.id === selectedEngineerTicketId) ?? engineerTickets[0];
  const supportChatHistory = chatHistory.filter((record) =>
    tickets.some((ticket) => ticket.id === record.ticketId && (ticket.assignedTo === currentEngineer.name || ticket.assignedTo === "Unassigned")),
  );
  const visibleChatHistory = session?.role === "Admin" ? chatHistory : session?.role === "Support Engineer" ? supportChatHistory : userChatHistory;
  const knownUsers = Array.from(
    new Map(
      [
        ...accounts
          .filter((account) => account.role === "User")
          .map((account) => ({
            id: account.id,
            name: account.name,
            email: account.email,
            role: account.role,
            department: account.department,
          })),
        ...tickets.map((ticket) => ({
          id: ticket.userId,
          name: ticket.user,
          email: ticket.email,
          role: "User",
          department: ticket.team.replace(" Team", ""),
        })),
      ].map((user) => [user.email, user]),
    ).values(),
  );
  const supportEngineers = accounts
    .filter((account) => account.role === "Support Engineer")
    .map((account) => ({
      name: account.name,
      email: account.email,
      status: account.email === currentEngineer.email ? "Active" : "Available",
      assigned: tickets.filter((ticket) => ticket.assignedTo === account.name).length,
    }));
  const metrics = {
    users: knownUsers.length,
    engineers: supportEngineers.length,
    totalTickets: tickets.length,
    open: tickets.filter((ticket) => ticket.status === "Open").length,
    resolved: tickets.filter((ticket) => ["Resolved", "Closed"].includes(ticket.status)).length,
    high: tickets.filter((ticket) => ["High", "Critical"].includes(ticket.priority)).length,
  };

  const ctx = {
    session,
    dataSource,
    startSession,
    authenticateAccount,
    registerAccount,
    logout,
    currentUser,
    currentEngineer,
    currentAdmin,
    tickets,
    userTickets,
    engineerTickets,
    selectedEngineerTicket,
    setSelectedEngineerTicketId,
    resolutionHistory,
    updateTicket,
    kbEntries,
    kbForm,
    setKbForm,
    saveKbEntry,
    editKbEntry,
    deleteKbEntry,
    issue,
    setIssue,
    suggestion,
    aiOutcome,
    isTroubleshooting,
    troubleshoot,
    getKnowledgeBaseAnswer,
    getAiSuggestion,
    markIssueResolved,
    prepareHumanSupport,
    draftTicket,
    setDraftTicket,
    createTicket,
    chatHistory: visibleChatHistory,
    allChatHistory: chatHistory,
    users: knownUsers,
    engineers: supportEngineers,
    accounts,
    metrics,
    path,
  };

  return (
    <div className="app-shell">
      <Navbar session={session} logout={logout} path={path} />
      <main>{renderRoute(path, ctx)}</main>
      <Footer />
    </div>
  );
}

type AppContext = ReturnType<typeof useAppContextShape>;
function useAppContextShape() {
  return {} as {
    session: AuthSession | null;
    dataSource: string;
    startSession: (session: AuthSession) => void;
    authenticateAccount: (role: Role, email: string, password: string) => Promise<string>;
    registerAccount: (account: {
      role: "User" | "Support Engineer";
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
      department: string;
    }) => Promise<string>;
    logout: () => void;
    currentUser: { id: string; name: string; email: string; department: string };
    currentEngineer: { name: string; email: string };
    currentAdmin: { name: string; email: string };
    tickets: TicketRecord[];
    userTickets: TicketRecord[];
    engineerTickets: TicketRecord[];
    selectedEngineerTicket?: TicketRecord;
    setSelectedEngineerTicketId: (id: string) => void;
    resolutionHistory: TicketResolutionHistory[];
    updateTicket: (id: string, patch: Partial<TicketRecord>, remarks?: string) => void;
    kbEntries: KnowledgeEntry[];
    kbForm: { id: string; title: string; category: string; keywords: string; solution: string };
    setKbForm: (form: { id: string; title: string; category: string; keywords: string; solution: string }) => void;
    saveKbEntry: () => void;
    editKbEntry: (entry: KnowledgeEntry) => void;
    deleteKbEntry: (id: string) => void;
    issue: string;
    setIssue: (issue: string) => void;
    suggestion: { source: "Knowledge Base" | "AI Assistant"; text: string; match?: KnowledgeEntry } | null;
    aiOutcome: string;
    isTroubleshooting: boolean;
    troubleshoot: () => void;
    getKnowledgeBaseAnswer: () => void;
    getAiSuggestion: () => void;
    markIssueResolved: () => void;
    prepareHumanSupport: () => void;
    draftTicket: DraftTicket;
    setDraftTicket: (draft: DraftTicket) => void;
    createTicket: () => void;
    chatHistory: ChatRecord[];
    allChatHistory: ChatRecord[];
    users: Array<{ id: string; name: string; email: string; role: string; department: string }>;
    engineers: Array<{ name: string; email: string; status: string; assigned: number }>;
    accounts: UserAccount[];
    metrics: { users: number; engineers: number; totalTickets: number; open: number; resolved: number; high: number };
    path: string;
  };
}

function routeAllowed(path: string, session: AuthSession | null) {
  if (publicRoutes.includes(path) || path.startsWith("/tickets/")) return true;
  if (!session) return false;
  if (session.role === "User") return userRoutes.includes(path);
  if (session.role === "Support Engineer") return engineerRoutes.includes(path) || path.startsWith("/tickets/");
  if (session.role === "Admin") return adminRoutes.includes(path) || path.startsWith("/tickets/") || path === "/knowledge-base";
  return false;
}

function renderRoute(path: string, ctx: AppContext) {
  if (!routeAllowed(path, ctx.session)) return <AccessPage session={ctx.session} />;
  if (path === "/") return <HomePage />;
  if (path === "/login") return <LoginPage authenticateAccount={ctx.authenticateAccount} />;
  if (path === "/signup") return <SignupPage registerAccount={ctx.registerAccount} />;
  if (!ctx.session) return <AccessPage session={ctx.session} />;
  if (path === "/ai-help") return ctx.session.role === "User" ? <AiHelpPage ctx={ctx} /> : <AccessPage session={ctx.session} />;
  if (path === "/raise-ticket") return ctx.session.role === "User" ? <RaiseTicketPage ctx={ctx} /> : <AccessPage session={ctx.session} />;
  if (path === "/my-tickets") return ctx.session.role === "User" ? <MyTicketsPage tickets={ctx.userTickets} /> : <AccessPage session={ctx.session} />;
  if (path.startsWith("/tickets/")) return <TicketDetailsPage ctx={ctx} ticketId={decodeURIComponent(path.replace("/tickets/", ""))} />;
  if (path === "/chat-history") return <ChatHistoryPage records={ctx.chatHistory} role={ctx.session.role} />;
  if (path === "/knowledge-base") return <KnowledgeBasePage entries={ctx.kbEntries} />;
  if (path === "/engineer") return ctx.session.role === "Support Engineer" ? <EngineerHomeDashboard ctx={ctx} /> : <AccessPage session={ctx.session} />;
  if (path === "/engineer/tickets") return ctx.session.role === "Support Engineer" ? <EngineerDashboard ctx={ctx} /> : <AccessPage session={ctx.session} />;
  if (path === "/admin") return ctx.session.role === "Admin" ? <AdminDashboard ctx={ctx} /> : <AccessPage session={ctx.session} />;
  if (path === "/admin/kb") return ctx.session.role === "Admin" ? <KnowledgeBaseManagementPage ctx={ctx} /> : <AccessPage session={ctx.session} />;
  if (path === "/admin/users") return ctx.session.role === "Admin" ? <AdminUsersPage users={ctx.users} engineers={ctx.engineers} /> : <AccessPage session={ctx.session} />;
  if (path === "/admin/tickets") return ctx.session.role === "Admin" ? <AdminTicketsPage tickets={ctx.tickets} /> : <AccessPage session={ctx.session} />;
  return <AccessPage session={ctx.session} notFound />;
}

function getRoleHomePath(session: AuthSession | null) {
  if (!session) return "/";
  if (session.role === "User") return "/ai-help";
  if (session.role === "Support Engineer") return "/engineer";
  return "/admin";
}

function Navbar({ session, logout, path }: { session: AuthSession | null; logout: () => void; path: string }) {
  const roleHomePath = getRoleHomePath(session);
  const isActiveLink = (href: string) => {
    if (href === "logout" || href === "/#features") return false;
    if (href === "/my-tickets" && path.startsWith("/tickets/")) return true;
    if (href === "/engineer/tickets" && path.startsWith("/tickets/")) return true;
    if (href === "/admin/tickets" && path.startsWith("/tickets/")) return true;
    return path === href;
  };
  const links: Array<[string, string]> = session
    ? session.role === "User"
      ? [
          [roleHomePath, "Home"],
          ["/raise-ticket", "Raise Ticket"],
          ["/my-tickets", "My Tickets"],
          ["/knowledge-base", "Knowledge Base"],
          ["logout", "Logout"],
        ]
      : session.role === "Support Engineer"
        ? [
            [roleHomePath, "Home"],
            ["/engineer/tickets", "Tickets"],
            ["/knowledge-base", "Knowledge Base"],
            ["logout", "Logout"],
          ]
        : [
            [roleHomePath, "Home"],
            ["/admin/users", "Users"],
            ["/admin/tickets", "Tickets"],
            ["/admin/kb", "Knowledge Base"],
            ["logout", "Logout"],
          ]
    : [
        ["/", "Home"],
        ["/#features", "Features"],
        ["/login", "Login"],
        ["/signup", "Signup"],
      ];

  return (
    <header className="navbar">
      <button className="brand" onClick={() => navigateTo(roleHomePath)}>
        <img className="brand-mark" src="/brand/imdad-ai-mark.png" alt="" />
        <span className="brand-wordmark">
          Imdad <span>AI</span>
        </span>
      </button>
      <nav>
        {links.map(([href, label]) => (
          <button
            key={`${label}-${href}`}
            className={isActiveLink(href) ? "active" : ""}
            aria-current={isActiveLink(href) ? "page" : undefined}
            onClick={() => {
              if (href === "/#features") {
                if (window.location.pathname !== "/") {
                  navigateTo("/");
                  window.setTimeout(() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }), 80);
                } else {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }
                return;
              }
              if (href === "logout") {
                logout();
                return;
              }
              navigateTo(href);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function HomePage() {
  return (
    <>
      <section className="hero">
        <img className="hero-image" src="/hero-ai-ticket-desk.png" alt="" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-copy">
            <span className="badge">
              <Sparkles size={16} />
              Smart support platform
            </span>
            <h1>
              Imdad{" "}
              <span className="headline-gradient">AI</span>
            </h1>
            <p>
              <strong>Smart AI-powered support ticket system.</strong>
              <br />
              Get instant troubleshooting suggestions, raise structured tickets, and route work to the right team.
            </p>
            <div className="hero-actions">
              <button className="button primary" onClick={() => navigateTo("/signup")}>
                Get Started
                <ArrowRight size={18} />
              </button>
              <button className="button secondary" onClick={() => navigateTo("/login")}>
                Login
                <LogIn size={18} />
              </button>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <img src="/visuals/hero-support-3d.svg" alt="" />
            <span className="pattern-dot dot-one" />
            <span className="pattern-dot dot-two" />
            <span className="pattern-star" />
          </div>
        </div>
      </section>
      <section className="page-section compact-section" id="features">
        <SectionTitle eyebrow="Features" title="Fast support, clean escalation" />
        <div className="feature-grid">
          <FeatureCard icon={Bot} image="/visuals/ai-help-3d.svg" title="AI Help" body="Suggests fast fixes for common technical issues." />
          <FeatureCard icon={Ticket} image="/visuals/ticket-3d.svg" title="Smart Ticket Creation" body="Turns unresolved issues into organized support tickets." />
          <FeatureCard icon={Users} image="/visuals/dashboard-3d.svg" title="Role-Based Dashboards" body="Gives each role the right workspace and actions." />
        </div>
      </section>
      <section className="page-section workflow-panel compact-section">
        <SectionTitle eyebrow="Workflow" title="Get started with simple steps" />
        <div className="workflow-grid">
          <WorkflowCard image="/visuals/describe-issue-3d.svg" step="01" title="Describe Issue" body="Enter the problem in plain language." />
          <WorkflowCard image="/visuals/ai-suggestion-3d.svg" step="02" title="Get AI Suggestion" body="Receive a focused troubleshooting response." />
          <WorkflowCard image="/visuals/track-ticket-3d.svg" step="03" title="Create or Track Ticket" body="Escalate or monitor ticket progress." />
        </div>
      </section>
      <FaqSection />
    </>
  );
}

function LoginPage({ authenticateAccount }: { authenticateAccount: AppContext["authenticateAccount"] }) {
  const [role, setRole] = useState<Role>("User");
  const [email, setEmail] = useState(roleDefaults.User.email);
  const [password, setPassword] = useState(roleDefaults.User.password);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectRole = (nextRole: Role) => {
    setRole(nextRole);
    setEmail(roleDefaults[nextRole].email);
    setPassword(roleDefaults[nextRole].password);
  };

  const login = async () => {
    setError("");
    setIsSubmitting(true);
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      setIsSubmitting(false);
      return;
    }
    const loginError = await authenticateAccount(role, email, password);
    if (loginError) setError(loginError);
    setIsSubmitting(false);
  };

  return (
    <AuthShell title="Login" subtitle="Access the correct dashboard with role-based redirection.">
      <div className="role-select">
        {(["User", "Support Engineer", "Admin"] as Role[]).map((item) => (
          <button key={item} className={role === item ? "active" : ""} onClick={() => selectRole(item)}>
            {item}
          </button>
        ))}
      </div>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="button primary full" onClick={login} disabled={isSubmitting}>
        <LogIn size={18} />
        {isSubmitting ? "Checking account..." : "Login"}
      </button>
      <p className="form-link">
        New user? <button onClick={() => navigateTo("/signup")}>Create an account</button>
      </p>
    </AuthShell>
  );
}

function SignupPage({ registerAccount }: { registerAccount: AppContext["registerAccount"] }) {
  const [role, setRole] = useState<"User" | "Support Engineer">("User");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: signupDepartments.User[0],
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const departmentOptions = signupDepartments[role];

  const selectSignupRole = (nextRole: "User" | "Support Engineer") => {
    setRole(nextRole);
    setForm((current) => ({ ...current, department: signupDepartments[nextRole][0] }));
  };

  const signup = async () => {
    setError("");
    setIsSubmitting(true);
    if (!form.name.trim() || !form.email.trim() || !form.password.trim() || !form.department.trim()) {
      setError("All fields are required.");
      setIsSubmitting(false);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Password and confirm password must match.");
      setIsSubmitting(false);
      return;
    }
    const signupError = await registerAccount({ role, ...form });
    if (signupError) setError(signupError);
    setIsSubmitting(false);
  };

  return (
    <AuthShell title="Create Account" subtitle="Create an account and continue to the correct workspace.">
      <div className="role-select signup-role-select">
        {(["User", "Support Engineer"] as const).map((item) => (
          <button key={item} className={role === item ? "active" : ""} onClick={() => selectSignupRole(item)}>
            {item}
          </button>
        ))}
      </div>
      <label>
        Full name
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </label>
      <label>
        Email
        <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      </label>
      <label>
        Password
        <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      </label>
      <label>
        Confirm password
        <input type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
      </label>
      <label>
        Department
        <select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}>
          {departmentOptions.map((department) => (
            <option key={department}>{department}</option>
          ))}
        </select>
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="button primary full" onClick={signup} disabled={isSubmitting}>
        <UserPlus size={18} />
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </AuthShell>
  );
}

function AiHelpPage({ ctx }: { ctx: AppContext }) {
  return (
    <PageFrame eyebrow="AI Help" title="Quick Fix Before Ticket" description="Enter your issue. The system searches the Knowledge Base, then applies AI if no solution is found.">
      <div className="two-column ai-help-layout">
        <section className="card ai-help-card">
          <div className="ai-help-card-head">
            <div>
              <span className="eyebrow">Issue input</span>
              <h3>Describe the problem</h3>
            </div>
            <img src="/visuals/ai-help-input-3d.svg" alt="" />
          </div>
          <textarea
            aria-label="Issue input"
            value={ctx.issue}
            placeholder="Type your issue here (e.g., VPN not connecting after MFA)."
            onChange={(event) => ctx.setIssue(event.target.value)}
          />
          <div className="button-row ai-help-actions">
            <button className="button secondary" onClick={ctx.getKnowledgeBaseAnswer} disabled={!ctx.issue.trim()}>
              <BookOpen size={18} />
              Get Knowledge Base Answer
            </button>
            <button className="button primary" onClick={ctx.getAiSuggestion} disabled={ctx.isTroubleshooting || !ctx.issue.trim()}>
              <Sparkles size={18} />
              {ctx.isTroubleshooting ? "Checking" : "AI Suggestion"}
            </button>
            <button className="button success" onClick={ctx.markIssueResolved} disabled={!ctx.suggestion}>
              <CheckCircle2 size={18} />
              Issue Resolved
            </button>
            <button className="button secondary" onClick={ctx.prepareHumanSupport} disabled={!ctx.suggestion}>
              <Wrench size={18} />
              Proceed with Human Support
            </button>
          </div>
        </section>
        <section className="card response-card">
          <span className="eyebrow">Knowledge Base result / AI response</span>
          {ctx.suggestion ? (
            <>
              <span className={`pill ${ctx.suggestion.source === "Knowledge Base" ? "tone-green" : "tone-violet"}`}>{ctx.suggestion.source}</span>
              {ctx.suggestion.match && <strong>{ctx.suggestion.match.title}</strong>}
              <p>{ctx.suggestion.text}</p>
            </>
          ) : (
            <p>Run a triage check to see a Knowledge Base match or AI troubleshooting response.</p>
          )}
          {ctx.aiOutcome && <div className="notice">{ctx.aiOutcome}</div>}
        </section>
      </div>
    </PageFrame>
  );
}

function RaiseTicketPage({ ctx }: { ctx: AppContext }) {
  const updateDraft = (patch: Partial<DraftTicket>) => ctx.setDraftTicket({ ...ctx.draftTicket, ...patch });
  return (
    <PageFrame eyebrow="Raise Ticket" title="Submit Support Request" description="Review the AI context, priority, and assigned team before creating the ticket.">
      <div className="form-grid">
        <section className="card form-card">
          <label>
            Issue title
            <input
              value={ctx.draftTicket.issueTitle}
              placeholder="For eg.: Laptop screen flickering"
              onChange={(event) => updateDraft({ issueTitle: event.target.value })}
            />
          </label>
          <label>
            Issue description
            <textarea
              value={ctx.draftTicket.issue}
              placeholder="For eg.: My laptop screen keeps flickering during work, especially when I join Teams meetings or connect to an external monitor."
              onChange={(event) => updateDraft({ issue: event.target.value })}
            />
          </label>
          <label>
            AI suggestion
            <textarea value={ctx.draftTicket.aiSuggestion} onChange={(event) => updateDraft({ aiSuggestion: event.target.value })} />
          </label>
          <div className="inline-fields">
            <label>
              Priority
              <select value={ctx.draftTicket.priority} onChange={(event) => updateDraft({ priority: event.target.value as Priority })}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </label>
            <label>
              Assigned team
              <select value={ctx.draftTicket.team} onChange={(event) => updateDraft({ team: event.target.value })}>
                <option>Network Team</option>
                <option>IT Support Team</option>
                <option>Hardware Team</option>
                <option>Access Management Team</option>
                <option>Software Support Team</option>
                <option>General Support Team</option>
              </select>
            </label>
          </div>
          <button className="button primary" onClick={ctx.createTicket}>
            <Plus size={18} />
            Create ticket
          </button>
        </section>
        <section className="card">
          <span className="eyebrow">View Added Ticket</span>
          {ctx.userTickets.length > 0 ? <TicketSummary ticket={ctx.userTickets[0]} /> : <NoAddedTicket />}
        </section>
      </div>
    </PageFrame>
  );
}

function MyTicketsPage({ tickets }: { tickets: TicketRecord[] }) {
  return (
    <PageFrame eyebrow="My Tickets" title="Track your support requests" description="View and track all tickets linked to your account.">
      <UserTicketList tickets={tickets} />
    </PageFrame>
  );
}

function TicketDetailsPage({ ctx, ticketId }: { ctx: AppContext; ticketId: string }) {
  const ticket = ctx.tickets.find((item) => item.id === ticketId);
  const isOwnTicket = Boolean(
    ticket && (ticket.userId === ctx.currentUser.id || ticket.email.toLowerCase() === ctx.currentUser.email.toLowerCase()),
  );
  const canView =
    ticket &&
    (ctx.session?.role === "Admin" ||
      ctx.session?.role === "Support Engineer" ||
      isOwnTicket);
  if (!ticket || !canView) return <AccessPage session={ctx.session} notFound />;
  const history = ctx.resolutionHistory.filter((record) => record.ticketId === ticket.id);
  return (
    <PageFrame eyebrow="Ticket Details" title={ticket.issueTitle} description="Complete ticket context, AI suggestion, assignment, status, and resolution notes.">
      <section className="card detail-card">
        <Detail label="Ticket ID" value={ticket.id} />
        <Detail label="User ID" value={formatShortUserId(ticket.userId || "Not linked")} />
        <Detail label="User name" value={ticket.user} />
        <Detail label="User email" value={ticket.email} />
        <Detail label="Issue title" value={ticket.issueTitle} />
        <Detail label="Issue description" value={ticket.issue} wide />
        <Detail label="AI suggestion" value={ticket.aiSuggestion} wide />
        <Detail label="Priority" value={ticket.priority} />
        <Detail label="Assigned team" value={ticket.team} />
        <Detail label="Assigned engineer" value={ticket.assignedTo} />
        <Detail label="Status" value={ticket.status} />
        <Detail label="Resolution notes" value={ticket.resolution || "No resolution notes yet."} wide />
        <Detail label="Created date" value={formatDate(ticket.createdAt)} />
        <Detail label="Updated date" value={formatDate(ticket.updatedAt)} />
      </section>
      <ResolutionHistoryPanel history={history} />
    </PageFrame>
  );
}

function ChatHistoryPage({ records, role }: { records: ChatRecord[]; role: Role }) {
  return (
    <PageFrame eyebrow="Chat History" title={role === "User" ? "Your AI conversations" : "Support-related AI conversations"} description="Conversation records include the issue, AI response, result, related ticket, and timestamp.">
      <div className="history-list">
        {records.map((record) => (
          <article className="card history-card" key={record.id}>
            <div>
              <span className="eyebrow">{record.id}</span>
              <h3>{record.issue}</h3>
            </div>
            <p>{record.suggestion}</p>
            <div className="meta-grid">
              <span>Result: <strong>{record.outcome}</strong></span>
              <span>Related ticket: <strong>{record.ticketId ?? "None"}</strong></span>
              <span>Date and time: <strong>{formatDate(record.createdAt)}</strong></span>
            </div>
          </article>
        ))}
      </div>
    </PageFrame>
  );
}

function KnowledgeBasePage({ entries }: { entries: KnowledgeEntry[] }) {
  const [query, setQuery] = useState("");
  const quickIssues = ["VPN connection issue", "Password reset", "Email blocked", "Printer issue", "Software installation issue"];
  const filtered = entries.filter((entry) => {
    const text = `${entry.title} ${entry.category} ${entry.keywords.join(" ")} ${entry.solution}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });
  return (
    <section className="page-frame kb-page">
      <div className="kb-heading-row">
        <div className="page-heading">
          <span className="eyebrow">Knowledge Base</span>
          <h1>Search common IT solutions</h1>
          <p>User-facing articles for common VPN, Wi-Fi, email, password, access, hardware, software, and system issues.</p>
        </div>
        <img className="kb-heading-art" src="/visuals/knowledge-base-3d.svg" alt="" />
      </div>
      <div className="search-box">
        <Search size={18} />
        <input placeholder="Search issues, keywords, or solution text" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="quick-issues" aria-label="Quick review issues">
        {quickIssues.map((issueName) => (
          <button key={issueName} type="button" onClick={() => setQuery(issueName)}>
            {issueName}
          </button>
        ))}
      </div>
      <div className="card kb-list">
        <div className="kb-list-head">
          <span>Issue type</span>
          <span>Issue and solution</span>
        </div>
        {filtered.map((entry) => (
          <article className="kb-list-row" key={entry.id}>
            <div className="kb-list-category">
              <span className="pill tone-blue">{entry.category}</span>
            </div>
            <div className="kb-list-main">
              <h3>{entry.title}</h3>
              <p>{entry.solution}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EngineerHomeDashboard({ ctx }: { ctx: AppContext }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TicketStatus | "All Status">("All Status");
  const [priority, setPriority] = useState<Priority | "All Priority">("All Priority");
  const [sortOrder, setSortOrder] = useState<"Newest" | "Oldest">("Newest");
  const [page, setPage] = useState(1);
  const tickets = ctx.engineerTickets;
  const visibleTickets = tickets
    .filter((ticket) => {
      const searchText = `${ticket.id} ${ticket.issueTitle} ${ticket.issue} ${ticket.priority} ${ticket.status} ${ticket.team}`.toLowerCase();
      const matchesQuery = searchText.includes(query.trim().toLowerCase());
      const matchesStatus = status === "All Status" || ticket.status === status;
      const matchesPriority = priority === "All Priority" || ticket.priority === priority;
      return matchesQuery && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      const left = new Date(a.updatedAt).getTime();
      const right = new Date(b.updatedAt).getTime();
      return sortOrder === "Newest" ? right - left : left - right;
    });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(visibleTickets.length / pageSize));
  const paginatedTickets = visibleTickets.slice((page - 1) * pageSize, page * pageSize);
  const stats = [
    { label: "Total Tickets", value: tickets.length, icon: ClipboardList },
    { label: "Open", value: tickets.filter((ticket) => ticket.status === "Open").length, icon: Ticket },
    { label: "In Progress", value: tickets.filter((ticket) => ticket.status === "In Progress").length, icon: Clock3 },
    { label: "Resolved", value: tickets.filter((ticket) => ticket.status === "Resolved").length, icon: CheckCircle2 },
  ];
  const priorityItems = buildPriorityItems(tickets);
  const categoryItems = buildCategoryItems(tickets);

  useEffect(() => {
    setPage(1);
  }, [query, status, priority, sortOrder]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <PageFrame
      eyebrow="Support Engineer Dashboard"
      title="Engineer Analytics"
      description="Track assigned and available tickets, monitor status, and jump into support work quickly."
      visual="/visuals/support-engineer-3d.svg"
    >
      <section className="engineer-analytics">
        <div className="engineer-stat-grid">
          {stats.map(({ label, value, icon: Icon }) => (
            <article className="card engineer-stat-card" key={label}>
              <span>
                <Icon size={22} />
              </span>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            </article>
          ))}
        </div>
        <div className="two-column engineer-overview-grid">
          <ReportCard title="Priority overview" visual="/visuals/admin-priority-chart-3d.svg" items={priorityItems} />
          <ReportCard title="Category overview" visual="/visuals/admin-status-chart-3d.svg" items={categoryItems} />
        </div>
        <div className="card engineer-toolbar">
          <label className="engineer-search">
            <Search size={18} />
            <input placeholder="Search ticket..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value as TicketStatus | "All Status")}>
            <option>All Status</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>
          <select value={priority} onChange={(event) => setPriority(event.target.value as Priority | "All Priority")}>
            <option>All Priority</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "Newest" | "Oldest")}>
            <option>Newest</option>
            <option>Oldest</option>
          </select>
        </div>
        <div className="card engineer-table-card">
          {visibleTickets.length > 0 ? (
            <>
              <table className="engineer-dashboard-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Issue</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created On</th>
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{ticket.id}</td>
                      <td>{ticket.issueTitle}</td>
                      <td>{teamCategory(ticket.team)}</td>
                      <td><span className={`pill ${priorityTone[ticket.priority]}`}>{ticket.priority}</span></td>
                      <td><span className={`pill ${statusTone[ticket.status]}`}>{ticket.status}</span></td>
                      <td><DashboardDate value={ticket.createdAt} /></td>
                      <td><DashboardDate value={ticket.updatedAt} /></td>
                      <td>
                        <button className="button table-action" onClick={() => navigateTo(`/tickets/${ticket.id}`)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationControls
                page={page}
                totalPages={totalPages}
                totalItems={visibleTickets.length}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </>
          ) : (
            <EmptyState title="No tickets match" body="Adjust the search or filters to review available support tickets." />
          )}
        </div>
      </section>
    </PageFrame>
  );
}

function EngineerDashboard({ ctx }: { ctx: AppContext }) {
  const ticket = ctx.selectedEngineerTicket;
  const [engineerRemarks, setEngineerRemarks] = useState("");
  const engineerOptions = Array.from(new Set(["Unassigned", ctx.currentEngineer.name, "Priya Nair", "Rohan Iyer"]));
  const history = ticket ? ctx.resolutionHistory.filter((record) => record.ticketId === ticket.id) : [];
  const actionRemark = (fallback: string) => engineerRemarks.trim() || fallback;
  const updateTicketWithRemark = (patch: Partial<TicketRecord>, fallback: string) => {
    if (!ticket) return;
    ctx.updateTicket(ticket.id, patch, actionRemark(fallback));
    setEngineerRemarks("");
  };
  return (
    <PageFrame
      eyebrow="Support Engineer Dashboard"
      title="Manage Tickets"
      description="View issue details, AI context, priority, status, assignment, and resolution workflow."
      visual="/visuals/support-engineer-3d.svg"
    >
      <div className="dashboard-grid">
        <section className="card list-panel engineer-ticket-list">
          <h3>Tickets list</h3>
          {ctx.engineerTickets.map((item) => (
            <button
              key={item.id}
              className={ticket?.id === item.id ? "active row-button engineer-ticket-row" : "row-button engineer-ticket-row"}
              onClick={() => ctx.setSelectedEngineerTicketId(item.id)}
            >
              <span className="engineer-ticket-main">
                <strong>{item.id}</strong>
                <small>{item.issueTitle}</small>
              </span>
              <span className="engineer-ticket-meta">
                <span className={`pill ${statusTone[item.status]}`}>{item.status}</span>
              </span>
            </button>
          ))}
        </section>
        {ticket && (
          <section className="card manage-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Ticket details</span>
                <h3>{ticket.issueTitle}</h3>
              </div>
              <span className={`pill ${priorityTone[ticket.priority]}`}>{ticket.priority}</span>
            </div>
            <p>{ticket.issue}</p>
            <div className="ai-box">
              <strong>AI suggestion</strong>
              <p>{ticket.aiSuggestion}</p>
            </div>
            <div className="inline-fields">
              <label>
                Assigned engineer
                <select
                  value={ticket.assignedTo}
                  onChange={(event) =>
                    ctx.updateTicket(ticket.id, { assignedTo: event.target.value }, `Assigned engineer updated to ${event.target.value}.`)
                  }
                >
                  {engineerOptions.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={ticket.status}
                  onChange={(event) =>
                    ctx.updateTicket(ticket.id, { status: event.target.value as TicketStatus }, `Status updated to ${event.target.value}.`)
                  }
                >
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
              </label>
            </div>
            <label>
              Resolution notes
              <textarea value={ticket.resolution} onChange={(event) => ctx.updateTicket(ticket.id, { resolution: event.target.value })} />
            </label>
            <label>
              Engineer remarks
              <textarea
                value={engineerRemarks}
                placeholder="Add internal remarks before assigning, resolving, or closing this ticket."
                onChange={(event) => setEngineerRemarks(event.target.value)}
              />
            </label>
            <div className="button-row">
              <button
                className="button secondary"
                onClick={() => updateTicketWithRemark({ assignedTo: ctx.currentEngineer.name, status: "In Progress" }, "Ticket assigned and moved to In Progress.")}
              >
                <UserCog size={18} />
                Assign ticket
              </button>
              <button
                className="button success"
                onClick={() =>
                  updateTicketWithRemark(
                    { assignedTo: ctx.currentEngineer.name, status: "Resolved", resolution: ticket.resolution || "Resolved by support engineer." },
                    "Ticket resolved by support engineer.",
                  )
                }
              >
                <CheckCircle2 size={18} />
                Resolve ticket
              </button>
              <button
                className="button neutral"
                onClick={() => updateTicketWithRemark({ status: "Closed", resolution: ticket.resolution || "Ticket closed after validation." }, "Ticket closed after validation.")}
              >
                Close ticket
              </button>
            </div>
            <ResolutionHistoryPanel history={history} compact />
          </section>
        )}
      </div>
    </PageFrame>
  );
}

function teamCategory(team: string) {
  if (/network/i.test(team)) return "Network";
  if (/access/i.test(team)) return "Access";
  if (/hardware|endpoint/i.test(team)) return "Hardware";
  if (/software|application/i.test(team)) return "Software";
  if (/it support|email|mail/i.test(team)) return "Email";
  return "General";
}

function buildPriorityItems(tickets: TicketRecord[]) {
  return (["Critical", "High", "Medium", "Low"] as Priority[]).map((priority) => ({
    label: priority,
    value: tickets.filter((ticket) => ticket.priority === priority).length,
  }));
}

function buildCategoryItems(tickets: TicketRecord[]) {
  const categories = Array.from(new Set(["Network", "Email", "Access", "Hardware", "Software", "General", ...tickets.map((ticket) => teamCategory(ticket.team))]));
  return categories.map((category) => ({
    label: category,
    value: tickets.filter((ticket) => teamCategory(ticket.team) === category).length,
  }));
}

function buildResolutionTrendItems(history: TicketResolutionHistory[]) {
  const completedHistory = history.filter((record) => ["Resolved", "Closed"].includes(record.newStatus));
  const now = Date.now();
  const inDays = (days: number) =>
    completedHistory.filter((record) => {
      const createdAt = new Date(record.createdAt).getTime();
      return Number.isFinite(createdAt) && now - createdAt <= days * 24 * 60 * 60 * 1000;
    }).length;
  return [
    { label: "Today", value: inDays(1) },
    { label: "Last 7 days", value: inDays(7) },
    { label: "Last 30 days", value: inDays(30) },
    { label: "All resolved updates", value: completedHistory.length },
  ];
}

function buildEngineerPerformanceItems(tickets: TicketRecord[], history: TicketResolutionHistory[]) {
  const engineerNames = Array.from(
    new Set([
      ...tickets.map((ticket) => ticket.assignedTo).filter((name) => name && name !== "Unassigned"),
      ...history.map((record) => record.engineerName).filter(Boolean),
    ]),
  );
  const items = engineerNames.map((name) => ({
    label: name,
    value:
      tickets.filter((ticket) => ticket.assignedTo === name && ["Resolved", "Closed"].includes(ticket.status)).length +
      history.filter((record) => record.engineerName === name && ["Resolved", "Closed"].includes(record.newStatus)).length,
  }));
  return items.length > 0 ? items : [{ label: "No completed work", value: 0 }];
}

function DashboardDate({ value }: { value: string }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return <span className="date-stack"><strong>{value}</strong></span>;
  }
  return (
    <span className="date-stack">
      <strong>{date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</strong>
      <small>{date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</small>
    </span>
  );
}

function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const rangeText = totalItems === 0 ? "No records" : `Showing ${start}-${end} of ${totalItems}`;

  return (
    <div className="pagination">
      <span>{rangeText}</span>
      <div>
        <button disabled={page === 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft size={18} />
        </button>
        {pages.map((item) => (
          <button key={item} className={item === page ? "active" : ""} onClick={() => onPageChange(item)}>
            {item}
          </button>
        ))}
        <button disabled={page === totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function AdminDashboard({ ctx }: { ctx: AppContext }) {
  return (
    <PageFrame
      eyebrow="Admin Dashboard"
      title="System analytics and operational control"
      description="A focused admin panel for users, engineers, tickets, status, priority, and support performance."
      visual="/visuals/admin-control-3d.svg"
    >
      <MetricGrid metrics={ctx.metrics} />
      <AnalyticsPage tickets={ctx.tickets} metrics={ctx.metrics} resolutionHistory={ctx.resolutionHistory} dataSource={ctx.dataSource} embedded />
      <div className="two-column">
        <PeoplePanel title="Users list" people={ctx.users} />
        <EngineerPanel engineers={ctx.engineers} />
      </div>
    </PageFrame>
  );
}

function KnowledgeBaseManagementPage({ ctx }: { ctx: AppContext }) {
  return (
    <PageFrame eyebrow="Knowledge Base Management" title="Manage Knowledge Base" description="Admin-only management for issue names, keywords, and solutions.">
      <div className="kb-manage-layout">
        <section className="card form-card kb-entry-form">
          <div className="panel-visual-heading">
            <div>
              <span className="eyebrow">{ctx.kbForm.id ? "Edit entry" : "New entry"}</span>
              <h3>{ctx.kbForm.id ? "Update knowledge article" : "Add knowledge article"}</h3>
            </div>
            <img src="/visuals/knowledge-base-3d.svg" alt="" />
          </div>
          <div className="kb-form-fields">
            <label>
              Add issue
              <input value={ctx.kbForm.title} onChange={(event) => ctx.setKbForm({ ...ctx.kbForm, title: event.target.value })} />
            </label>
            <label>
              Category
              <select value={ctx.kbForm.category} onChange={(event) => ctx.setKbForm({ ...ctx.kbForm, category: event.target.value })}>
                {knowledgeCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Add keywords
              <input value={ctx.kbForm.keywords} onChange={(event) => ctx.setKbForm({ ...ctx.kbForm, keywords: event.target.value })} />
            </label>
            <label className="wide">
              Add solution
              <textarea value={ctx.kbForm.solution} onChange={(event) => ctx.setKbForm({ ...ctx.kbForm, solution: event.target.value })} />
            </label>
          </div>
          <div className="button-row">
            <button className="button primary" onClick={ctx.saveKbEntry}>
              <BookOpen size={18} />
              {ctx.kbForm.id ? "Update entry" : "Add entry"}
            </button>
            <button className="button neutral" onClick={() => ctx.setKbForm({ id: "", title: "", category: "General", keywords: "", solution: "" })}>
              New entry
            </button>
          </div>
        </section>
        <section className="card list-panel kb-entry-list">
          <div className="panel-visual-heading">
            <h3>View all KB entries</h3>
            <img src="/visuals/admin-status-chart-3d.svg" alt="" />
          </div>
          <div className="kb-entry-list-head">
            <span>Issue</span>
            <span>Keywords</span>
            <span>Actions</span>
          </div>
          <div className="kb-entry-list-body">
            {ctx.kbEntries.map((entry) => (
              <article className="kb-management-row" key={entry.id}>
                <div>
                  <strong>{entry.title}</strong>
                  <small>{entry.category}</small>
                </div>
                <small>{entry.keywords.join(", ")}</small>
                <div className="row-actions">
                  <button className="icon-button" onClick={() => ctx.editKbEntry(entry)} aria-label={`Edit ${entry.title}`}>
                    <Edit3 size={16} />
                  </button>
                  <button className="icon-button danger" onClick={() => ctx.deleteKbEntry(entry.id)} aria-label={`Delete ${entry.title}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageFrame>
  );
}

function AdminUsersPage({ users, engineers }: { users: AppContext["users"]; engineers: AppContext["engineers"] }) {
  return (
    <PageFrame eyebrow="Users" title="Users and support engineers" description="Admin view of identities and support staff activity.">
      <div className="two-column">
        <PeoplePanel title="All users" people={users} />
        <EngineerPanel engineers={engineers} />
      </div>
    </PageFrame>
  );
}

function AdminTicketsPage({ tickets }: { tickets: TicketRecord[] }) {
  return (
    <PageFrame eyebrow="Tickets" title="All tickets" description="Admin ticket table for monitoring status, priority, assignment, and timestamps.">
      <TicketTable tickets={tickets} showUser />
    </PageFrame>
  );
}

function AnalyticsPage({
  tickets,
  metrics,
  resolutionHistory = [],
  dataSource = "Demo data",
  embedded = false,
}: {
  tickets: TicketRecord[];
  metrics: AppContext["metrics"];
  resolutionHistory?: TicketResolutionHistory[];
  dataSource?: string;
  embedded?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TicketStatus | "All Status">("All Status");
  const [priority, setPriority] = useState<Priority | "All Priority">("All Priority");
  const [sortOrder, setSortOrder] = useState<"Newest" | "Oldest">("Newest");
  const [page, setPage] = useState(1);
  const statusItems = (["Open", "In Progress", "Resolved", "Closed"] as TicketStatus[]).map((status) => ({
    label: status,
    value: tickets.filter((ticket) => ticket.status === status).length,
  }));
  const priorityItems = buildPriorityItems(tickets);
  const categoryItems = buildCategoryItems(tickets);
  const resolutionItems = buildResolutionTrendItems(resolutionHistory);
  const engineerItems = buildEngineerPerformanceItems(tickets, resolutionHistory);
  const visibleTickets = tickets
    .filter((ticket) => {
      const searchText = `${ticket.id} ${ticket.user} ${ticket.email} ${ticket.issueTitle} ${ticket.issue} ${ticket.priority} ${ticket.status} ${ticket.team} ${ticket.assignedTo}`.toLowerCase();
      const matchesQuery = searchText.includes(query.trim().toLowerCase());
      const matchesStatus = status === "All Status" || ticket.status === status;
      const matchesPriority = priority === "All Priority" || ticket.priority === priority;
      return matchesQuery && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      const left = new Date(a.updatedAt).getTime();
      const right = new Date(b.updatedAt).getTime();
      return sortOrder === "Newest" ? right - left : left - right;
    });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(visibleTickets.length / pageSize));
  const paginatedTickets = visibleTickets.slice((page - 1) * pageSize, page * pageSize);
  const activeTickets = tickets.filter((ticket) => ["Open", "In Progress"].includes(ticket.status)).length;
  const completedTickets = tickets.filter((ticket) => ["Resolved", "Closed"].includes(ticket.status)).length;
  const highRiskTickets = tickets.filter((ticket) => ["High", "Critical"].includes(ticket.priority)).length;
  const closureRate = tickets.length ? Math.round((completedTickets / tickets.length) * 100) : 0;
  const reportHighlights = [
    { label: "Active workload", value: String(activeTickets), note: "Open and in-progress tickets" },
    { label: "Completion rate", value: `${closureRate}%`, note: "Resolved or closed tickets" },
    { label: "High-risk queue", value: String(highRiskTickets), note: "High and critical priority" },
    { label: "Realtime status", value: dataSource.includes("Supabase") ? "Live" : "Local", note: dataSource },
  ];

  useEffect(() => {
    setPage(1);
  }, [query, status, priority, sortOrder]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const content = (
    <>
      {!embedded && <MetricGrid metrics={metrics} />}
      <section className="analytics-summary-grid">
        {reportHighlights.map((item) => (
          <article className="card analytics-summary-card" key={item.label}>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            <span>{item.note}</span>
          </article>
        ))}
      </section>
      <div className="two-column">
        <ReportCard title="Tickets by status" visual="/visuals/admin-status-chart-3d.svg" items={statusItems} />
        <ReportCard title="Tickets by priority" visual="/visuals/admin-priority-chart-3d.svg" items={priorityItems} />
      </div>
      <div className="two-column">
        <ReportCard title="Category-wise analysis" visual="/visuals/admin-users-list-3d.svg" items={categoryItems} />
        <ReportCard title="Resolution trends" visual="/visuals/admin-resolved-3d.svg" items={resolutionItems} />
      </div>
      <ReportCard title="Engineer performance metrics" visual="/visuals/admin-engineers-list-3d.svg" items={engineerItems} />
      <section className="card analytics-report-table">
        <div className="panel-visual-heading compact">
          <div>
            <span className="eyebrow">Reports</span>
            <h3>Ticket analytics report</h3>
          </div>
          <img src="/visuals/admin-tickets-3d.svg" alt="" />
        </div>
        <div className="card engineer-toolbar analytics-toolbar">
          <label className="engineer-search">
            <Search size={18} />
            <input placeholder="Search reports by ticket, user, issue, team..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value as TicketStatus | "All Status")}>
            <option>All Status</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>
          <select value={priority} onChange={(event) => setPriority(event.target.value as Priority | "All Priority")}>
            <option>All Priority</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "Newest" | "Oldest")}>
            <option>Newest</option>
            <option>Oldest</option>
          </select>
        </div>
        {visibleTickets.length > 0 ? (
          <>
            <table className="engineer-dashboard-table analytics-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>User</th>
                  <th>Issue</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Engineer</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{ticket.id}</td>
                    <td>
                      <span className="analytics-user-cell">
                        <strong>{ticket.user}</strong>
                        <small>{ticket.email}</small>
                      </span>
                    </td>
                    <td>{ticket.issueTitle}</td>
                    <td>{teamCategory(ticket.team)}</td>
                    <td><span className={`pill ${priorityTone[ticket.priority]}`}>{ticket.priority}</span></td>
                    <td><span className={`pill ${statusTone[ticket.status]}`}>{ticket.status}</span></td>
                    <td>{ticket.assignedTo}</td>
                    <td><DashboardDate value={ticket.updatedAt} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls
              page={page}
              totalPages={totalPages}
              totalItems={visibleTickets.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState title="No report rows found" body="Adjust the search or filters to review ticket analytics." />
        )}
      </section>
    </>
  );
  if (embedded) return <section className="analytics-block">{content}</section>;
  return (
    <PageFrame eyebrow="Analytics" title="Ticket statistics and reports" description="Operational reporting for ticket status, priority, and workload.">
      {content}
    </PageFrame>
  );
}

function AccessPage({ session, notFound = false }: { session: AuthSession | null; notFound?: boolean }) {
  return (
    <section className="access-page">
      <div className="card access-card">
        <ShieldCheck size={34} />
        <h1>{notFound ? "Page unavailable" : "Login required"}</h1>
        <p>
          {notFound
            ? "This page does not exist or your current role cannot access it."
            : "This area is protected. Sign in with the correct role to continue."}
        </p>
        <button className="button primary" onClick={() => navigateTo(session ? "/" : "/login")}>
          {session ? "Go home" : "Login"}
        </button>
      </div>
    </section>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="auth-page">
      <div className="auth-art">
        <span className="badge">
          <ShieldCheck size={16} />
          Protected access
        </span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <img className="auth-3d" src="/visuals/dashboard-3d.svg" alt="" />
      </div>
      <div className="auth-card card">{children}</div>
    </section>
  );
}

function PageFrame({
  eyebrow,
  title,
  description,
  visual,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  visual?: string;
  children: ReactNode;
}) {
  return (
    <section className="page-frame">
      <div className={visual ? "page-heading-shell has-art" : "page-heading-shell"}>
        <div className="page-heading">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {visual && <img className="page-heading-art" src={visual} alt="" />}
      </div>
      {children}
    </section>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-title">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  );
}

function FeatureCard({ icon: Icon, image, title, body }: { icon: typeof Bot; image?: string; title: string; body: string }) {
  return (
    <article className="card feature-card">
      {image ? <img className="feature-3d" src={image} alt="" /> : (
        <span className="icon-wrap">
          <Icon size={22} />
        </span>
      )}
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function WorkflowCard({ image, step, title, body }: { image?: string; step: string; title: string; body: string }) {
  return (
    <article className="card workflow-card">
      {image && <img className="workflow-3d" src={image} alt="" />}
      <span>{step}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function FaqSection() {
  const faqs = [
    {
      question: "How does Imdad AI help users?",
      answer: "It checks known solutions first, then provides AI troubleshooting guidance for unresolved issues.",
    },
    {
      question: "When is a support ticket created?",
      answer: "A ticket is created when the user chooses human support after the AI or Knowledge Base suggestion.",
    },
    {
      question: "Who can manage tickets?",
      answer: "Support engineers manage assigned or available tickets, while admins monitor the full system.",
    },
    {
      question: "Can users see other users' tickets?",
      answer: "No. User pages show only the signed-in user's tickets, ticket details, and chat history.",
    },
  ];

  return (
    <section className="page-section faq-section compact-section">
      <div className="faq-visual" aria-hidden="true">
        <img src="/visuals/faq-support-3d.svg" alt="" />
      </div>
      <div className="faq-content">
        <span className="eyebrow">Support</span>
        <h2>Frequently asked questions</h2>
        <div className="faq-list">
          {faqs.map((item) => (
            <details key={item.question} className="faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function TicketTable({ tickets, showUser }: { tickets: TicketRecord[]; showUser: boolean }) {
  if (tickets.length === 0) return <EmptyState title="No tickets found" body="There are no tickets available for this view." />;
  return (
    <div className="table-wrap card">
      <table>
        <thead>
          <tr>
            <th>Ticket ID</th>
            {showUser && <th>User</th>}
            <th>Issue title</th>
            <th>Priority</th>
            <th>Assigned team</th>
            <th>Status</th>
            <th>Created date</th>
            <th>Updated date</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td>{ticket.id}</td>
              {showUser && <td>{ticket.user}</td>}
              <td>{ticket.issueTitle}</td>
              <td><span className={`pill ${priorityTone[ticket.priority]}`}>{ticket.priority}</span></td>
              <td>{ticket.team}</td>
              <td><span className={`pill ${statusTone[ticket.status]}`}>{ticket.status}</span></td>
              <td>{formatDate(ticket.createdAt)}</td>
              <td>{formatDate(ticket.updatedAt)}</td>
              <td>
                <button className="icon-button" onClick={() => navigateTo(`/tickets/${ticket.id}`)} aria-label={`View ${ticket.id}`}>
                  <Eye size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserTicketList({ tickets }: { tickets: TicketRecord[] }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const paginatedTickets = tickets.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (tickets.length === 0) return <NoUserTickets />;
  return (
    <div className="card ticket-list-shell">
      <section className="user-ticket-list">
        <div className="user-ticket-list-head">
          <span>Ticket ID</span>
          <span>Issue title</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {paginatedTickets.map((ticket) => (
          <article className="user-ticket-row" key={ticket.id}>
            <div className="user-ticket-id">
              <strong>{ticket.id}</strong>
            </div>
            <div className="user-ticket-title">
              <strong>{ticket.issueTitle}</strong>
            </div>
            <div className="user-ticket-priority">
              <strong className={`pill ${priorityTone[ticket.priority]}`}>{ticket.priority}</strong>
            </div>
            <div className="user-ticket-status">
              <strong className={`pill ${statusTone[ticket.status]}`}>{ticket.status}</strong>
            </div>
            <button className="button secondary" onClick={() => navigateTo(`/tickets/${ticket.id}`)}>
              View Detail
            </button>
          </article>
        ))}
      </section>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={tickets.length}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}

function NoUserTickets() {
  return (
    <section className="card user-tickets-empty">
      <div>
        <span className="eyebrow">No tickets</span>
        <h3>No support tickets yet</h3>
        <p>Raise a support request and it will appear here with its ticket ID, priority, status, and details.</p>
        <button className="button primary" onClick={() => navigateTo("/raise-ticket")}>
          Raise Ticket
        </button>
      </div>
      <img src="/visuals/ticket-3d.svg" alt="" />
    </section>
  );
}

function TicketSummary({ ticket }: { ticket: TicketRecord }) {
  return (
    <article className="ticket-summary">
      <div className="ticket-summary-head">
        <div>
          <span className="eyebrow">{ticket.id}</span>
          <h3>{ticket.issueTitle}</h3>
        </div>
        <img src="/visuals/ticket-3d.svg" alt="" />
      </div>
      <p>{ticket.issue}</p>
      <div className="ticket-summary-meta">
        <span>Priority <strong>{ticket.priority}</strong></span>
        <span>Team <strong>{ticket.team}</strong></span>
        <span>Status <strong>{ticket.status}</strong></span>
      </div>
      <div className="ticket-summary-actions">
        <button className="button secondary" onClick={() => navigateTo("/my-tickets")}>View All Tickets</button>
        <button className="button primary" onClick={() => navigateTo(`/tickets/${ticket.id}`)}>View Details</button>
      </div>
    </article>
  );
}

function NoAddedTicket() {
  return (
    <article className="no-ticket-preview">
      <div>
        <h3>No ticket added yet</h3>
        <p>Create a support request and your latest ticket will appear here for quick review.</p>
      </div>
      <img src="/visuals/ticket-3d.svg" alt="" />
    </article>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "detail-item wide" : "detail-item"}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ResolutionHistoryPanel({ history, compact = false }: { history: TicketResolutionHistory[]; compact?: boolean }) {
  return (
    <section className={compact ? "card resolution-history compact" : "card resolution-history"}>
      <div className="panel-visual-heading">
        <div>
          <span className="eyebrow">Resolution history</span>
          <h3>Engineer updates</h3>
        </div>
        <img src="/visuals/admin-resolved-3d.svg" alt="" />
      </div>
      {history.length > 0 ? (
        <div className="resolution-history-list">
          {history.map((record) => (
            <article className="resolution-history-row" key={record.id}>
              <div>
                <strong>{record.engineerName}</strong>
                <small>{formatDate(record.createdAt)}</small>
              </div>
              <div>
                <span className={`pill ${statusTone[record.newStatus]}`}>{record.previousStatus ? `${record.previousStatus} to ${record.newStatus}` : record.newStatus}</span>
                <p>{record.remarks || "No remarks added."}</p>
                {record.resolutionNotes && <small>Resolution: {record.resolutionNotes}</small>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-copy">No resolution history has been recorded for this ticket yet.</p>
      )}
    </section>
  );
}

function MetricGrid({ metrics }: { metrics: AppContext["metrics"] }) {
  return (
    <div className="metric-grid">
      <MetricCard visual="/visuals/admin-users-3d.svg" value={String(metrics.users)} label="Total users" />
      <MetricCard visual="/visuals/admin-engineers-3d.svg" value={String(metrics.engineers)} label="Support engineers" />
      <MetricCard visual="/visuals/admin-tickets-3d.svg" value={String(metrics.totalTickets)} label="Total tickets" />
      <MetricCard visual="/visuals/admin-open-3d.svg" value={String(metrics.open)} label="Open tickets" />
      <MetricCard visual="/visuals/admin-resolved-3d.svg" value={String(metrics.resolved)} label="Resolved tickets" />
      <MetricCard visual="/visuals/admin-priority-3d.svg" value={String(metrics.high)} label="High priority tickets" />
    </div>
  );
}

function MetricCard({ visual, value, label }: { visual: string; value: string; label: string }) {
  return (
    <article className="card metric-card">
      <img src={visual} alt="" />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function ReportCard({ title, visual, items }: { title: string; visual: string; items: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <section className="card report-card">
      <div className="panel-visual-heading">
        <h3>{title}</h3>
        <img src={visual} alt="" />
      </div>
      <div className="report-bars">
        {items.map((item) => (
          <div className="bar-row" key={item.label}>
            <span>{item.label}</span>
            <div><i style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} /></div>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function PeoplePanel({ title, people }: { title: string; people: AppContext["users"] }) {
  return (
    <section className="card list-panel admin-list-panel">
      <div className="panel-visual-heading">
        <h3>{title}</h3>
        <img src="/visuals/admin-users-list-3d.svg" alt="" />
      </div>
      <div className="admin-person-list">
        {people.map((person) => (
          <article className="person-row" key={person.email}>
            <div className="avatar">{person.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{person.name}</strong>
              <small>{person.email}</small>
              <small>{person.department}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EngineerPanel({ engineers }: { engineers: AppContext["engineers"] }) {
  return (
    <section className="card list-panel admin-list-panel">
      <div className="panel-visual-heading">
        <h3>Engineers list</h3>
        <img src="/visuals/admin-engineers-list-3d.svg" alt="" />
      </div>
      <div className="admin-person-list">
        {engineers.map((engineer) => (
          <article className="person-row" key={engineer.email}>
            <div className="avatar">{engineer.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{engineer.name}</strong>
              <small>{engineer.email}</small>
              <small>{engineer.status} - {engineer.assigned} assigned</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card empty-state">
      <ClipboardList size={28} />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-showcase">
        <div className="footer-brand">
          <button className="brand" onClick={() => navigateTo("/")}>
            <img className="brand-mark" src="/brand/imdad-ai-mark.png" alt="" />
            <span className="brand-wordmark">
              Imdad <span>AI</span>
            </span>
          </button>
          <p>Smart AI-powered support ticket system for users, engineers, and admins.</p>
        </div>
        <img className="footer-3d" src="/visuals/footer-support-3d.svg" alt="" />
        <div className="footer-copyright-panel">
          <p>
            Copyright 2026 Imdad AI.
            <br />
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default App;
