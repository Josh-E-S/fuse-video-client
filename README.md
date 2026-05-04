<p align="center">
  <img src="public/logo-1.png" alt="Fuse Video Client" width="200" />
</p>

<h1 align="center">Fuse Video Client</h1>

<p align="center">
  A native Electron video conferencing client that joins Pexip, Zoom, Google Meet, and Microsoft Teams meetings through a single interface. Built on <a href="https://www.pexip.com/">Pexip Infinity's</a> PexRTC client APIs, with offline live transcription (NVIDIA Parakeet via Sherpa-ONNX) and offline meeting summarization (Qwen3-0.6B via node-llama-cpp).
</p>

<p align="center">
  <img src="https://github.com/Josh-E-S/fuse-video-client/actions/workflows/ci.yml/badge.svg" alt="CI" />
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Electron-35-47848F?logo=electron" alt="Electron 35" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
</p>

<p align="center">
  <strong>One client for every meeting.</strong> Join any provider with a single click.
</p>

<p align="center">
  <img src="public/icons/meeting-providers/pexip.svg" alt="Pexip" width="32" height="32" />   
  <img src="public/icons/meeting-providers/zoom.svg" alt="Zoom" width="32" height="32" />   
  <img src="public/icons/meeting-providers/google-meet.svg" alt="Google Meet" width="32" height="32" />   
  <img src="public/icons/meeting-providers/microsoft-teams.svg" alt="Microsoft Teams" width="32" height="32" />
</p>

<br/>

<p align="center"><strong>Collapsed</strong></p>
<p align="center">
  <img src="public/screenshots/collapsed-mode.png" alt="Collapsed home" width="430" />   
  <img src="public/screenshots/in-call-portrait.png" alt="Collapsed in call" width="430" />
</p>
<p align="center">
  <em>Home                                                                      In Call</em>
</p>
<p align="center">
  <img src="public/screenshots/in-call-portrait-transcription.png" alt="Collapsed in call with transcription" width="700" />
</p>
<p align="center"><em>In Call · Transcription</em></p>

<br/>

<p align="center"><strong>Expanded</strong></p>
<p align="center">
  <img src="public/screenshots/expanded-mode.png" alt="Expanded home" width="900" />
</p>
<p align="center"><em>Home</em></p>
<p align="center">
  <img src="public/screenshots/in-call-expanded-content-share.png" alt="Expanded in call with content share" width="900" />
</p>
<p align="center"><em>In Call · Content Share</em></p>

<br/>

<p align="center"><strong>Mini</strong></p>
<p align="center">
  <img src="public/screenshots/mini-mode.png" alt="Mini home" width="430" />   
  <img src="public/screenshots/in-call-mini.png" alt="Mini in call" width="430" />
</p>
<p align="center">
  <em>Home                                                                      In Call</em>
</p>
<p align="center">
  <img src="public/screenshots/in-call-mini-transcription.png" alt="Mini in call with transcription" width="700" />
</p>
<p align="center"><em>In Call · Transcription</em></p>

<br/>

<p align="center"><strong>Side-bar &amp; Live Transcription</strong></p>
<p align="center">
  <img src="public/screenshots/side-bar-mode.png" alt="Side-bar" width="220" />   
  <img src="public/screenshots/scribe-transcription.png" alt="Live transcript" width="320" />   
  <img src="public/screenshots/scribe-summary.png" alt="AI summary" width="320" />
</p>
<p align="center">
  <em>Side-bar                                                            Live Transcript                                                  AI Summary</em>
</p>

<br/>

<p align="center"><strong>Quick Join</strong></p>
<p align="center">
  <img src="public/screenshots/join-google.png" alt="Google Meet" width="230" /> 
  <img src="public/screenshots/join-teams.png" alt="Teams" width="230" /> 
  <img src="public/screenshots/join-zoom.png" alt="Zoom" width="230" /> 
  <img src="public/screenshots/join-pexip.png" alt="Pexip" width="230" />
</p>
<p align="center">
  <em>Google Meet&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Teams&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Zoom&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Pexip</em>
