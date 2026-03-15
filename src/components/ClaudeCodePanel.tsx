import { useState, useEffect, useRef, useCallback } from 'react';
import {
  runClaudeCodeAdvanced,
  getClaudeCodeVersion,
  readClaudeAgentFiles,
  writeClaudeAgentFile,
  deleteClaudeAgentFile,
  isElectron,
  type ClaudeCodeAdvancedOptions,
  type ClaudeCodeEvent,
  type ClaudeCodeStreamCallbacks,
  type AgentFileInfo,
  type SubagentDef,
} from '../lib/terminal';

// ─── Types ────────────────────────────────────────────────────────

interface SessionMessage {
  id: string;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system' | 'error';
  content: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  isError?: boolean;
  timestamp: number;
}

interface SessionInfo {
  id?: string;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
}

type SubTab = 'chat' | 'subagents' | 'teams' | 'settings';

// ─── Subagent Editor ──────────────────────────────────────────────

function SubagentEditor({
  agentFiles,
  workspace,
  onRefresh,
}: {
  agentFiles: AgentFileInfo[];
  workspace: string;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<AgentFileInfo | null>(null);
  const [newAgent, setNewAgent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    tools: '',
    model: 'inherit',
    permissionMode: 'default',
    maxTurns: '',
    memory: '',
    background: false,
    isolation: '',
    prompt: '',
    scope: 'project' as 'user' | 'project',
  });

  function parseAgentFile(content: string) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { frontmatter: {}, body: content };
    try {
      // Simple YAML parsing for the fields we care about
      const lines = match[1].split('\n');
      const fm: Record<string, string> = {};
      for (const line of lines) {
        const [key, ...rest] = line.split(':');
        if (key && rest.length) fm[key.trim()] = rest.join(':').trim();
      }
      return { frontmatter: fm, body: match[2] };
    } catch {
      return { frontmatter: {}, body: content };
    }
  }

  function handleEdit(agent: AgentFileInfo) {
    const { frontmatter: fm, body } = parseAgentFile(agent.content);
    setForm({
      name: fm.name || agent.file.replace('.md', ''),
      description: fm.description || '',
      tools: fm.tools || '',
      model: fm.model || 'inherit',
      permissionMode: fm.permissionMode || 'default',
      maxTurns: fm.maxTurns || '',
      memory: fm.memory || '',
      background: fm.background === 'true',
      isolation: fm.isolation || '',
      prompt: body.trim(),
      scope: agent.scope,
    });
    setEditing(agent);
    setNewAgent(false);
  }

  function handleNew() {
    setForm({
      name: '',
      description: '',
      tools: '',
      model: 'sonnet',
      permissionMode: 'default',
      maxTurns: '',
      memory: '',
      background: false,
      isolation: '',
      prompt: '',
      scope: 'project',
    });
    setEditing(null);
    setNewAgent(true);
  }

  async function handleSave() {
    const lines = ['---'];
    lines.push(`name: ${form.name}`);
    lines.push(`description: ${form.description}`);
    if (form.tools) lines.push(`tools: ${form.tools}`);
    if (form.model && form.model !== 'inherit') lines.push(`model: ${form.model}`);
    if (form.permissionMode && form.permissionMode !== 'default') lines.push(`permissionMode: ${form.permissionMode}`);
    if (form.maxTurns) lines.push(`maxTurns: ${form.maxTurns}`);
    if (form.memory) lines.push(`memory: ${form.memory}`);
    if (form.background) lines.push(`background: true`);
    if (form.isolation) lines.push(`isolation: ${form.isolation}`);
    lines.push('---');
    lines.push('');
    lines.push(form.prompt);

    const content = lines.join('\n');
    const fileName = `${form.name.replace(/[^a-z0-9-]/g, '-')}.md`;

    let filePath: string;
    if (editing) {
      filePath = editing.path;
    } else {
      const base = form.scope === 'user'
        ? `${getHomePath()}/.claude/agents`
        : `${workspace}/.claude/agents`;
      filePath = `${base}/${fileName}`;
    }

    await writeClaudeAgentFile(filePath, content);
    setEditing(null);
    setNewAgent(false);
    onRefresh();
  }

  async function handleDelete(agent: AgentFileInfo) {
    if (!confirm(`Delete subagent "${agent.file}"?`)) return;
    await deleteClaudeAgentFile(agent.path);
    onRefresh();
  }

  if (newAgent || editing) {
    return (
      <div className="p-3 space-y-3 overflow-y-auto h-full">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-pixel text-indigo-300">
            {editing ? 'Edit Subagent' : 'New Subagent'}
          </h3>
          <button onClick={() => { setEditing(null); setNewAgent(false); }} className="text-xs text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <label className="block">
          <span className="text-[10px] font-pixel text-slate-400">Name</span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="my-agent"
          />
        </label>

        <label className="block">
          <span className="text-[10px] font-pixel text-slate-400">Description (when Claude should use this agent)</span>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="Expert code reviewer. Use proactively after code changes."
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] font-pixel text-slate-400">Model</span>
            <select
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
            >
              <option value="inherit">Inherit</option>
              <option value="sonnet">Sonnet</option>
              <option value="opus">Opus</option>
              <option value="haiku">Haiku</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-pixel text-slate-400">Permission Mode</span>
            <select
              value={form.permissionMode}
              onChange={(e) => setForm({ ...form, permissionMode: e.target.value })}
              className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
            >
              <option value="default">Default</option>
              <option value="acceptEdits">Accept Edits</option>
              <option value="dontAsk">Don't Ask</option>
              <option value="plan">Plan (read-only)</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-[10px] font-pixel text-slate-400">Tools (comma-separated, e.g. Read, Grep, Glob, Bash)</span>
          <input
            value={form.tools}
            onChange={(e) => setForm({ ...form, tools: e.target.value })}
            className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="Read, Grep, Glob, Bash, Edit, Write"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] font-pixel text-slate-400">Max Turns</span>
            <input
              value={form.maxTurns}
              onChange={(e) => setForm({ ...form, maxTurns: e.target.value })}
              className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="(unlimited)"
              type="number"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-pixel text-slate-400">Memory Scope</span>
            <select
              value={form.memory}
              onChange={(e) => setForm({ ...form, memory: e.target.value })}
              className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
            >
              <option value="">None</option>
              <option value="user">User (all projects)</option>
              <option value="project">Project</option>
              <option value="local">Local</option>
            </select>
          </label>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-[10px] font-pixel text-slate-400">
            <input
              type="checkbox"
              checked={form.background}
              onChange={(e) => setForm({ ...form, background: e.target.checked })}
              className="accent-indigo-500"
            />
            Background
          </label>
          <label className="flex items-center gap-1.5 text-[10px] font-pixel text-slate-400">
            <input
              type="checkbox"
              checked={form.isolation === 'worktree'}
              onChange={(e) => setForm({ ...form, isolation: e.target.checked ? 'worktree' : '' })}
              className="accent-indigo-500"
            />
            Git Worktree Isolation
          </label>
        </div>

        {!editing && (
          <label className="block">
            <span className="text-[10px] font-pixel text-slate-400">Scope</span>
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value as 'user' | 'project' })}
              className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
            >
              <option value="project">Project (.claude/agents/)</option>
              <option value="user">User (~/.claude/agents/)</option>
            </select>
          </label>
        )}

        <label className="block">
          <span className="text-[10px] font-pixel text-slate-400">System Prompt</span>
          <textarea
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white font-mono h-32 resize-y"
            placeholder="You are a code reviewer. When invoked, analyze the code..."
          />
        </label>

        <button
          onClick={handleSave}
          disabled={!form.name || !form.description}
          className="w-full btn-pixel text-[10px] bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40"
        >
          {editing ? 'Update Subagent' : 'Create Subagent'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-pixel text-indigo-300">Subagents</h3>
        <button onClick={handleNew} className="btn-pixel text-[10px] bg-indigo-700 hover:bg-indigo-600 px-2 py-0.5">
          + New
        </button>
      </div>

      <div className="space-y-1">
        {/* Built-in subagents */}
        <div className="text-[10px] font-pixel text-slate-500 mt-2">Built-in</div>
        {['Explore', 'Plan', 'General-purpose'].map((name) => (
          <div key={name} className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/50">
            <span className="text-[10px]">🔒</span>
            <span className="text-xs text-slate-300">{name}</span>
            <span className="text-[10px] text-slate-500 ml-auto">built-in</span>
          </div>
        ))}

        {agentFiles.length > 0 && (
          <div className="text-[10px] font-pixel text-slate-500 mt-3">Custom</div>
        )}
        {agentFiles.map((agent) => {
          const { frontmatter: fm } = parseSimpleFrontmatter(agent.content);
          return (
            <div key={agent.path} className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/50 group">
              <span className="text-[10px]">🤖</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">{fm.name || agent.file.replace('.md', '')}</div>
                <div className="text-[10px] text-slate-500 truncate">{fm.description || ''}</div>
              </div>
              <span className="text-[10px] text-slate-600">{agent.scope}</span>
              <button
                onClick={() => handleEdit(agent)}
                className="text-[10px] text-slate-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100"
              >
                ✎
              </button>
              <button
                onClick={() => handleDelete(agent)}
                className="text-[10px] text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-slate-500 mt-4 leading-relaxed">
        Subagents are specialized AI assistants that Claude delegates to automatically.
        Create them here or use <code className="text-indigo-400">/agents</code> in the Claude Code CLI.
      </div>
    </div>
  );
}

function parseSimpleFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };
  const lines = match[1].split('\n');
  const fm: Record<string, string> = {};
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx > 0) fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { frontmatter: fm, body: match[2] };
}

