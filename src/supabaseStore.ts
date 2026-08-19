import { supabase } from "./supabaseClient";

export type Priority = "Low" | "Medium" | "High" | "Critical";
export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
export type AccountRole = "User" | "Support Engineer" | "Admin";

export type UserAccountRecord = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  employeeId: string;
  department: string;
  passwordHash: string;
  createdAt: string;
};

export type TicketRecord = {
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

export type KnowledgeRecord = {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  solution: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatRecordShape = {
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

export type ResolutionHistoryRecord = {
  id: string;
  ticketId: string;
  engineerName: string;
  engineerEmail: string;
  previousStatus: TicketStatus | "";
  newStatus: TicketStatus;
  remarks: string;
  resolutionNotes: string;
  createdAt: string;
};

type TicketRow = {
  id: number;
  ticket_id: string;
  user_id: string | null;
  user_name: string;
  user_email: string;
  issue_title: string | null;
  issue_description: string;
  ai_suggestion: string;
  priority: Priority;
  assigned_team: string;
  assigned_engineer: string | null;
  assigned_engineer_name?: string | null;
  status: TicketStatus | "Assigned";
  resolution: string | null;
  created_at: string;
  updated_at: string;
};

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: AccountRole;
  employee_id: string | null;
  department: string | null;
  password_hash?: string | null;
  created_at: string;
};

type KnowledgeRow = {
  id: number;
  issue_name: string;
  keywords: string[] | null;
  solution: string;
  created_at: string;
  updated_at: string;
};

type ChatRow = {
  id: number;
  user_id: string | null;
  user_name: string;
  user_email: string;
  issue: string;
  ai_response: string;
  source: "Knowledge Base" | "AI Assistant";
  result: string;
  ticket_id: string | null;
  created_at: string;
};

type ResolutionHistoryRow = {
  id: number;
  ticket_id: string;
  engineer_name: string;
  engineer_email: string;
  previous_status: TicketStatus | null;
  new_status: TicketStatus;
  remarks: string | null;
  resolution_notes: string | null;
  created_at: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const engineerIdByName: Record<string, string> = {
  "Priya Nair": "33333333-3333-4333-8333-333333333333",
  "Rohan Iyer": "55555555-5555-4555-8555-555555555555",
};
const engineerNameById = Object.fromEntries(Object.entries(engineerIdByName).map(([name, id]) => [id, name]));

const toIso = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const ticketFromRow = (row: TicketRow): TicketRecord => ({
  id: row.ticket_id,
  userId: row.user_id ?? "",
  user: row.user_name,
  email: row.user_email,
  issueTitle: row.issue_title || row.issue_description.slice(0, 90),
  issue: row.issue_description || row.issue_title || "",
  aiSuggestion: row.ai_suggestion,
  priority: row.priority,
  team: row.assigned_team,
  status: row.status === "Assigned" ? "In Progress" : row.status,
  assignedTo: row.assigned_engineer_name ?? engineerNameById[row.assigned_engineer ?? ""] ?? row.assigned_engineer ?? "Unassigned",
  resolution: row.resolution ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const userFromRow = (row: UserRow): UserAccountRecord => ({
  id: row.id,
  name: row.full_name,
  email: row.email.toLowerCase(),
  role: row.role,
  employeeId: row.employee_id ?? "",
  department: row.department ?? "",
  passwordHash: row.password_hash ?? "",
  createdAt: row.created_at,
});

const ticketToRow = (
  ticket: TicketRecord,
  options: { includeEngineerName?: boolean; includeUserId?: boolean; includeAssignedEngineer?: boolean } = {},
) => {
  const { includeEngineerName = true, includeUserId = true, includeAssignedEngineer = true } = options;
  const row = {
    ticket_id: ticket.id,
    user_id: includeUserId && uuidPattern.test(ticket.userId) ? ticket.userId : null,
    user_name: ticket.user,
    user_email: ticket.email,
    issue_title: ticket.issueTitle,
    issue_description: ticket.issue,
    ai_suggestion: ticket.aiSuggestion,
    priority: ticket.priority,
    assigned_team: ticket.team,
    assigned_engineer: includeAssignedEngineer
      ? uuidPattern.test(ticket.assignedTo)
        ? ticket.assignedTo
        : engineerIdByName[ticket.assignedTo] ?? null
      : null,
    status: ticket.status,
    resolution: ticket.resolution,
    created_at: toIso(ticket.createdAt),
    updated_at: toIso(ticket.updatedAt),
  };
  return includeEngineerName ? { ...row, assigned_engineer_name: ticket.assignedTo } : row;
};

const missingAssignedEngineerName = (error: { code?: string; message?: string } | null) =>
  error?.code === "42703" || /assigned_engineer_name/i.test(error?.message ?? "");

const missingPasswordHash = (error: { code?: string; message?: string } | null) =>
  error?.code === "PGRST204" && /password_hash/i.test(error?.message ?? "");

const missingUserReference = (error: { code?: string; message?: string } | null) =>
  error?.code === "23503" && /user_id|users|foreign key/i.test(error?.message ?? "");

const missingEngineerReference = (error: { code?: string; message?: string } | null) =>
  error?.code === "23503" && /assigned_engineer|foreign key/i.test(error?.message ?? "");

const userToRow = (account: UserAccountRecord, includePasswordHash = true) => {
  const row = {
    id: account.id,
    full_name: account.name,
    email: account.email.toLowerCase(),
    role: account.role,
    employee_id: account.employeeId || null,
    department: account.department,
    created_at: toIso(account.createdAt),
  };
  return includePasswordHash ? { ...row, password_hash: account.passwordHash } : row;
};

const knowledgeFromRow = (row: KnowledgeRow): KnowledgeRecord => ({
  id: `KB-${row.id}`,
  title: row.issue_name,
  category: "General",
  keywords: row.keywords ?? [],
  solution: row.solution,
  owner: "Knowledge Base",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const knowledgeToRow = (entry: KnowledgeRecord) => ({
  issue_name: entry.title,
  keywords: entry.keywords,
  solution: entry.solution,
  created_at: toIso(entry.createdAt),
  updated_at: toIso(entry.updatedAt),
});

const chatFromRow = (row: ChatRow): ChatRecordShape => ({
  id: `CHAT-${row.id}`,
  userId: row.user_id ?? "",
  user: row.user_name,
  email: row.user_email,
  issue: row.issue,
  source: row.source,
  suggestion: row.ai_response,
  outcome: row.result,
  ticketId: row.ticket_id,
  createdAt: row.created_at,
});

const resolutionHistoryFromRow = (row: ResolutionHistoryRow): ResolutionHistoryRecord => ({
  id: `HIST-${row.id}`,
  ticketId: row.ticket_id,
  engineerName: row.engineer_name,
  engineerEmail: row.engineer_email,
  previousStatus: row.previous_status ?? "",
  newStatus: row.new_status,
  remarks: row.remarks ?? "",
  resolutionNotes: row.resolution_notes ?? "",
  createdAt: row.created_at,
});

const chatToRow = (record: ChatRecordShape, includeUserId = true) => {
  return {
    user_id: includeUserId && uuidPattern.test(record.userId) ? record.userId : null,
    user_name: record.user,
    user_email: record.email,
    issue: record.issue,
    ai_response: record.suggestion,
    source: record.source,
    result: record.outcome,
    ticket_id: record.ticketId,
    created_at: toIso(record.createdAt),
  };
};

const resolutionHistoryToRow = (record: ResolutionHistoryRecord) => ({
  ticket_id: record.ticketId,
  engineer_name: record.engineerName,
  engineer_email: record.engineerEmail,
  previous_status: record.previousStatus || null,
  new_status: record.newStatus,
  remarks: record.remarks,
  resolution_notes: record.resolutionNotes,
  created_at: toIso(record.createdAt),
});

async function getNextIntegerId(table: "tickets" | "knowledge_base" | "chat_history" | "ticket_resolution_history") {
  if (!supabase) return 1;
  const { data, error } = await supabase.from(table).select("id").order("id", { ascending: false }).limit(1);
  if (error) throw error;
  const lastId = Number(data?.[0]?.id ?? 0);
  return lastId + 1;
}

export async function loadInitialData() {
  if (!supabase) return null;

  const [usersResult, ticketsResult, knowledgeResult, chatResult, historyResult] = await Promise.all([
    supabase.from("users").select("*").order("created_at", { ascending: false }),
    supabase.from("tickets").select("*").order("updated_at", { ascending: false }),
    supabase.from("knowledge_base").select("*").order("updated_at", { ascending: false }),
    supabase.from("chat_history").select("*").order("created_at", { ascending: false }),
    supabase.from("ticket_resolution_history").select("*").order("created_at", { ascending: false }),
  ]);

  if (usersResult.error || ticketsResult.error || knowledgeResult.error || chatResult.error || historyResult.error) {
    throw new Error(
      usersResult.error?.message ??
        ticketsResult.error?.message ??
        knowledgeResult.error?.message ??
        chatResult.error?.message ??
        historyResult.error?.message,
    );
  }

  return {
    accounts: (usersResult.data as UserRow[]).map(userFromRow),
    tickets: (ticketsResult.data as TicketRow[]).map(ticketFromRow),
    kbEntries: (knowledgeResult.data as KnowledgeRow[]).map(knowledgeFromRow),
    chatHistory: (chatResult.data as ChatRow[]).map(chatFromRow),
    resolutionHistory: (historyResult.data as ResolutionHistoryRow[]).map(resolutionHistoryFromRow),
  };
}

export async function persistTicket(ticket: TicketRecord) {
  if (!supabase) return;
  const { data: existing, error: existingError } = await supabase
    .from("tickets")
    .select("id")
    .eq("ticket_id", ticket.id)
    .maybeSingle();
  if (existingError) throw existingError;
  const id = existing?.id ?? (await getNextIntegerId("tickets"));
  let includeEngineerName = true;
  let includeUserId = true;
  let includeAssignedEngineer = true;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const row = { ...ticketToRow(ticket, { includeEngineerName, includeUserId, includeAssignedEngineer }), id };
    const { error } = await supabase.from("tickets").upsert(row, {
      onConflict: "ticket_id",
    });
    if (!error) return;
    if (missingAssignedEngineerName(error) && includeEngineerName) {
      includeEngineerName = false;
      continue;
    }
    if (missingUserReference(error) && includeUserId) {
      includeUserId = false;
      continue;
    }
    if (missingEngineerReference(error) && includeAssignedEngineer) {
      includeAssignedEngineer = false;
      continue;
    }
    throw error;
  }
}

export async function updateStoredTicket(ticket: TicketRecord) {
  if (!supabase) return;
  let includeEngineerName = true;
  let includeUserId = true;
  let includeAssignedEngineer = true;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { error } = await supabase.from("tickets").update(ticketToRow(ticket, { includeEngineerName, includeUserId, includeAssignedEngineer })).eq("ticket_id", ticket.id);
    if (!error) return;
    if (missingAssignedEngineerName(error) && includeEngineerName) {
      includeEngineerName = false;
      continue;
    }
    if (missingUserReference(error) && includeUserId) {
      includeUserId = false;
      continue;
    }
    if (missingEngineerReference(error) && includeAssignedEngineer) {
      includeAssignedEngineer = false;
      continue;
    }
    throw error;
  }
}

export async function persistUserAccount(account: UserAccountRecord) {
  if (!supabase) return;
  const { error } = await supabase.from("users").upsert(userToRow(account), {
    onConflict: "email",
  });
  if (missingPasswordHash(error)) {
    const { error: fallbackError } = await supabase.from("users").upsert(userToRow(account, false), {
      onConflict: "email",
    });
    if (fallbackError) throw fallbackError;
    return;
  }
  if (error) throw error;
}

export async function persistKnowledgeEntry(entry: KnowledgeRecord) {
  if (!supabase) return;
  const { error } = await supabase
    .from("knowledge_base")
    .insert({ ...knowledgeToRow(entry), id: await getNextIntegerId("knowledge_base") });
  if (error) throw error;
}

export async function updateStoredKnowledgeEntry(entry: KnowledgeRecord) {
  if (!supabase) return;
  const numericId = Number(entry.id.replace("KB-", ""));
  if (!Number.isFinite(numericId)) return;
  const { error } = await supabase.from("knowledge_base").update(knowledgeToRow(entry)).eq("id", numericId);
  if (error) throw error;
}

export async function deleteStoredKnowledgeEntry(entryId: string) {
  if (!supabase) return;
  const numericId = Number(entryId.replace("KB-", ""));
  if (!Number.isFinite(numericId)) return;
  const { error } = await supabase.from("knowledge_base").delete().eq("id", numericId);
  if (error) throw error;
}

export async function persistChatRecord(record: ChatRecordShape) {
  if (!supabase) return;
  const id = await getNextIntegerId("chat_history");
  const { error } = await supabase.from("chat_history").insert({ ...chatToRow(record), id });
  if (missingUserReference(error)) {
    const { error: fallbackError } = await supabase.from("chat_history").insert({ ...chatToRow(record, false), id });
    if (fallbackError) throw fallbackError;
    return;
  }
  if (error) throw error;
}

export async function persistResolutionHistory(record: ResolutionHistoryRecord) {
  if (!supabase) return;
  const { error } = await supabase
    .from("ticket_resolution_history")
    .insert({ ...resolutionHistoryToRow(record), id: await getNextIntegerId("ticket_resolution_history") });
  if (error) throw error;
}
