// Main-process logger. Wraps electron-log so we have one place to control
// defaults (level, rotation, file path) and so the rest of the codebase
// imports this shim instead of the third-party package directly.
//
// Logs go to:
//   macOS: ~/Library/Logs/Fuse Video Client/main.log
//
// What to log: app lifecycle, failures, one-time state transitions, operations
// the user might ask about. NEVER log audio samples, transcript text, summary
// text, or credentials (alias/username/password/OTJ secrets).

const log = require("electron-log/main");

// Cap the file at 5 MB; older entries roll over to main.old.log automatically.
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {scope} {text}";

// Console transport keeps dev-mode output in the terminal where developers expect it.
// In production, console transport is a no-op for users — file is the source of truth.
log.transports.console.format = "[{level}] {scope} {text}";

// Initialize main-process logger so renderer logs can be forwarded via IPC if needed later.
log.initialize();

// Convenience: scoped() returns a logger pre-tagged with a subsystem name so
// log lines self-identify (e.g. log.scope("transcription").info("started")).
function scoped(name) {
  return log.scope(name);
}

module.exports = { log, scoped };
