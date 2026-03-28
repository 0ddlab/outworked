#!/usr/bin/env node
// ─── Trigger Engine & Webhook Server — Standalone Tests ───────────
// Run: node electron/triggers/test-triggers.js
// No dependencies needed beyond Node.js stdlib + the trigger files.

const http = require('http');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`);
  }
}

function assertEq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failed++;
    console.log(`  ✗ ${label}`);
    console.log(`    expected: ${JSON.stringify(expected)}`);
    console.log(`    actual:   ${JSON.stringify(actual)}`);
  } else {
    passed++;
    console.log(`  ✓ ${label}`);
  }
}

// ── Mock database ─────────────────────────────────────────────────
// Intercept require('../db/database') before trigger-engine loads it
const Module = require('module');
const originalResolve = Module._resolveFilename;
const mockTriggers = [];
const mockTriggersById = {};
let incrementCountCalls = [];

const mockDb = {
  triggerList: () => mockTriggers,
  triggerGet: (id) => mockTriggersById[id] || null,
  triggerIncrementCount: (id) => incrementCountCalls.push(id),
};

Module._resolveFilename = function (request, parent, ...rest) {
  if (request === '../db/database' || request === '../../db/database') {
    // Return a fake path that we register in require.cache
    return '__mock_db__';
  }
  return originalResolve.call(this, request, parent, ...rest);
};
require.cache['__mock_db__'] = { id: '__mock_db__', exports: mockDb, loaded: true };

// Now load the real modules (they'll get our mock db)
const triggerEngine = require('./trigger-engine');
const WebhookServer = require('./webhook-server');

// ── Helpers ───────────────────────────────────────────────────────
function resetMocks() {
  mockTriggers.length = 0;
  Object.keys(mockTriggersById).forEach((k) => delete mockTriggersById[k]);
  incrementCountCalls = [];
  ipcFired.length = 0;
}

function makeTrigger(overrides = {}) {
  const t = {
    id: 'trigger-1',
    name: 'Test Trigger',
    enabled: true,
    type: 'message-pattern',
    pattern: 'hello (\\w+)',
    channelId: null,
    senderAllowlist: ['*'],
    agentId: 'agent-1',
    prompt: 'Greet $1',
    createdAt: Date.now(),
    triggerCount: 0,
    ...overrides,
  };
  return t;
}

function addTrigger(overrides = {}) {
  const t = makeTrigger(overrides);
  mockTriggers.push(t);
  mockTriggersById[t.id] = t;
  return t;
}

// Mock window to capture IPC sends
const ipcFired = [];
const mockWindow = {
  isDestroyed: () => false,
  webContents: {
    send: (channel, data) => ipcFired.push({ channel, data }),
  },
};
triggerEngine.setWindow(mockWindow);

// ── HTTP helper ───────────────────────────────────────────────────
function httpPost(port, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body != null ? JSON.stringify(body) : '';
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function httpGet(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'GET' },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

// ══════════════════════════════════════════════════════════════════
//  TESTS
// ══════════════════════════════════════════════════════════════════

function testRefreshPatterns() {
  console.log('\n── refreshPatterns ──');

  resetMocks();
  addTrigger();
  triggerEngine.refreshPatterns();
  assert(triggerEngine._compiledPatterns.size === 1, 'compiles regex for enabled trigger');
  assert(triggerEngine._compiledPatterns.get('trigger-1') instanceof RegExp, 'stores RegExp instance');

  resetMocks();
  addTrigger({ enabled: false });
  triggerEngine.refreshPatterns();
  assert(triggerEngine._compiledPatterns.size === 0, 'skips disabled triggers');

  resetMocks();
  addTrigger({ pattern: null });
  triggerEngine.refreshPatterns();
  assert(triggerEngine._compiledPatterns.size === 0, 'skips triggers with no pattern');

  resetMocks();
  addTrigger({ pattern: '(?invalid' });
  let threw = false;
  const origWarn = console.warn;
  console.warn = () => {}; // suppress expected warning
  try { triggerEngine.refreshPatterns(); } catch { threw = true; }
  console.warn = origWarn;
  assert(!threw, 'does not throw on invalid regex');
  assert(triggerEngine._compiledPatterns.size === 0, 'skips invalid regex pattern');

  resetMocks();
  addTrigger();
  triggerEngine.refreshPatterns();
  assert(triggerEngine._compiledPatterns.size === 1, 'has pattern before clear');
  mockTriggers.length = 0;
  triggerEngine.refreshPatterns();
  assert(triggerEngine._compiledPatterns.size === 0, 'clears old patterns on refresh');
}

function testEvaluateMessage() {
  console.log('\n── evaluateMessage ──');

  // Basic match
  resetMocks();
  addTrigger();
  triggerEngine.refreshPatterns();
  let result = triggerEngine.evaluateMessage({ channelId: 'ch-1', sender: 'alice', content: 'hello world' });
  assert(result === true, 'returns true on match');
  assert(incrementCountCalls.length === 1, 'increments count');
  assert(ipcFired.length === 1, 'sends IPC');
  assertEq(ipcFired[0].data.prompt, 'Greet world', 'substitutes $1 in prompt');

  // No match
  resetMocks();
  addTrigger({ pattern: 'xyz' });
  triggerEngine.refreshPatterns();
  result = triggerEngine.evaluateMessage({ channelId: 'ch-1', content: 'hello world' });
  assert(result === false, 'returns false when no match');
  assert(incrementCountCalls.length === 0, 'does not increment on miss');

  // Channel filter
  resetMocks();
  addTrigger({ channelId: 'ch-specific' });
  triggerEngine.refreshPatterns();
  result = triggerEngine.evaluateMessage({ channelId: 'ch-other', content: 'hello world' });
  assert(result === false, 'filters out wrong channel');
  result = triggerEngine.evaluateMessage({ channelId: 'ch-specific', content: 'hello world' });
  assert(result === true, 'matches correct channel');

  // Sender allowlist
  resetMocks();
  addTrigger({ senderAllowlist: ['alice', 'bob'] });
  triggerEngine.refreshPatterns();
  result = triggerEngine.evaluateMessage({ channelId: 'ch-1', sender: 'alice', content: 'hello world' });
  assert(result === true, 'allows listed sender');
  resetMocks();
  addTrigger({ senderAllowlist: ['alice', 'bob'] });
  triggerEngine.refreshPatterns();
  result = triggerEngine.evaluateMessage({ channelId: 'ch-1', sender: 'charlie', content: 'hello world' });
  assert(result === false, 'blocks unlisted sender');

  // Wildcard sender
  resetMocks();
  addTrigger({ senderAllowlist: ['*'] });
  triggerEngine.refreshPatterns();
  result = triggerEngine.evaluateMessage({ channelId: 'ch-1', sender: 'anyone', content: 'hello world' });
  assert(result === true, 'wildcard * allows any sender');

  // Empty allowlist = allow all
  resetMocks();
  addTrigger({ senderAllowlist: [] });
  triggerEngine.refreshPatterns();
  result = triggerEngine.evaluateMessage({ channelId: 'ch-1', sender: 'anyone', content: 'hello world' });
  assert(result === true, 'empty allowlist allows any sender');

  // First match wins
  resetMocks();
  addTrigger({ id: 't-1', pattern: 'hello' });
  addTrigger({ id: 't-2', pattern: 'hello' });
  triggerEngine.refreshPatterns();
  triggerEngine.evaluateMessage({ channelId: 'ch-1', content: 'hello world' });
  assert(incrementCountCalls.length === 1, 'first match wins — only one fires');
  assertEq(incrementCountCalls[0], 't-1', 'first trigger is the one that fired');

  // Skips non-message-pattern triggers
  resetMocks();
  addTrigger({ type: 'webhook' });
  triggerEngine.refreshPatterns();
  result = triggerEngine.evaluateMessage({ channelId: 'ch-1', content: 'hello world' });
  assert(result === false, 'skips non-message-pattern triggers');
}

function testEvaluateSkillEvent() {
  console.log('\n── evaluateSkillEvent ──');

  // Fires all matching
  resetMocks();
  addTrigger({ id: 't-1', type: 'skill-event', pattern: 'deploy:done', prompt: 'Deploy {{repo}}' });
  addTrigger({ id: 't-2', type: 'skill-event', pattern: 'deploy:done', prompt: 'Notify {{repo}}' });
  triggerEngine.evaluateSkillEvent({ type: 'deploy:done', data: { repo: 'outworked' } });
  assert(incrementCountCalls.length === 2, 'fires all matching skill-event triggers');
  assert(ipcFired.length === 2, 'sends IPC for each match');

  // Mismatched event type
  resetMocks();
  addTrigger({ type: 'skill-event', pattern: 'deploy:done' });
  triggerEngine.evaluateSkillEvent({ type: 'deploy:started', data: {} });
  assert(incrementCountCalls.length === 0, 'does not fire on mismatched event type');

  // Disabled
  resetMocks();
  addTrigger({ type: 'skill-event', pattern: 'deploy:done', enabled: false });
  triggerEngine.evaluateSkillEvent({ type: 'deploy:done', data: {} });
  assert(incrementCountCalls.length === 0, 'does not fire disabled triggers');
}

function testEvaluateWebhook() {
  console.log('\n── evaluateWebhook ──');

  resetMocks();
  addTrigger({ type: 'webhook', pattern: null, prompt: 'Hook from {{source}}' });
  let result = triggerEngine.evaluateWebhook('trigger-1', { source: 'github' });
  assert(result === true, 'returns true for valid webhook trigger');
  assert(ipcFired.length === 1, 'sends IPC');
  assertEq(ipcFired[0].data.prompt, 'Hook from github', 'substitutes {{key}} placeholders');

  resetMocks();
  result = triggerEngine.evaluateWebhook('nope', {});
  assert(result === false, 'returns false if trigger not found');

  resetMocks();
  addTrigger({ type: 'webhook', enabled: false });
  result = triggerEngine.evaluateWebhook('trigger-1', {});
  assert(result === false, 'returns false if trigger disabled');

  resetMocks();
  addTrigger({ type: 'message-pattern' });
  result = triggerEngine.evaluateWebhook('trigger-1', {});
  assert(result === false, 'returns false if trigger is not webhook type');
}

function testFireTrigger() {
  console.log('\n── fireTrigger (prompt templates) ──');

  // Regex capture groups
  resetMocks();
  const t = makeTrigger({ prompt: 'Deploy $1 to $2' });
  triggerEngine.fireTrigger(t, {}, ['deploy api staging', 'api', 'staging']);
  assertEq(ipcFired[0].data.prompt, 'Deploy api to staging', 'substitutes $1 and $2');

  // Named placeholders
  resetMocks();
  const t2 = makeTrigger({ type: 'webhook', prompt: 'Repo: {{repo}}, Branch: {{branch}}' });
  triggerEngine.fireTrigger(t2, { repo: 'outworked', branch: 'main' }, null);
  assertEq(ipcFired[0].data.prompt, 'Repo: outworked, Branch: main', 'substitutes {{key}} placeholders');

  // Both combined
  resetMocks();
  const t3 = makeTrigger({ prompt: 'Deploy $1 from {{sender}}' });
  triggerEngine.fireTrigger(t3, { sender: 'alice' }, ['deploy api', 'api']);
  assertEq(ipcFired[0].data.prompt, 'Deploy api from alice', 'substitutes both $N and {{key}}');

  // Fallback pattern match (no regexMatch, message-pattern type)
  resetMocks();
  const t4 = makeTrigger({ pattern: 'deploy (\\w+)', prompt: 'Deploying $1' });
  triggerEngine.fireTrigger(t4, { content: 'deploy api' }, null);
  assertEq(ipcFired[0].data.prompt, 'Deploying api', 'fallback pattern match substitutes $1');

  // No window — should not throw
  resetMocks();
  triggerEngine.setWindow(null);
  let threw = false;
  try { triggerEngine.fireTrigger(makeTrigger(), {}, null); } catch { threw = true; }
  assert(!threw, 'does not throw when window is null');
  assert(incrementCountCalls.length === 1, 'still increments count without window');
  triggerEngine.setWindow(mockWindow); // restore
}

async function testWebhookServer() {
  console.log('\n── WebhookServer ──');
  const PORT = 18923;
  const ws = new WebhookServer(PORT);
  ws.start();
  await new Promise((r) => setTimeout(r, 100));

  // Successful trigger
  resetMocks();
  addTrigger({ type: 'webhook', prompt: 'test' });
  let res = await httpPost(PORT, '/trigger/trigger-1', { foo: 'bar' });
  assertEq(res.status, 200, 'returns 200 on successful trigger');
  assert(res.body.ok === true, 'response body has ok:true');

  // Trigger not found
  resetMocks();
  res = await httpPost(PORT, '/trigger/missing', {});
  assertEq(res.status, 404, 'returns 404 when trigger not found');

  // Wrong method
  res = await httpGet(PORT, '/trigger/test-1');
  assertEq(res.status, 405, 'returns 405 for GET requests');

  // Invalid path
  res = await httpPost(PORT, '/bad/path', {});
  assertEq(res.status, 404, 'returns 404 for invalid paths');

  // Empty body
  resetMocks();
  addTrigger({ type: 'webhook', prompt: 'test' });
  res = await httpPost(PORT, '/trigger/trigger-1', null);
  assertEq(res.status, 200, 'handles empty body gracefully');

  // Trigger ID with hyphens and underscores
  resetMocks();
  addTrigger({ id: 'trigger-123_abc', type: 'webhook', prompt: 'test' });
  res = await httpPost(PORT, '/trigger/trigger-123_abc', {});
  assertEq(res.status, 200, 'accepts IDs with hyphens and underscores');

  // Idempotent start
  ws.start(); // second call should be no-op
  resetMocks();
  addTrigger({ type: 'webhook', prompt: 'test' });
  res = await httpPost(PORT, '/trigger/trigger-1', {});
  assertEq(res.status, 200, 'idempotent start — still works');

  ws.stop();

  // Stop is safe to call again
  let threw = false;
  try { ws.stop(); } catch { threw = true; }
  assert(!threw, 'stop() is safe to call when already stopped');
}

// ── Run all tests ─────────────────────────────────────────────────
async function main() {
  console.log('Trigger Engine & Webhook Server Tests\n' + '═'.repeat(45));

  testRefreshPatterns();
  testEvaluateMessage();
  testEvaluateSkillEvent();
  testEvaluateWebhook();
  testFireTrigger();
  await testWebhookServer();

  console.log(`\n${'═'.repeat(45)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