function getHomePath(): string {
  // In Electron context, process.env.HOME is available
  return (window as unknown as { process?: { env?: { HOME?: string } } }).process?.env?.HOME || '~';
}

// ─── Agent Teams Panel ────────────────────────────────────────────

function AgentTeamsPanel({
  onSendMessage,
  isRunning,
}: {
  onSendMessage: (text: string, opts?: Partial<ClaudeCodeAdvancedOptions>) => void;
  isRunning: boolean;
}) {
  const [teamPrompt, setTeamPrompt] = useState('');

  function handleStartTeam() {
    if (!teamPrompt.trim()) return;
    onSendMessage(teamPrompt, {
      enableAgentTeams: true,
      teammateMode: 'in-process',
    });
    setTeamPrompt('');
  }

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full">
      <h3 className="text-xs font-pixel text-indigo-300">Agent Teams</h3>

      <div className="p-2 rounded bg-amber-900/30 border border-amber-700/50">
        <p className="text-[10px] text-amber-300 font-pixel">⚠ Experimental</p>
        <p className="text-[10px] text-amber-200/70 mt-1">
          Agent teams coordinate multiple Claude Code instances working in parallel.
          Each teammate has its own context window and they communicate via shared task lists and messaging.
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-pixel text-slate-400">Quick Templates</div>

        <button
          onClick={() => setTeamPrompt('Create an agent team to review the codebase from different angles: one focused on security, one on performance, and one on code quality.')}
          className="w-full text-left px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition-colors"
        >
          <div className="text-[10px] text-indigo-300">🔍 Parallel Code Review</div>
          <div className="text-[10px] text-slate-500">Security + Performance + Quality</div>
        </button>

        <button
          onClick={() => setTeamPrompt('Spawn an agent team to investigate the bug. Have teammates test different hypotheses and debate their findings.')}
          className="w-full text-left px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition-colors"
        >
          <div className="text-[10px] text-indigo-300">🐛 Competing Hypotheses Debug</div>
          <div className="text-[10px] text-slate-500">Multiple investigators debate root cause</div>
        </button>

        <button
          onClick={() => setTeamPrompt('Create an agent team with 3 teammates to build this feature in parallel. One for the backend, one for the frontend, and one for tests.')}
          className="w-full text-left px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition-colors"
        >
          <div className="text-[10px] text-indigo-300">🏗️ Parallel Feature Build</div>
          <div className="text-[10px] text-slate-500">Backend + Frontend + Tests</div>
        </button>

        <button
          onClick={() => setTeamPrompt('Create an agent team to research and document this codebase. One teammate explores architecture, one maps dependencies, and one documents the API surface.')}
          className="w-full text-left px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition-colors"
        >
          <div className="text-[10px] text-indigo-300">📚 Research & Document</div>
          <div className="text-[10px] text-slate-500">Architecture + Dependencies + API</div>
        </button>
      </div>

      <div className="mt-4">
        <label className="text-[10px] font-pixel text-slate-400 block mb-1">Team Task Description</label>
        <textarea
          value={teamPrompt}
          onChange={(e) => setTeamPrompt(e.target.value)}
          className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-600 rounded text-white font-mono h-24 resize-y"
          placeholder="Describe the task and the team structure you want..."
        />
        <button
          onClick={handleStartTeam}
          disabled={!teamPrompt.trim() || isRunning}
          className="w-full mt-2 btn-pixel text-[10px] bg-purple-700 hover:bg-purple-600 disabled:opacity-40"
        >
          {isRunning ? 'Team Running…' : '🚀 Launch Agent Team'}
        </button>
      </div>

      <div className="text-[10px] text-slate-500 mt-4 leading-relaxed space-y-1">
        <p><strong className="text-slate-400">How it works:</strong></p>
        <p>• A lead agent creates the team and manages a shared task list</p>
        <p>• Teammates work independently, each in their own context</p>
        <p>• Teammates can message each other directly</p>
        <p>• Uses more tokens but enables real collaboration</p>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────

function SettingsPanel({
  settings,
  onChange,
  version,
}: {
  settings: SessionSettings;
  onChange: (s: SessionSettings) => void;
  version: string | null;
}) {
  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full">
      <h3 className="text-xs font-pixel text-indigo-300">Claude Code Settings</h3>

      {version && (
        <div className="text-[10px] text-slate-500">
          Claude Code CLI: <span className="text-emerald-400">{version}</span>
        </div>
      )}

      <label className="block">
        <span className="text-[10px] font-pixel text-slate-400">Model</span>
        <select
          value={settings.model}
          onChange={(e) => onChange({ ...settings, model: e.target.value })}
          className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
        >
          <option value="">Default</option>
          <option value="sonnet">Claude Sonnet</option>
          <option value="opus">Claude Opus</option>
          <option value="haiku">Claude Haiku</option>
        </select>
      </label>

      <label className="block">
        <span className="text-[10px] font-pixel text-slate-400">Permission Mode</span>
        <select
          value={settings.permissionMode}
          onChange={(e) => onChange({ ...settings, permissionMode: e.target.value })}
          className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
        >
          <option value="default">Default (ask for permissions)</option>
          <option value="acceptEdits">Accept Edits (auto-approve file edits)</option>
          <option value="plan">Plan Mode (read-only exploration)</option>
        </select>
      </label>

      <label className="block">
        <span className="text-[10px] font-pixel text-slate-400">Allowed Tools (comma-separated, empty = all)</span>
        <input
          value={settings.allowedTools}
          onChange={(e) => onChange({ ...settings, allowedTools: e.target.value })}
          className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
          placeholder="Bash,Read,Edit,Write,Grep,Glob"
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-pixel text-slate-400">Max Turns (0 = unlimited)</span>
        <input
          type="number"
          value={settings.maxTurns}
          onChange={(e) => onChange({ ...settings, maxTurns: Number(e.target.value) })}
          className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-pixel text-slate-400">Max Budget (USD, 0 = unlimited)</span>
        <input
          type="number"
          step="0.10"
          value={settings.maxBudget}
          onChange={(e) => onChange({ ...settings, maxBudget: Number(e.target.value) })}
          className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-pixel text-slate-400">Append System Prompt</span>
        <textarea
          value={settings.appendSystemPrompt}
          onChange={(e) => onChange({ ...settings, appendSystemPrompt: e.target.value })}
          className="w-full mt-1 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white font-mono h-20 resize-y"
          placeholder="Additional instructions appended to the default Claude Code prompt..."
        />
      </label>

      <div className="text-[10px] text-slate-500 mt-4 leading-relaxed">
        <p><strong className="text-slate-400">Available Claude Code tools:</strong></p>
        <p className="mt-1 font-mono text-slate-600">
          Agent, Bash, Read, Write, Edit, Grep, Glob, WebFetch, WebSearch, LSP, Skill, TodoWrite
        </p>
      </div>
    </div>
  );
}