</p>

---

## Key Features

- **One-Touch Multi-Provider Joining** -- Join Zoom, Google Meet, Microsoft Teams, and Pexip meetings from a single interface via Pexip CVI gateway routing
- **Calendar Integration** -- One Touch Join calendar pulls upcoming meetings with auto-detected provider icons and one-click joining
- **Local Transcription** -- Offline speech-to-text powered by NVIDIA's Parakeet TDT-CTC 110M model running locally via Sherpa-ONNX (Electron only, no cloud dependency).
- **Local Summarization** -- Offline meeting summaries from Qwen3-0.6B-Instruct (Q4_K_M GGUF) running in an Electron utility process via node-llama-cpp. Generates structured markdown from the live transcript without sending content off-device.
- **Registered WebRTC Client** -- Register as a Pexip WebRTC device to receive incoming calls with configurable ringtones
- **4 Window Modes** -- Collapsed (510x941), Side-bar (calendar dock), Expanded (1224x941), and Mini (640x360) floating PiP
- **Setup Wizard** -- Guided first-launch onboarding: connection, registration, calendar, providers, devices, model downloads, and system checks
- **Quick Join Toggles** -- Enable/disable provider buttons per your configured infrastructure

---

## Tech Stack

| Layer             | Technology                                                             |
| ----------------- | ---------------------------------------------------------------------- |
| **Framework**     | Next.js 16 (App Router, standalone output)                             |
| **Language**      | TypeScript 5 (strict mode)                                             |
| **UI**            | React 19, Tailwind CSS v4, Framer Motion                               |
| **Components**    | Radix UI primitives, Lucide React icons, Sonner toasts                 |
| **WebRTC**        | PexRTC (Pexip Infinity browser SDK, loaded dynamically from node)      |
| **Desktop**       | Electron 35 with sandbox, context isolation, CSP                       |
| **Speech**        | NVIDIA Parakeet TDT-CTC 110M via Sherpa-ONNX (offline, Electron-only)  |
| **Summarization** | Qwen3-0.6B-Instruct Q4_K_M via node-llama-cpp (offline, Electron-only) |
| **Validation**    | Zod (API input schemas)                                                |
| **Testing**       | Vitest 4, Testing Library, jsdom                                       |
| **CI/CD**         | GitHub Actions (lint, typecheck, test, build, security scanning)       |
| **Linting**       | ESLint 9, Prettier                                                     |

---

## Prerequisites

- **Node.js** 20+
- **npm** (ships with Node.js)
- A **Pexip Infinity** deployment (node domain) -- the app cannot function without one
- _(Optional)_ Pexip OTJ portal credentials for calendar integration
- _(Optional)_ Xcode Command Line Tools for Electron macOS builds

> **Note**: All provider features (Zoom, Teams, Google Meet quick join) route through your Pexip node via CVI. Without a Pexip deployment and properly configured call routing rules, calls will not connect.

---

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/Josh-E-S/fuse-video-client.git
cd fuse-video-client
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

