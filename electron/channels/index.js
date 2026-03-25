// ─── Channels barrel export ───────────────────────────────────────
// Exports all built-in channel implementations so callers can import
// them from a single require path.

const ImessageChannel = require("./imessage-channel");
const SlackChannel = require("./slack-channel");

module.exports = { ImessageChannel, SlackChannel };