// ─── Session Settings ─────────────────────────────────────────────

interface SessionSettings {
  model: string;
  permissionMode: string;
  allowedTools: string;
  maxTurns: number;
  maxBudget: number;
  appendSystemPrompt: string;
}

const DEFAULT_SETTINGS: SessionSettings = {
  model: '',
  permissionMode: 'default',
  allowedTools: '',
  maxTurns: 0,
  maxBudget: 0,
  appendSystemPrompt: '',
};

// ─── Main Component ───────────────────────────────────────────────

export default function ClaudeCodePanel({ workspace }: { workspace: string }) {
  const [subTab, setSubTab] = useState<SubTab>('chat');
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({});
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS);
  const [version, setVersion] = useState<string | null>(null);
  const [agentFiles, setAgentFiles] = useState<AgentFileInfo[]>([]);
  const [stderrLog, setStderrLog] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Check for Claude CLI on mount
  useEffect(() => {
    getClaudeCodeVersion().then(setVersion);
    refreshAgentFiles();
  }, [workspace]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const refreshAgentFiles = useCallback(async () => {
    const files = await readClaudeAgentFiles(workspace);
    setAgentFiles(files);
  }, [workspace]);

  const addMessage = useCallback((msg: Omit<SessionMessage, 'id' | 'timestamp'>) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: Date.now() },
    ]);
  }, []);

  const sendMessage = useCallback(async (text: string, extraOpts?: Partial<ClaudeCodeAdvancedOptions>) => {
    if (!text.trim() || isRunning) return;

    addMessage({ type: 'user', content: text });
    setIsRunning(true);
    setStderrLog([]);

    const controller = new AbortController();
    abortRef.current = controller;

    // Build options from settings + overrides
    const options: ClaudeCodeAdvancedOptions = {
      prompt: text,
      cwd: workspace,
      outputFormat: 'stream-json',
      verbose: true,
      ...extraOpts,
    };

    if (settings.model) options.model = settings.model;
    if (settings.permissionMode !== 'default') options.permissionMode = settings.permissionMode as ClaudeCodeAdvancedOptions['permissionMode'];
    if (settings.allowedTools) options.allowedTools = settings.allowedTools.split(',').map((t) => t.trim()).filter(Boolean);
    if (settings.maxTurns > 0) options.maxTurns = settings.maxTurns;
    if (settings.maxBudget > 0) options.maxBudget = settings.maxBudget;
    if (settings.appendSystemPrompt) options.appendSystemPrompt = settings.appendSystemPrompt;

    // Continue session if we have one
    if (sessionInfo.id && !extraOpts?.resumeSessionId) {
      options.continueSession = true;
    }

    // Accumulate assistant text for the current response
    let currentAssistantText = '';
    let assistantMsgId: string | null = null;

    const callbacks: ClaudeCodeStreamCallbacks = {
      onTextDelta: (text) => {
        currentAssistantText += text;
        setMessages((prev) => {
          if (assistantMsgId) {
            return prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: currentAssistantText } : m,
            );
          } else {
            const newId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            assistantMsgId = newId;
            return [
              ...prev,
              { id: newId, type: 'assistant' as const, content: currentAssistantText, timestamp: Date.now() },
            ];
          }
        });
      },
      onToolUse: (name, input) => {
        addMessage({
          type: 'tool_use',
          content: `Using tool: ${name}`,
          toolName: name,
          toolInput: input,
        });
      },
      onToolResult: (content, isError) => {
        addMessage({
          type: 'tool_result',
          content: content.slice(0, 500) + (content.length > 500 ? '…' : ''),
          isError,
        });
      },
      onEvent: (event) => {
        // Handle specific event types for richer display
        if (event.type === 'system') {
          addMessage({ type: 'system', content: event.subtype || 'System event' });
        }
      },
      onStderr: (text) => {
        setStderrLog((prev) => [...prev, text]);
      },
    };

    try {
      const result = await runClaudeCodeAdvanced(options, callbacks, controller.signal);
      setSessionInfo({
        id: result.sessionId,
        cost: result.cost,
        inputTokens: result.usage?.input_tokens,
        outputTokens: result.usage?.output_tokens,
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        addMessage({ type: 'error', content: (err as Error).message });
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, [isRunning, workspace, settings, sessionInfo.id, addMessage]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  }

  function handleAbort() {
    abortRef.current?.abort();
    setIsRunning(false);
  }

  function handleClearSession() {
    setMessages([]);
    setSessionInfo({});
    setStderrLog([]);
  }

  if (!isElectron()) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-xs font-pixel text-slate-400 mt-2">
          Claude Code mode requires the Electron desktop app.
        </p>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-2xl mb-2">⚡</div>
        <p className="text-xs font-pixel text-slate-400">
          Claude Code CLI not detected.
        </p>
        <p className="text-[10px] text-slate-500 mt-2">
          Install it with: <code className="text-indigo-400">curl -fsSL https://claude.ai/install.sh | bash</code>
        </p>
        <button
          onClick={() => getClaudeCodeVersion().then(setVersion)}
          className="mt-3 btn-pixel text-[10px] bg-indigo-700 hover:bg-indigo-600 px-3 py-1"
        >
          Retry Detection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex border-b border-gray-800 shrink-0">
        {(['chat', 'subagents', 'teams', 'settings'] as SubTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`flex-1 py-1.5 text-[10px] font-pixel leading-relaxed transition-colors ${
              subTab === tab
                ? 'text-white border-b-2 border-purple-500 bg-gray-800'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'chat' ? '💬 Chat' : tab === 'subagents' ? '🤖 Agents' : tab === 'teams' ? '👥 Teams' : '⚙ Config'}
          </button>
        ))}
      </div>

      {/* Session bar */}
      {subTab === 'chat' && (
        <div className="flex items-center gap-2 px-3 py-1 border-b border-slate-800 text-[10px] shrink-0">
          <span className="text-slate-500 font-pixel">Session:</span>
          {sessionInfo.id ? (
            <>
              <span className="text-indigo-400 font-mono">{sessionInfo.id.slice(0, 8)}…</span>
              {sessionInfo.cost !== undefined && (
                <span className="text-emerald-500">${sessionInfo.cost.toFixed(4)}</span>
              )}
              {sessionInfo.inputTokens !== undefined && (
                <span className="text-slate-600">
                  {sessionInfo.inputTokens.toLocaleString()}↓ {sessionInfo.outputTokens?.toLocaleString()}↑
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-600">New session</span>
          )}
          <div className="flex-1" />
          <button
            onClick={handleClearSession}
            className="text-slate-500 hover:text-red-400 transition-colors"
            title="Clear session"
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {subTab === 'chat' ? (
          <div className="flex flex-col h-full">
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">⚡</div>
                  <p className="text-xs font-pixel text-slate-400">Claude Code</p>
                  <p className="text-[10px] text-slate-600 mt-1 max-w-xs mx-auto">
                    Full-featured Claude Code frontend with subagents, agent teams, tool visibility, and session management.
                  </p>
                  <div className="mt-4 space-y-1">
                    {[
                      'Explain this project and suggest improvements',
                      'Find and fix the bug in the auth module',
                      'Use the Explore subagent to map this codebase',
                      'Create a PR for the changes you just made',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => { setInput(suggestion); }}
                        className="block mx-auto text-[10px] text-indigo-400/70 hover:text-indigo-300 transition-colors"
                      >
                        → {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {isRunning && (
                <div className="flex items-center gap-2 text-[10px] text-purple-400 font-pixel">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  Claude Code is working…
                </div>
              )}
            </div>

            {/* Stderr log (collapsible) */}
            {stderrLog.length > 0 && (
              <details className="px-3 border-t border-slate-800">
                <summary className="text-[10px] text-slate-600 cursor-pointer py-1">
                  stderr ({stderrLog.length} messages)
                </summary>
                <pre className="text-[10px] text-red-400/60 font-mono max-h-20 overflow-y-auto whitespace-pre-wrap">
                  {stderrLog.join('')}
                </pre>
              </details>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-2 border-t border-slate-800 shrink-0">
              <div className="flex gap-1.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isRunning ? 'Claude Code is working…' : 'Message Claude Code…'}
                  disabled={isRunning}
                  className="flex-1 px-2 py-1.5 text-xs bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 disabled:opacity-50"
                  autoFocus
                />
                {isRunning ? (
                  <button
                    type="button"
                    onClick={handleAbort}
                    className="btn-pixel text-[10px] bg-red-700 hover:bg-red-600 px-2"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="btn-pixel text-[10px] bg-purple-700 hover:bg-purple-600 disabled:opacity-40 px-2"
                  >
                    Send
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : subTab === 'subagents' ? (
          <SubagentEditor agentFiles={agentFiles} workspace={workspace} onRefresh={refreshAgentFiles} />
        ) : subTab === 'teams' ? (
          <AgentTeamsPanel onSendMessage={sendMessage} isRunning={isRunning} />
        ) : (
          <SettingsPanel settings={settings} onChange={setSettings} version={version} />
        )}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────

function MessageBubble({ message }: { message: SessionMessage }) {
  const { type, content, toolName, toolInput, isError } = message;

  if (type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3 py-1.5 rounded-lg bg-purple-900/50 border border-purple-700/30 text-xs text-white whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  if (type === 'tool_use') {
    return (
      <div className="flex items-start gap-2 px-2 py-1 rounded bg-slate-800/50 border-l-2 border-amber-500/50">
        <span className="text-[10px] text-amber-400 font-pixel shrink-0">🔧 {toolName}</span>
        {toolInput && Object.keys(toolInput).length > 0 && (
          <details className="text-[10px]">
            <summary className="text-slate-500 cursor-pointer">args</summary>
            <pre className="text-slate-600 font-mono mt-1 overflow-x-auto max-w-full">
              {JSON.stringify(toolInput, null, 2).slice(0, 300)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (type === 'tool_result') {
    return (
      <div className={`px-2 py-1 rounded text-[10px] font-mono ${isError ? 'bg-red-900/20 text-red-400/80' : 'bg-slate-800/30 text-slate-500'} border-l-2 ${isError ? 'border-red-500/30' : 'border-slate-700/30'}`}>
        {content}
      </div>
    );
  }

  if (type === 'system') {
    return (
      <div className="text-center text-[10px] text-slate-600 font-pixel py-0.5">
        — {content} —
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="px-3 py-1.5 rounded bg-red-900/20 border border-red-700/30 text-xs text-red-400">
        ❌ {content}
      </div>
    );
  }

  // assistant
  return (
    <div className="max-w-[95%]">
      <div className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/30 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}
