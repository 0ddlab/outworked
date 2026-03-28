// ─── Trigger Engine ──────────────────────────────────────────────
// Main-process singleton that evaluates inbound events (channel messages,
// skill events, webhooks) against enabled triggers and fires matched ones
// by sending a 'trigger:fire' IPC event to the renderer.

const db = require('../db/database');

class TriggerEngine {
  constructor() {
    this.mainWindow = null;
    /** @type {Map<string, RegExp>} triggerId -> compiled RegExp */
    this._compiledPatterns = new Map();
  }

  /**
   * Attach the main BrowserWindow so trigger:fire events can be sent.
   * @param {Electron.BrowserWindow} mainWindow
   */
  setWindow(mainWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * Convert a user-friendly pattern + match mode into a regex string.
   * @param {string} pattern - The user's input (keyword, phrase, or raw regex)
   * @param {string} matchMode - 'contains' | 'starts-with' | 'exact' | 'regex'
   * @returns {string} A regex pattern string
   */
  _buildRegex(pattern, matchMode) {
    if (matchMode === 'regex') return pattern;
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    switch (matchMode) {
      case 'starts-with': return `^${escaped}`;
      case 'exact': return `^${escaped}$`;
      case 'contains':
      default: return escaped;
    }
  }

  /**
   * (Re-)compile regex patterns for all enabled message-pattern triggers.
   * Call this after triggers are created, updated, or deleted.
   */
  refreshPatterns() {
    this._compiledPatterns.clear();
    const triggers = db.triggerList();
    for (const t of triggers) {
      if (t.pattern && t.enabled) {
        try {
          const regexStr = this._buildRegex(t.pattern, t.matchMode || 'contains');
          this._compiledPatterns.set(t.id, new RegExp(regexStr, 'i'));
        } catch (err) {
          console.warn(
            `[TriggerEngine] Skipping trigger "${t.name}" (${t.id}): invalid pattern "${t.pattern}" — ${err.message}`,
          );
        }
      }
    }
  }

  /**
   * Evaluate a channel message against all enabled message-pattern triggers.
   * Fires the first matching trigger and returns true; returns false if none matched.
   *
   * @param {{ channelId: string, sender?: string, content: string }} message
   * @returns {boolean}
   */
  evaluateMessage(message) {
    const triggers = db.triggerList().filter(
      (t) => t.enabled && t.type === 'message-pattern',
    );

    for (const trigger of triggers) {
      // Channel filter — skip if the trigger is scoped to a different channel
      if (trigger.channelId && trigger.channelId !== message.channelId) continue;

      // Sender allowlist — '*' is a wildcard that permits any sender
      if (
        trigger.senderAllowlist?.length > 0 &&
        !trigger.senderAllowlist.includes('*') &&
        !trigger.senderAllowlist.includes(message.sender)
      ) {
        continue;
      }

      // Pattern match
      const regex = this._compiledPatterns.get(trigger.id);
      if (!regex) continue;

      const match = message.content.match(regex);
      if (match) {
        this.fireTrigger(trigger, message, match);
        return true; // first match wins
      }
    }

    return false;
  }

  /**
   * Evaluate a skill event against all enabled skill-event triggers.
   * Fires every matching trigger (multiple can listen to the same event type).
   *
   * @param {{ type: string, data: Record<string, unknown> }} event
   */
  evaluateSkillEvent(event) {
    const triggers = db.triggerList().filter(
      (t) => t.enabled && t.type === 'skill-event' && t.pattern === event.type,
    );

    for (const trigger of triggers) {
      this.fireTrigger(trigger, event.data, null);
    }
  }

  /**
   * Evaluate an inbound webhook request for a specific trigger ID.
   * Returns true if the trigger was found and fired, false otherwise.
   *
   * @param {string} triggerId
   * @param {Record<string, unknown>} body - Parsed JSON body from the request
   * @returns {boolean}
   */
  evaluateWebhook(triggerId, body) {
    const trigger = db.triggerGet(triggerId);
    if (!trigger || !trigger.enabled || trigger.type !== 'webhook') return false;
    this.fireTrigger(trigger, body, null);
    return true;
  }

  /**
   * Resolve the trigger's prompt template and send 'trigger:fire' to the renderer.
   *
   * Template substitution supports:
   *   - Regex capture groups: $1, $2, …  (when regexMatch is provided)
   *   - Named placeholders: {{key}}       (replaced with matching keys from context)
   *
   * @param {import('../../src/lib/types').Trigger} trigger
   * @param {Record<string, unknown> | null} context
   * @param {RegExpMatchArray | null} regexMatch
   */
  fireTrigger(trigger, context, regexMatch) {
    let prompt = trigger.prompt;

    // Substitute regex capture groups ($1, $2, …)
    if (regexMatch) {
      for (let i = 1; i < regexMatch.length; i++) {
        prompt = prompt.replace(
          new RegExp(`\\$${i}`, 'g'),
          regexMatch[i] ?? '',
        );
      }
    } else if (trigger.type === 'message-pattern' && trigger.pattern) {
      // No regex match provided (e.g. test fire) — run the pattern against
      // context.content so $1/$2 placeholders still get substituted.
      try {
        const re = new RegExp(trigger.pattern, 'i');
        const fallback = context?.content ? String(context.content).match(re) : null;
        if (fallback) {
          for (let i = 1; i < fallback.length; i++) {
            prompt = prompt.replace(
              new RegExp(`\\$${i}`, 'g'),
              fallback[i] ?? '',
            );
          }
        }
      } catch { /* invalid pattern — leave placeholders as-is */ }
    }

    // Substitute named placeholders ({{key}})
    if (context && typeof context === 'object') {
      for (const [key, val] of Object.entries(context)) {
        prompt = prompt.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          String(val),
        );
      }
    }

    // For non-regex message-pattern triggers, append the original message
    // so the agent has the full context without needing capture groups.
    if (
      trigger.type === 'message-pattern' &&
      trigger.matchMode !== 'regex' &&
      context?.content
    ) {
      prompt +=
        `\n\nOriginal message from ${context.sender || 'unknown'}:\n` +
        String(context.content);
    }

    // If this trigger fired from a channel message, prepend reply instructions
    // so the agent knows which channel/conversation to reply to.
    if (context && context.channelId) {
      const replyInstructions =
        `## Channel Reply Instructions\n` +
        `This trigger fired from a channel message.\n` +
        `From: ${context.sender || 'unknown'}\n` +
        `Channel: ${context.channelId}\n` +
        `Conversation: ${context.conversationId || context.sender || 'unknown'}\n\n` +
        `You MUST reply using the send_message tool with channelId="${context.channelId}" and conversationId="${context.conversationId || context.sender}".\n` +
        `Send a SINGLE reply message. Only send a preliminary confirmation followed by a detailed reply if the task requires significant work.\n\n`;
      prompt = replyInstructions + prompt;
    }

    // Persist the fire event in the DB counter
    db.triggerIncrementCount(trigger.id);

    // Notify the renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('trigger:fire', {
        triggerId: trigger.id,
        triggerName: trigger.name,
        agentId: trigger.agentId,
        prompt,
        context,
      });
    }
  }

  /**
   * Register IPC handlers that belong to the trigger engine.
   * Call this once from main.js during app initialisation.
   *
   * @param {Electron.IpcMain} ipcMain
   */
  setupTriggerIPC(ipcMain) {
    // Allow the renderer (or devtools) to test-fire a trigger by ID
    ipcMain.handle('trigger:test', (_event, triggerId) => {
      const trigger = db.triggerGet(triggerId);
      if (!trigger) return { ok: false, error: 'Trigger not found' };
      this.fireTrigger(trigger, { content: 'Test message', sender: 'test' }, null);
      return { ok: true };
    });
  }
}

module.exports = new TriggerEngine(); // singleton
