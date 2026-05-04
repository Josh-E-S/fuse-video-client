# Security

This is a desktop video conferencing demo, not an enterprise build. Some trade-offs are made deliberately. This document explains them so reviewers don't have to reverse-engineer the choices.

## Threat model

Fuse is a single-user desktop app. The renderer talks to:

- a user-configured Pexip Infinity node over HTTPS/WSS (PexRTC.js is fetched from the node at runtime),
- the local Next.js server bundled inside Electron (loopback only),
- two local utility processes for transcription (Sherpa-ONNX) and summarization (node-llama-cpp).

There is no remote attacker reachable over the public internet by design. The realistic adversaries are:

1. A compromised Pexip node (or a network MitM with a forged cert) that serves a malicious PexRTC.js.
2. A malicious meeting participant who tries to influence the AI summary via spoken content.
3. A supply-chain attack against the model files downloaded from this repo's GitHub releases.

## Renderer isolation

The Electron main window and all child windows run with:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`

The preload script exposes a finite, named bridge — there is no generic `ipcRenderer.invoke` pass-through. Every IPC channel handled in `electron/main.js` is explicitly registered.

## Content Security Policy

The CSP injected by `electron/main.js` is wider than a typical Electron app. Two notable relaxations:

- **`script-src 'self' ... https:`** — PexRTC.js is loaded dynamically from the user's own Pexip node, which can be any HTTPS host the user configures. We can't pin a specific origin without breaking that core flow. The `https:` wildcard means a network attacker who can MitM the user's chosen node achieves code execution in the renderer. This is mitigated by `contextIsolation`, `sandbox`, and `frame-ancestors 'none'`, but not eliminated.
- **`script-src ... 'unsafe-eval'`** — required by Next.js HMR in dev mode. In production builds this should be gated behind an `isDev` check.

If you fork this project for a higher-trust deployment, narrow `script-src` to your specific Pexip domain and drop `unsafe-eval`.

## macOS entitlements

`resources/entitlements.mac.plist` includes:

- `com.apple.security.cs.disable-library-validation`
- `com.apple.security.cs.allow-unsigned-executable-memory`

These are required because:

- `node-llama-cpp` JIT-compiles inference kernels and needs writable+executable memory.
- `sherpa-onnx-node` ships a prebuilt native binary that may not be signed by the same identity as the Electron app.

The trade-off is real: a compromised app process can load arbitrary unsigned dylibs. If you ship a hardened build to enterprise customers, replace these dependencies with statically signed equivalents and remove the entitlements.

## Local model downloads

`scripts/download-models.sh`, `electron/transcription.js`, and `electron/summarizer.js` fetch model archives from this repo's GitHub releases. There is currently **no SHA-256 manifest or signature verification** on the downloaded archives. A compromised release token could swap in a malicious GGUF or ONNX file, which is then parsed by native C++ libraries (`node-llama-cpp`, `sherpa-onnx-node`).

If you fork or repackage Fuse, ship a checksum manifest in the app bundle and verify each archive before extraction. Filing a follow-up to do this in this repo is on the punch list.

## On-device data

Transcripts and summaries are produced on-device. Nothing is sent to a hosted error tracker — the project does not link Sentry or any other phone-home service by default. The only outbound traffic from the renderer is to the Pexip node the user configures.

If you add observability, route it through the existing `src/utils/logger.ts` and add a `beforeSend`-style scrubber that strips `/meeting/<alias>` segments before they reach any external service.

## Reporting

If you find an issue you believe shouldn't be public, open a private security advisory on this repo rather than a public issue.
