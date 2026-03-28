# Triggers

Triggers let you wire up events to agents — when something happens, a prompt is automatically sent to an agent. Think of them as "if this, then prompt that."

## Trigger Types

### Message Pattern

Fires when an inbound channel message (Slack, iMessage, etc.) matches a pattern.

- **Match Mode** — controls how the pattern is applied:
  - `contains` (default) — fires if the message contains the text anywhere (case-insensitive)
  - `starts-with` — fires if the message starts with the text
  - `exact` — fires only on an exact match (case-insensitive)
  - `regex` — treats the pattern as a regular expression; capture groups become `$1`, `$2`, etc. in the prompt
- **Pattern** — the text or regex to match against (special characters are auto-escaped for non-regex modes)
- **Channel ID** — scope to a specific channel, or leave blank to match all channels.
- **Sender Allowlist** — comma-separated sender names, or `*` to allow anyone.

For non-regex match modes (`contains`, `starts-with`, `exact`), the original message is automatically appended to the prompt so the agent has full context without needing capture groups.

**Example — keyword trigger (contains mode):**

- Pattern: `deploy`
- Prompt: `Handle this deploy request.`

When someone types "please deploy the api", the agent receives the prompt with the original message appended automatically.

**Example — regex trigger:**

- Pattern: `deploy (.+) to (staging|prod)`
- Prompt: `Deploy the $1 service to $2. Run the deploy script and report back.`

When someone types "deploy api to staging", the agent receives: _"Deploy the api service to staging. Run the deploy script and report back."_

#### Channel Reply Instructions

When a trigger fires from a channel message, reply instructions are automatically prepended to the prompt. These include the sender name, channel ID, and conversation ID so the agent knows where to reply using the `send_message` tool.

## Setting Up a Trigger

### From the UI

1. Click **Triggers** in the left sidebar
2. Click **+ New Trigger**
3. Pick a trigger type (currently message-pattern is available in the UI)
4. Choose a match mode (contains, starts-with, exact, or regex)
5. Fill in the pattern text
6. Optionally scope to a channel or restrict senders
7. Choose which agent should receive the prompt (defaults to the boss agent)
8. Write the prompt template with placeholders
9. Click **Create Trigger**

### From an Agent

Agents can create triggers using the `create_trigger` tool:

```
create_trigger:
  name: "Deploy watcher"
  type: "message-pattern"
  matchMode: "contains"
  pattern: "deploy"
  prompt: "Handle this deploy request."
  agentId: "devops-agent-id"
```

Agents also have `list_triggers`, `update_trigger`, and `delete_trigger` tools for full management.

## Prompt Templates

Templates support two substitution styles:

| Style           | Source                                                 | Example           |
| --------------- | ------------------------------------------------------ | ----------------- |
| `$1`, `$2`, ... | Regex capture groups (message-pattern with regex mode) | `"User said: $1"` |

For non-regex message-pattern triggers, the original message is appended automatically — you don't need placeholders to access the message content.

You can mix plain text with placeholders. Unmatched placeholders are left as-is.

## How It Works

1. An event arrives (channel message, webhook POST, skill event)
2. The trigger engine evaluates it against all **enabled** triggers of that type
3. For message-pattern triggers: the pattern is compiled based on the match mode (`contains` wraps as substring match, `starts-with` anchors to start, `exact` anchors both ends, `regex` uses raw pattern)
4. For message-pattern triggers: **first match wins** (stops after one match)
5. For skill-event triggers: **all matches fire** (multiple agents can respond)
6. The prompt template is resolved with captured values
7. For channel messages: reply instructions (channel ID, sender, conversation ID) are prepended to the prompt
8. For non-regex message-pattern triggers: the original message is appended for context
9. The prompt is sent to the target agent (or the boss if no agent is specified)
10. The agent processes it automatically

## Tips

- **Test before going live** — use the "Test" button in the UI to fire a trigger with sample data
- **Start simple** — use `contains` mode first, then switch to `regex` only when you need capture groups
- **One trigger per concern** — keep triggers focused on a single task. Create multiple triggers instead of one complex one
- **Disable, don't delete** — toggle triggers off when debugging instead of removing them
- **Check fire count** — the trigger list shows how many times each trigger has fired and when, useful for debugging
- **Agent is optional** — if no target agent is selected, the prompt goes to the boss agent by default

<details>
<summary>Developer Notes</summary>

### Webhook

Fires when an external system sends an HTTP POST to the trigger's URL. The JSON body keys become `{{placeholder}}` values in the prompt.

**URL format:** `POST http://127.0.0.1:7891/trigger/<trigger-id>`

**Body size limit:** 10 MB max payload.

**Example:** GitHub push notification:

- Prompt: `New push to {{repository}} on branch {{branch}} by {{pusher}}. Check the CI status.`
- Curl:
  ```bash
  curl -X POST http://127.0.0.1:7891/trigger/trigger-abc123 \
    -H "Content-Type: application/json" \
    -d '{"repository": "outworked", "branch": "main", "pusher": "georges"}'
  ```

The webhook server only listens on `127.0.0.1` (localhost) — it is never exposed to the network. To receive external webhooks, use a tunnel (the agent has a `tunnel_start` tool) or forward from a service like Zapier or n8n.

### Skill Event

Fires when an internal skill emits a named event. Multiple triggers can listen to the same event type.

- **Pattern** — the exact event type name (e.g. `scheduler:task_fired`).

This is how scheduled tasks connect to agents — the Scheduler skill emits `scheduler:task_fired`, and a skill-event trigger catches it and routes the prompt.

### Schedule

For time-based triggers, use the **Scheduler skill** instead of creating a schedule-type trigger directly. The Scheduler skill provides cron, interval, and one-time scheduling with a full management UI.

### Via Webhook (external)

After creating a webhook trigger (via UI or agent), any system can fire it:

```bash
curl -X POST http://127.0.0.1:7891/trigger/<id> \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

An empty body is fine if your prompt doesn't use placeholders.

## Prompt Templates

Templates support two substitution styles:

| Style           | Source                                                 | Example                        |
| --------------- | ------------------------------------------------------ | ------------------------------ |
| `$1`, `$2`, ... | Regex capture groups (message-pattern with regex mode) | `"User said: $1"`              |
| `{{key}}`       | JSON body (webhook) or event data (skill-event)        | `"Deploy {{repo}} to {{env}}"` |

For non-regex message-pattern triggers, the original message is appended automatically — you don't need placeholders to access the message content.

You can mix plain text with placeholders. Unmatched placeholders are left as-is.

## Tips

- **Test before going live** — use the "Test" button in the UI to fire a trigger with sample data
- **Start simple** — use `contains` mode first, then switch to `regex` only when you need capture groups
- **One trigger per concern** — keep triggers focused on a single task. Create multiple triggers instead of one complex one
- **Webhook + Zapier/n8n** — forward external events (GitHub, Linear, Stripe, etc.) to the local webhook URL for powerful automations
- **Chain triggers** — a skill-event trigger can respond to events emitted by the Scheduler, creating cron-driven agent workflows
- **Disable, don't delete** — toggle triggers off when debugging instead of removing them
- **Check fire count** — the trigger list shows how many times each trigger has fired and when, useful for debugging
- **Agent is optional** — if no target agent is selected, the prompt goes to the boss agent by default

</details>
