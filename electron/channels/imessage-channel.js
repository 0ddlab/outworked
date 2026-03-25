// ─── iMessage Channel ────────────────────────────────────────────
// Reads inbound iMessages from the macOS Messages SQLite database and
// sends outbound messages via AppleScript.  macOS only.

const { execFile } = require("child_process");
const path = require("path");
const os = require("os");
const BaseChannel = require("./base-channel");

// Path to the Messages chat database (read-only access required).
const CHAT_DB_PATH = path.join(
  os.homedir(),
  "Library",
  "Messages",
  "chat.db",
);

// How often to poll for new messages (milliseconds).
const POLL_INTERVAL_MS = 5000;

class ImessageChannel extends BaseChannel {
  constructor(id, name, config = {}) {
    super(id, "imessage", name, config);

    /** @type {number | null} The highest message ROWID we have already processed. */
    this.lastMessageId = config.lastMessageId || 0;

    /** @type {ReturnType<typeof setInterval> | null} */
    this._pollTimer = null;
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  async connect() {
    if (process.platform !== "darwin") {
      throw new Error("iMessage channel is only supported on macOS");
    }

    // Verify the database is accessible before we start polling.
    try {
      await this._queryDb(
        "SELECT MAX(ROWID) AS max_id FROM message",
        (rows) => {
          const maxId = rows[0]?.max_id;
          if (maxId != null && this.lastMessageId === 0) {
            // Bootstrap: treat all existing messages as already seen so we
            // don't flood the agent with historical messages on first connect.
            this.lastMessageId = maxId;
          }
        },
      );
    } catch (err) {
      if (
        err.message &&
        (err.message.includes("authorization denied") ||
          err.message.includes("unable to open database"))
      ) {
        const e = new Error(
          "Full Disk Access required. Grant access in System Settings > Privacy & Security > Full Disk Access, then reconnect.",
        );
        e.code = "FULL_DISK_ACCESS_REQUIRED";
        throw e;
      }
      throw err;
    }

    this.status = "connected";
    this.errorMessage = null;

    // Begin polling
    this._pollTimer = setInterval(() => {
      this._poll().catch((err) => {
        console.error(`[iMessage] Poll error: ${err.message}`);
      });
    }, POLL_INTERVAL_MS);
  }

  async disconnect() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    await super.disconnect();
  }

  // ─── Outbound messaging ───────────────────────────────────────

  /**
   * Send a message to the specified buddy handle (phone number or email).
   *
   * @param {string} conversationId - iMessage handle, e.g. '+15555550100'
   * @param {string} content        - Message text
   */
  async sendMessage(conversationId, content) {
    if (process.platform !== "darwin") {
      throw new Error("iMessage channel is only supported on macOS");
    }

    // Sanitise content to avoid AppleScript injection: escape backslashes
    // and double-quotes.
    const safe = content
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");

    const script = `tell application "Messages" to send "${safe}" to buddy "${conversationId}" of (get first service whose service type = iMessage)`;

    await this._runAppleScript(script);
  }

  // ─── Internal helpers ─────────────────────────────────────────

  /**
   * Poll the Messages database for any new inbound messages.
   */
  async _poll() {
    // We join message → handle to get the sender's identifier.
    // is_from_me = 0 means inbound.
    const sql = `
      SELECT
        m.ROWID          AS rowid,
        m.text           AS text,
        m.date           AS date,
        m.is_from_me     AS is_from_me,
        h.id             AS handle_id,
        c.chat_identifier AS conversation_id
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      LEFT JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
      LEFT JOIN chat c ON c.ROWID = cmj.chat_id
      WHERE m.ROWID > ${this.lastMessageId}
        AND m.is_from_me = 0
        AND m.text IS NOT NULL
        AND m.text != ''
      ORDER BY m.ROWID ASC
      LIMIT 50
    `;

    await this._queryDb(sql, (rows) => {
      for (const row of rows) {
        if (row.rowid > this.lastMessageId) {
          this.lastMessageId = row.rowid;
        }

        // Convert Apple's Core Data timestamp (seconds since 2001-01-01) to
        // Unix milliseconds.  Newer macOS versions store it in nanoseconds
        // (> 1e15), so we normalise both.
        let ts;
        if (row.date > 1e15) {
          // nanoseconds → ms
          ts = Math.round(row.date / 1e6) + 978307200000;
        } else {
          // seconds → ms
          ts = row.date * 1000 + 978307200000;
        }

        const msg = {
          channelId: this.id,
          direction: "inbound",
          conversationId: row.conversation_id || row.handle_id,
          sender: row.handle_id,
          content: row.text,
          metadata: { rowid: row.rowid },
          timestamp: ts,
        };

        this._emitInbound(msg);
      }
    });
  }

  /**
   * Execute a read-only SQL query against chat.db using the sqlite3 CLI.
   * We avoid opening the database with better-sqlite3 in a second process
   * because WAL mode can cause issues; the sqlite3 CLI opens it read-only.
   *
   * @param {string}                       sql
   * @param {(rows: object[]) => void}     callback
   */
  _queryDb(sql, callback) {
    return new Promise((resolve, reject) => {
      // Use sqlite3 CLI with JSON output mode for easy parsing.
      execFile(
        "sqlite3",
        ["-json", "-readonly", CHAT_DB_PATH, sql],
        { timeout: 5000 },
        (err, stdout, stderr) => {
          if (err) {
            // A non-zero exit code usually means the DB is locked momentarily;
            // treat as a transient error rather than a fatal one.
            return reject(
              new Error(
                `sqlite3 error: ${stderr || err.message}`,
              ),
            );
          }

          let rows = [];
          if (stdout && stdout.trim()) {
            try {
              rows = JSON.parse(stdout);
            } catch (parseErr) {
              return reject(
                new Error(`Failed to parse sqlite3 output: ${parseErr.message}`),
              );
            }
          }

          try {
            callback(rows);
          } catch (cbErr) {
            return reject(cbErr);
          }

          resolve();
        },
      );
    });
  }

  /**
   * Execute an AppleScript string via `osascript`.
   *
   * @param {string} script
   */
  _runAppleScript(script) {
    return new Promise((resolve, reject) => {
      execFile(
        "osascript",
        ["-e", script],
        { timeout: 10000 },
        (err, _stdout, stderr) => {
          if (err) {
            return reject(
              new Error(`osascript error: ${stderr || err.message}`),
            );
          }
          resolve();
        },
      );
    });
  }
}

module.exports = ImessageChannel;
