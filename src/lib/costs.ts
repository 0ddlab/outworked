// ─── Cost & Token Tracking ───────────────────────────────────────
//
// Persists cost records to localStorage. Each record captures a single
// Claude Code interaction (one sendMessage or ClaudeCodePanel round-trip).

export interface CostRecord {
  id: string;
  agentId: string;
  agentName: string;
  sessionId?: string;
  timestamp: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

export interface AgentBudget {
  agentId: string;
  dailyLimitUsd?: number;
  totalLimitUsd?: number;
}

export interface CostSummary {
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  recordCount: number;
}

export interface AgentCostSummary extends CostSummary {
  agentId: string;
  agentName: string;
}

export interface DailyCostSummary extends CostSummary {
  date: string; // YYYY-MM-DD
}

// ─── Storage keys ────────────────────────────────────────────────

const LS_RECORDS = 'outworked_cost_records';
const LS_BUDGETS = 'outworked_cost_budgets';

// ─── Helpers ─────────────────────────────────────────────────────

function loadRecords(): CostRecord[] {
  try {
    const raw = localStorage.getItem(LS_RECORDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: CostRecord[]) {
  localStorage.setItem(LS_RECORDS, JSON.stringify(records));
}

function toDateString(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Cumulative → Delta tracking ─────────────────────────────────
// Claude Code's total_cost_usd is cumulative per session. We track the
// last known cumulative value per session so we can record only deltas.

const LS_CUMULATIVE = 'outworked_cost_cumulative';

interface CumulativeState {
  cost: number;
  inputTokens: number;
  outputTokens: number;
}

function loadCumulative(): Record<string, CumulativeState> {
  try {
    const raw = localStorage.getItem(LS_CUMULATIVE);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCumulative(state: Record<string, CumulativeState>) {
  localStorage.setItem(LS_CUMULATIVE, JSON.stringify(state));
}

/**
 * Record a cost from Claude Code's cumulative total_cost_usd.
 * Automatically computes the delta from the last known value for this session.
 * Pass sessionKey to disambiguate sessions (e.g. claude session ID or agent ID).
 */
export function addCumulativeCost(
  agentId: string,
  agentName: string,
  cumulativeCost: number,
  cumulativeInputTokens: number,
  cumulativeOutputTokens: number,
  sessionKey: string,
): CostRecord | null {
  const cum = loadCumulative();
  const prev = cum[sessionKey] || { cost: 0, inputTokens: 0, outputTokens: 0 };

  const deltaCost = Math.max(0, cumulativeCost - prev.cost);
  const deltaInput = Math.max(0, cumulativeInputTokens - prev.inputTokens);
  const deltaOutput = Math.max(0, cumulativeOutputTokens - prev.outputTokens);

  // Update cumulative state
  cum[sessionKey] = { cost: cumulativeCost, inputTokens: cumulativeInputTokens, outputTokens: cumulativeOutputTokens };
  saveCumulative(cum);

  if (deltaCost <= 0 && deltaInput <= 0 && deltaOutput <= 0) return null;

  return addCostRecord(agentId, agentName, deltaCost, deltaInput, deltaOutput, sessionKey);
}

/** Reset cumulative tracking for a session (call when session is cleared). */
export function resetCumulativeSession(sessionKey: string) {
  const cum = loadCumulative();
  delete cum[sessionKey];
  saveCumulative(cum);
}

// ─── Public API ──────────────────────────────────────────────────

let nextId = Date.now();

export function addCostRecord(
  agentId: string,
  agentName: string,
  costUsd: number,
  inputTokens: number,
  outputTokens: number,
  sessionId?: string,
): CostRecord {
  const record: CostRecord = {
    id: String(nextId++),
    agentId,
    agentName,
    sessionId,
    timestamp: Date.now(),
    costUsd,
    inputTokens,
    outputTokens,
  };
  const records = loadRecords();
  records.push(record);
  // Keep max 5000 records to avoid localStorage bloat
  if (records.length > 5000) records.splice(0, records.length - 5000);
  saveRecords(records);
  return record;
}

export function getAllRecords(): CostRecord[] {
  return loadRecords();
}

export function getRecordsByAgent(agentId: string): CostRecord[] {
  return loadRecords().filter((r) => r.agentId === agentId);
}

export function getRecordsSince(sinceMs: number): CostRecord[] {
  return loadRecords().filter((r) => r.timestamp >= sinceMs);
}

// ─── Aggregations ────────────────────────────────────────────────

function summarize(records: CostRecord[]): CostSummary {
  let totalCostUsd = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  for (const r of records) {
    totalCostUsd += r.costUsd;
    totalInputTokens += r.inputTokens;
    totalOutputTokens += r.outputTokens;
  }
  return { totalCostUsd, totalInputTokens, totalOutputTokens, recordCount: records.length };
}

export function getTotalSummary(): CostSummary {
  return summarize(loadRecords());
}

export function getTodaySummary(): CostSummary {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return summarize(getRecordsSince(startOfDay.getTime()));
}

export function getPerAgentSummary(): AgentCostSummary[] {
  const records = loadRecords();
  const byAgent = new Map<string, CostRecord[]>();
  for (const r of records) {
    const arr = byAgent.get(r.agentId) || [];
    arr.push(r);
    byAgent.set(r.agentId, arr);
  }
  const result: AgentCostSummary[] = [];
  for (const [agentId, recs] of byAgent) {
    const s = summarize(recs);
    result.push({ agentId, agentName: recs[0].agentName, ...s });
  }
  result.sort((a, b) => b.totalCostUsd - a.totalCostUsd);
  return result;
}

export function getDailySummaries(days = 7): DailyCostSummary[] {
  const cutoff = Date.now() - days * 86400000;
  const records = loadRecords().filter((r) => r.timestamp >= cutoff);
  const byDay = new Map<string, CostRecord[]>();
  for (const r of records) {
    const d = toDateString(r.timestamp);
    const arr = byDay.get(d) || [];
    arr.push(r);
    byDay.set(d, arr);
  }

  // Fill in missing days
  const result: DailyCostSummary[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = toDateString(d.getTime());
    const recs = byDay.get(key) || [];
    result.push({ date: key, ...summarize(recs) });
  }
  return result;
}

// ─── Budgets ─────────────────────────────────────────────────────

export function loadBudgets(): AgentBudget[] {
  try {
    const raw = localStorage.getItem(LS_BUDGETS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBudgets(budgets: AgentBudget[]) {
  localStorage.setItem(LS_BUDGETS, JSON.stringify(budgets));
}

export function setBudget(agentId: string, dailyLimitUsd?: number, totalLimitUsd?: number) {
  const budgets = loadBudgets().filter((b) => b.agentId !== agentId);
  if (dailyLimitUsd !== undefined || totalLimitUsd !== undefined) {
    budgets.push({ agentId, dailyLimitUsd, totalLimitUsd });
  }
  saveBudgets(budgets);
}

export interface BudgetStatus {
  agentId: string;
  dailySpent: number;
  dailyLimit?: number;
  totalSpent: number;
  totalLimit?: number;
  dailyExceeded: boolean;
  totalExceeded: boolean;
}

export function checkBudget(agentId: string): BudgetStatus {
  const budgets = loadBudgets();
  const budget = budgets.find((b) => b.agentId === agentId);
  const allRecords = getRecordsByAgent(agentId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayRecords = allRecords.filter((r) => r.timestamp >= startOfDay.getTime());

  const dailySpent = todayRecords.reduce((s, r) => s + r.costUsd, 0);
  const totalSpent = allRecords.reduce((s, r) => s + r.costUsd, 0);

  return {
    agentId,
    dailySpent,
    dailyLimit: budget?.dailyLimitUsd,
    totalSpent,
    totalLimit: budget?.totalLimitUsd,
    dailyExceeded: budget?.dailyLimitUsd ? dailySpent >= budget.dailyLimitUsd : false,
    totalExceeded: budget?.totalLimitUsd ? totalSpent >= budget.totalLimitUsd : false,
  };
}

export function clearAllRecords() {
  saveRecords([]);
}