For basic usage, no `.env.local` values are strictly required -- configure everything through the in-app Settings modal or Setup Wizard. See [Environment Variables](#environment-variables) for the full reference.

### 3. Start Development

**Browser mode:**

```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002).

**Electron mode:**

```bash
npm run dev          # Terminal 1: Next.js dev server
npm run electron:dev # Terminal 2: Electron shell
```

### 4. First Launch

The Setup Wizard walks you through:

1. **Connection** -- Pexip node domain and display name
2. **Registration** -- WebRTC device alias, username, and password for incoming calls
3. **Calendar** -- OTJ client credentials for meeting discovery
4. **Providers** -- Google Meet domain and Pexip customer ID for Teams CVI
5. **Devices** -- Camera, microphone, and speaker selection with live preview
6. **Local Models** -- Download the speech model for offline captions and the summarization model for meeting summaries (Electron only, ~126 MB + ~400 MB)
7. **System Check** -- Validates node reachability, registration, calendar auth, devices, and model status

All settings can be changed later via the gear icon in the top bar.

---

## Configuration

### In-App Settings

All configuration persists in `localStorage` and syncs across windows:

| Setting                | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| **Node Domain**        | Your Pexip Infinity node (e.g.`pexip.example.com`)         |
| **Display Name**       | Name shown to other participants                           |
| **Registration**       | WebRTC device alias, username, password for incoming calls |
| **Audio Input/Output** | Microphone and speaker selection                           |
| **Video Input**        | Camera selection                                           |
| **Ringtone**           | Incoming call sound (8 options)                            |
| **OTJ Credentials**    | Client ID/Secret for calendar integration                  |
| **Customer ID**        | Required for Microsoft Teams CVI dial strings              |
| **Google Domain**      | Required for Google Meet CVI dial strings                  |
| **Quick Join Toggles** | Show/hide provider buttons on the home screen              |
| **Theme**              | 10 visual themes across 4 categories                       |

### Dev Defaults (optional)

If you're contributing or iterating locally and don't want to retype your test rig credentials every time you wipe localStorage, copy `.env.dev.example` to `.env.dev.local` and fill in the `NEXT_PUBLIC_DEV_*` values you want pre-populated in the Setup Wizard.

`.env.dev.local` is gitignored. The `NEXT_PUBLIC_DEV_*` reads are guarded behind `process.env.NODE_ENV !== 'production'` in `src/utils/devDefaults.ts`, which Next.js evaluates at build time. In production builds the entire dev-defaults object is replaced with `{}`, so no `NEXT_PUBLIC_DEV_*` value can leak into the shipped bundle.

### Dial String Builders

Fuse constructs provider-specific dial strings automatically. All calls route through your Pexip node:

| Provider            | How it's built                                        | Config Required        |
| ------------------- | ----------------------------------------------------- | ---------------------- |
| **Pexip**           | Alias passthrough                                     | Node domain            |
| **Zoom**            | Auto-built from meeting ID and passcode               | Node domain            |
| **Google Meet**     | Auto-built from meeting ID and Google domain          | Google domain          |
| **Microsoft Teams** | Auto-built from meeting ID, passcode, and customer ID | Customer ID (per-user) |
| **Generic**         | Alias passthrough                                     | Node domain            |

> Quick Join buttons are automatically hidden when their required configuration is missing. You can also toggle them manually in Settings > Meetings > Quick Join.

---

## How It Works

### Meeting Join Flow

![Join Flow](docs/join-flow.svg)

### State Architecture

| Layer                  | Mechanism           | Scope                                                 |
| ---------------------- | ------------------- | ----------------------------------------------------- |
| **Conference**         | PexipContext        | WebRTC connection, streams, participants, chat        |
| **Registration**       | RegistrationContext | WebRTC device registration, incoming calls, heartbeat |
| **Picture-in-Picture** | PipContext          | documentPictureInPicture API                          |
| **Settings**           | useSettings hook    | localStorage with cross-instance sync                 |
| **Theme**              | useTheme hook       | CSS custom properties, no flash on load               |
| **Quick Join**         | useQuickJoin hook   | Provider toggle state with cross-instance sync        |

### Key Services

| Service                   | Role                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `pexrtcLoader`            | Dynamically loads PexRTC.js from the Pexip node with retry logic                         |
| `pexrtcConnectionManager` | Singleton managing the full conference lifecycle (connect, PIN, mute, share, disconnect) |
| `pexipOTJ`                | OAuth + REST client for the Pexip One Touch Join calendar API                            |

### Architecture Diagrams

<details>
<summary>Connection Flow</summary>

![Connection Flow](docs/connection-flow.svg)

</details>

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # Server-side API routes
│   │   ├── meetings/             # OTJ calendar proxy
│   │   └── dial-string/teams/    # Teams CVI dial string builder
│   ├── meeting/[alias]/          # In-call meeting page
│   ├── presentation-popout/      # Second window for content sharing
│   └── page.tsx                  # Home page
├── components/
│   ├── home/                     # Landing page (clock, calendar, quick join)
│   ├── modals/                   # Dialogs (join, preflight, settings, wizard, DTMF, stats)
│   └── meeting/                  # In-call UI (controls, chat, transcript, participants, dock)
├── contexts/                     # React Context providers
├── hooks/                        # Custom hooks (settings, devices, theme, transcription, etc.)
├── services/                     # PexRTC loader, connection manager, OTJ client
├── themes/                       # 10 theme definitions with CosmeticTheme interface
├── types/                        # PexRTC and meeting TypeScript types
└── utils/                        # Media, date, provider detection helpers

electron/
├── main.js                       # Window management, IPC, permissions, splash screen
├── preload.js                    # Context-isolated bridge (expand, mini, transcription, models)
├── transcription.js              # Sherpa-ONNX speech recognition + model management
└── splash.html                   # Loading screen with logo
```

---

## Environment Variables

Copy `.env.example` to `.env.local`. The two values are the public Pexip OTJ portal URLs and rarely need overriding — every other setting is supplied per-user through the Setup Wizard or Settings modal.

### Server-Side (API routes only)

| Variable             | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `PEXIP_OTJ_AUTH_URL` | Pexip OAuth endpoint (default: `https://auth.otj.pexip.io`) |
| `PEXIP_OTJ_API_URL`  | Pexip OTJ API endpoint (default: `https://otj.pexip.io`)    |

For dev convenience, contributors can copy `.env.dev.example` to `.env.dev.local` to pre-fill the Setup Wizard during `npm run dev`. See [Dev Defaults (optional)](#dev-defaults-optional) above for details.

---

## Available Scripts

| Command                   | Description                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| `npm run dev`             | Start Next.js dev server on port 3002                                 |
| `npm run build`           | Production build (standalone output)                                  |
| `npm start`               | Start production server                                               |
| `npm run lint`            | Run ESLint                                                            |
| `npm test`                | Run Vitest test suite                                                 |
| `npm run test:watch`      | Run tests in watch mode                                               |
| `npm run format`          | Format code with Prettier                                             |
| `npm run format:check`    | Check formatting without writing                                      |
| `npm run electron:dev`    | Launch Electron in development mode                                   |
| `npm run electron:build`  | Build Next.js + package as signed `.dmg`                              |
| `npm run electron:pack`   | Build + package Electron (unpacked, for testing)                      |
| `npm run download-models` | Download Sherpa-ONNX Parakeet (~126 MB) and Qwen3-0.6B GGUF (~400 MB) |

---

## Electron Desktop App

### Window Modes

| Mode          | Size                    | Use Case                                                  |
| ------------- | ----------------------- | --------------------------------------------------------- |
| **Collapsed** | 510 x 941               | Default home view                                         |
| **Side-bar**  | Narrow strip, full-edge | Persistent calendar dock pinned to the screen edge        |
| **Expanded**  | 1224 x 941              | In-call with side panels (chat, transcript, participants) |
| **Mini**      | 640 x 360               | Floating PiP centered under webcam                        |

Mini mode joins calls fully muted with no preflight. It shows far-side video with a 128x96 self-view overlay and minimal controls.

### Building for macOS

```bash
npm run electron:build
```

Produces a code-signed `.dmg` in `dist-electron/`. Includes:

- macOS entitlements for camera, microphone, and screen capture
- Dark mode support
- Splash screen with logo while Next.js cold-starts

### Local Transcription

Fuse runs NVIDIA's Parakeet TDT-CTC 110M speech model locally via Sherpa-ONNX -- no cloud transcription service required. The model (~126 MB) can be downloaded from:

1. **Setup Wizard** -- Local Models step during first launch
2. **Settings** -- Devices tab > Live Transcription
3. **Terminal** -- `npm run download-models`

### Local Summarization

Fuse summarizes meetings on-device using Qwen3-0.6B-Instruct (Q4_K_M GGUF, ~400 MB) running in an Electron utility process via node-llama-cpp. The transcript never leaves the machine. The summarizer reads the current live transcript and emits structured markdown (overview, decisions, action items). Download paths are the same as transcription: Setup Wizard, Settings, or `npm run download-models`.

Both models are stored in `~/Library/Application Support/Fuse Video Client/models/` and persist across app updates.

---

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

144 tests across 20 files using **Vitest** with **Testing Library** and **jsdom**. Tests live in `src/__tests__/`, organized by type (`api/`, `contexts/`, `hooks/`, `services/`, `utils/`).

---

## Troubleshooting

### Cannot connect to node

1. Verify your Pexip node domain is correct in Settings
2. Test reachability: open `https://<node>/api/client/v2/status` in a browser
3. Check for CORS issues if running on a different origin

### Camera or microphone not working

1. Check browser permissions (camera icon in address bar)
2. macOS: System Settings > Privacy & Security > Camera/Microphone
3. Electron: permissions are requested on first use -- restart if denied

### Quick Join calls fail

1. Ensure call routing rules are configured on your Pexip Infinity deployment
2. Verify the required provider config is set (Google domain, customer ID)
3. Check that CVI licenses are active on your Pexip node

### Calendar shows "Calendar not configured"

1. Add OTJ credentials in Settings > Meetings or the Setup Wizard
2. Verify the OTJ portal has calendar sources configured
3. Check browser console for errors from `/api/meetings`

### Electron shows blank screen

1. Ensure the Next.js dev server is running first (`npm run dev`)
2. Electron connects to `localhost:3002` in development mode
3. DevTools opens automatically in dev -- check for errors

### Transcription not appearing

- Live transcription requires Electron + the downloaded Parakeet model (check Settings > Devices > Live Transcription)
- If the model shows "Ready" but captions are empty, check the Electron main process console for decode errors

### Summarization fails or model missing

- The summary feature requires Electron + the downloaded Qwen3 GGUF model (Settings > Devices > Local Models)
- First-run inference is slower while the model warms up; subsequent summaries are faster
- If `node-llama-cpp` fails to load (rare; tied to native binary compatibility), the Summarize button is hidden

---

## Acknowledgments

This project stands on the work of several open-source projects and model authors:

- **[Pexip Infinity](https://www.pexip.com/) / PexRTC** -- the WebRTC SDK that drives every call. Pexip is a trademark of Pexip AS; this project is independent and unaffiliated.
- **[Sherpa-ONNX](https://github.com/k2-fsa/sherpa-onnx)** (Apache 2.0) -- ONNX runtime for offline speech recognition.
- **[NVIDIA Parakeet TDT-CTC 110M](https://huggingface.co/nvidia/parakeet-tdt-1.1b)** -- the speech recognition model. Used under NVIDIA's model license.
- **[Qwen3-0.6B-Instruct](https://huggingface.co/Qwen/Qwen3-0.6B-Instruct)** (Apache 2.0) -- the on-device summarization model from Alibaba Cloud's Qwen team. The Q4_K_M GGUF re-quant used here is from [bartowski](https://huggingface.co/bartowski).
- **[node-llama-cpp](https://github.com/withcatai/node-llama-cpp)** (MIT) -- Node.js bindings for llama.cpp; powers the local summarizer.
- **[Radix UI](https://www.radix-ui.com/) / [shadcn/ui](https://ui.shadcn.com/)** (MIT) -- accessible UI primitives and component patterns.
- **[Next.js](https://nextjs.org/)**, **[React](https://react.dev/)**, **[Electron](https://www.electronjs.org/)**, **[Tailwind CSS](https://tailwindcss.com/)**, **[Framer Motion](https://www.framer.com/motion/)**, **[Lucide](https://lucide.dev/)**, **[Sonner](https://sonner.emilkowal.ski/)**, **[Vitest](https://vitest.dev/)**, **[Zod](https://zod.dev/)**.

---

## Security

For the threat model, CSP trade-offs, macOS entitlements rationale, and the model-download supply-chain note, see [SECURITY.md](SECURITY.md).

---

## License

MIT. See [LICENSE](LICENSE) for details.

Fuse Video Client is an independent open-source project and is not officially affiliated with or endorsed by Pexip. "Pexip" and "Pexip Infinity" are trademarks of Pexip AS.
