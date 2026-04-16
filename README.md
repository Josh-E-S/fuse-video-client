# Fuse Video Client

A premium video conferencing interface built on [Pexip Infinity](https://www.pexip.com/) WebRTC APIs. Fuse showcases the Pexip client SDK through a polished, modern UI with glassmorphism design, animated themes, and native desktop packaging via Electron.

## Key Features

- **WebRTC Conferencing** -- Join Pexip Infinity meetings with full audio/video, screen sharing, and DTMF support
- **Multi-Provider Dial Strings** -- Connect to Zoom, Google Meet, Microsoft Teams, and Pexip rooms from a single interface
- **Calendar Integration** -- One Touch Join (OTJ) pulls upcoming meetings and shows them in an orbital carousel
- **Live Transcription** -- Dual-mode: remote WebSocket service or local offline speech recognition (Electron only, via Sherpa-ONNX)
- **SIP Registration** -- Register as a SIP endpoint to receive incoming calls with ringtone selection
- **Picture-in-Picture** -- Float your call in a compact window while multitasking
- **10 Themes** -- Dark, light, luxury dark, and luxury light palettes with animated gradient backgrounds
- **Electron Desktop App** -- Native macOS app with compact, expanded, and mini (320x180) window modes
- **Preflight Lobby** -- Google Meet-style device preview with mic level visualization before joining
- **Setup Wizard** -- Guided first-launch configuration with system checks for camera, mic, and node reachability

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Electron Desktop App](#electron-desktop-app)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, standalone output) |
| **Language** | TypeScript 5 (strict mode) |
| **UI** | React 19, Tailwind CSS v4, Framer Motion |
| **Components** | Radix UI primitives, Lucide React icons, Sonner toasts |
| **WebRTC** | PexRTC (Pexip Infinity browser client, loaded dynamically) |
| **Desktop** | Electron 35 with context isolation |
| **Speech** | Sherpa-ONNX (optional, Electron-only local transcription) |
| **Testing** | Vitest, Testing Library |
| **Linting** | ESLint 9, Prettier |

---

## Prerequisites

- **Node.js** 20 or higher
- **npm** (ships with Node.js)
- A **Pexip Infinity** deployment to connect to (node domain)
- *(Optional)* Pexip OTJ portal credentials for calendar integration
- *(Optional)* Electron dependencies for desktop builds (Xcode Command Line Tools on macOS)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <repo-url>
cd fuse-video-client
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

See [Environment Variables](#environment-variables) for details on each value. For basic usage, you only need to configure your Pexip node domain in the app's Settings modal -- no `.env.local` values are strictly required.

### 4. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

### 5. Configure the App

On first launch, the Setup Wizard walks you through:

1. **Connection** -- Enter your Pexip Infinity node domain
2. **Calendar** -- (Optional) Add OTJ client credentials for meeting discovery
3. **Providers** -- Configure Google Meet domain and Pexip customer ID for Teams CVI
4. **Devices** -- Select camera, microphone, and speaker
5. **System Check** -- Validates node reachability, calendar auth, and device access

You can also access these settings anytime via the gear icon in the top bar.

---

## Configuration

### In-App Settings

All primary configuration lives in the browser's `localStorage` and is managed through the Settings modal:

| Setting | Purpose |
|---------|---------|
| **Node Domain** | Your Pexip Infinity node (e.g. `pexip.example.com`) |
| **Display Name** | Your name shown to other participants |
| **Audio Input/Output** | Microphone and speaker selection |
| **Video Input** | Camera selection |
| **Ringtone** | Incoming call sound (8 options) |
| **OTJ Client ID/Secret** | Pexip One Touch Join credentials for calendar integration |
| **Pexip Customer ID** | Required for Microsoft Teams CVI dial strings |
| **Google Domain** | Required for Google Meet dial strings |

### Dial String Builders

Fuse constructs provider-specific dial strings automatically:

| Provider | Format | Requirements |
|----------|--------|-------------|
| **Pexip** | Alias passthrough | Node domain |
| **Zoom** | `meetingId.passcode@zoomcrc.com` | None (client-side) |
| **Google Meet** | `meetingId@GOOGLE_DOMAIN` | Google domain in settings |
| **Microsoft Teams** | `meetingId.encodedPasscode..CUSTOMER_ID@pex.ms` | Customer ID in settings (server-side API) |
| **Generic** | Alias passthrough | Node domain |

---

## Architecture

### System Overview

![System Architecture](docs/architecture.svg)

### Connection Flow

![Connection Flow](docs/connection-flow.svg)

### In-Call Feature Map

![In-Call Features](docs/in-call-features.svg)

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── meetings/route.ts     # OTJ calendar meetings endpoint
│   │   └── dial-string/
│   │       └── teams/route.ts    # Teams CVI dial string builder
│   ├── meeting/[alias]/page.tsx  # In-call meeting page
│   ├── presentation-popout/      # Second window for content sharing
│   ├── layout.tsx                # Root layout with context providers
│   └── page.tsx                  # Home page
├── components/
│   ├── home/                     # Home page UI
│   │   ├── TopBar.tsx            # Navigation rail with settings
│   │   ├── FeaturedMeetingCard.tsx # Day-grouped upcoming meetings
│   │   ├── AdHocJoin.tsx         # Quick join with provider detection
│   │   ├── PipMeetingView.tsx    # Picture-in-Picture home view
│   │   ├── ClockDisplay.tsx      # Live clock
│   │   └── GradientBackground.tsx # Animated wave background
│   ├── modals/
│   │   ├── PreflightModal.tsx    # Device preview lobby
│   │   ├── JoinModal.tsx         # Meeting alias + PIN entry
│   │   ├── SettingsModal.tsx     # App configuration
│   │   ├── SetupWizard.tsx       # First-launch onboarding (7 steps)
│   │   ├── IncomingCallModal.tsx # SIP incoming call accept/reject
│   │   ├── CallStatsModal.tsx    # Live bitrate, packet loss, resolution
│   │   └── DTMFModal.tsx         # Dial pad for conference IVR
│   └── resync/                   # In-call UI
│       ├── ControlBar.tsx        # Mic, camera, share, hang up controls
│       ├── ChatPanel.tsx         # Text messaging
│       ├── TranscriptPanel.tsx   # Live/local transcription display
│       ├── ParticipantsPanel.tsx # Participant list with mute status
│       ├── DockPanel.tsx         # Resizable side panel
│       ├── GlassPanel.tsx        # Frosted glass container
│       └── SubtitleBar.tsx       # Real-time subtitle overlay
├── contexts/
│   ├── PexipContext.tsx          # Conference connection state
│   ├── RegistrationContext.tsx   # SIP registration state
│   └── PipContext.tsx            # Picture-in-Picture state
├── hooks/
│   ├── useSettings.ts           # localStorage settings with cross-tab sync
│   ├── useMediaDevices.ts       # Device enumeration, preview, mic level
│   ├── useTheme.ts              # Theme management with CSS variables
│   ├── useElectron.ts           # Electron IPC bridge detection
│   ├── useMeetings.ts           # OTJ calendar polling
│   ├── useMeetingNotifications.ts # Toast alerts for upcoming meetings
│   ├── useTranscription.ts      # WebSocket live transcription
│   ├── useLocalTranscription.ts # Sherpa-ONNX offline transcription
│   ├── useAudioAnalyser.ts      # 20-bin FFT mic visualization
│   ├── usePictureInPicture.ts   # documentPictureInPicture API
│   ├── useRecentCalls.ts        # Call history (max 10)
│   └── useMediaQuery.ts         # CSS media query listener
├── services/
│   ├── pexrtcConnectionManager.ts # Singleton conference lifecycle
│   ├── pexrtcLoader.ts          # Dynamic PexRTC script loading
│   └── pexipOTJ.ts              # OTJ OAuth + meeting API client
├── themes/
│   ├── themes.ts                # 10 theme definitions
│   └── types.ts                 # CosmeticTheme interface
├── types/
│   └── pexrtc.ts                # PexRTC TypeScript definitions
└── utils/
    ├── media.ts                 # Media helper functions
    ├── meetingDate.ts            # Date formatting and countdown
    ├── meetingProvider.ts        # Provider detection from aliases
    └── stateTheme.ts            # Semantic state theming (muted, audio-only, etc.)

electron/
├── main.js                      # Window management, IPC handlers, permissions
├── preload.js                   # Context-isolated API bridge
└── transcription.js             # Sherpa-ONNX speech recognition worker

public/
├── pcm-worklet.js               # AudioWorklet for 16kHz PCM capture
├── ringtone[1-8].mp3            # Incoming call ringtones
├── noise.svg                    # Tileable background texture
└── icons/                       # Provider logos (Google Meet, Teams, Zoom, etc.)
```

### Request Lifecycle

```
User clicks "Join" in PreflightModal
  -> PexRTC loaded dynamically from Pexip node
  -> PexRTCConnectionManager.connect() establishes WebRTC session
  -> PexipContext broadcasts connection state to all components
  -> Meeting page renders far-side video + controls
  -> Side panels (chat, transcript, participants) via DockPanel
```

### State Management

| Layer | Mechanism |
|-------|-----------|
| **Conference state** | PexipContext (React Context) |
| **SIP registration** | RegistrationContext (EventSource + heartbeat) |
| **Picture-in-Picture** | PipContext (documentPictureInPicture API) |
| **User settings** | localStorage via useSettings hook (syncs across tabs) |
| **Theme** | localStorage via useTheme hook (CSS variables applied at load) |

### Theme System

Themes are defined in `src/themes/themes.ts` with the `CosmeticTheme` interface:

- **4 categories**: Dark, Light, Luxury Dark, Luxury Light
- Each theme specifies: gradient background, wave color, accent color, text colors, card backgrounds, and opacity-based surface values
- **Semantic state theming** overlays visual feedback for call states: muted (privacy mesh), audio-only, broadcasting, late
- Themes are applied instantly via CSS custom properties (no flash on load)

---

## Environment Variables

Copy `.env.example` to `.env.local` and configure as needed:

### Server-Side (used by API routes)

| Variable | Description | Required |
|----------|-------------|----------|
| `PEXIP_OTJ_AUTH_URL` | Pexip OAuth endpoint | For calendar integration |
| `PEXIP_OTJ_API_URL` | Pexip OTJ API endpoint | For calendar integration |
| `PEXIP_OTJ_CLIENT_ID` | OTJ OAuth client ID | For calendar integration |
| `PEXIP_OTJ_CLIENT_SECRET` | OTJ OAuth client secret | For calendar integration |
| `PEXIP_CUSTOMER_ID` | Pexip customer ID | For Teams CVI dial strings |

### Client-Side

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_GOOGLE_DOMAIN` | Google Meet CVI gateway domain | For Google Meet dial strings and provider detection |
| `NEXT_PUBLIC_TEAMS_DOMAIN` | Teams CVI gateway domain | For provider detection on incoming aliases |
| `NEXT_PUBLIC_PEXIP_DOMAIN` | Pexip tenant domain suffix | For provider detection on incoming aliases |
| `NEXT_PUBLIC_TRANSCRIPTION_API_URL` | WebSocket transcription service URL | For live transcription |

### Future (Phase 2)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

> **Note**: OTJ credentials can also be provided per-user through the Settings modal, which passes them as headers to the API route. Environment variables serve as defaults.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server on port 3002 |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run electron:dev` | Launch Electron in development mode |
| `npm run electron:build` | Build Next.js + package as Electron .dmg |
| `npm run electron:pack` | Build + package Electron (unpacked, for testing) |
| `npm run download-models` | Download Sherpa-ONNX models for local transcription |

---

## Electron Desktop App

### Development

Start the Next.js dev server first, then launch Electron:

```bash
npm run dev          # Terminal 1
npm run electron:dev # Terminal 2
```

### Window Modes

| Mode | Size | Use Case |
|------|------|----------|
| **Compact** | 500 x 900 | Default home view |
| **Expanded** | 1220 x 900 | In-call with side panels |
| **Mini** | 320 x 180 | Floating webcam PiP (centers under camera) |

Mini mode joins calls fully muted with no preflight. It shows far-side video with a 64x48 self-view overlay and minimal controls (mic, camera, hang up).

### Building for macOS

```bash
npm run electron:build
```

This produces a `.dmg` in `dist-electron/`. The build includes:

- macOS entitlements for camera, microphone, and screen capture
- Dark mode support
- Sherpa-ONNX models bundled in `extraResources` (if downloaded)
- Code signing via `resources/entitlements.mac.plist`

### Local Transcription

For offline speech recognition in Electron:

```bash
npm run download-models   # Downloads Sherpa-ONNX Parakeet model
npm run electron:dev      # Models are loaded at runtime
```

The transcription worker (`electron/transcription.js`) processes 16kHz PCM audio via an AudioWorklet with 3-second decoding windows and per-speaker buffering.

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

Tests use **Vitest** with **Testing Library** for component testing and **jsdom** as the DOM environment.

---

## Troubleshooting

### "Cannot connect to node"

1. Verify your Pexip node domain is correct in Settings
2. Ensure the node is reachable from your network (try opening `https://<node>/api/client/v2/status` in a browser)
3. Check for CORS issues if running on a different origin than the node

### Camera or microphone not working

1. Check browser permissions (look for the camera icon in the address bar)
2. On macOS, verify System Settings > Privacy & Security > Camera/Microphone permissions
3. In Electron, permissions are requested on first use -- restart the app if denied accidentally

### OTJ calendar shows no meetings

1. Verify OTJ credentials in Settings or `.env.local`
2. Check that the OTJ portal has calendar sources configured
3. Look at the browser console for API errors from `/api/meetings`

### Electron app shows blank screen

1. Make sure the Next.js dev server is running first (`npm run dev`)
2. Electron connects to `localhost:3002` in development mode
3. Check the Electron dev tools console (opens automatically in dev)

### Teams dial string fails

1. Ensure `PEXIP_CUSTOMER_ID` is set in `.env.local` or in Settings
2. The Teams API route (`/api/dial-string/teams`) requires this value server-side

### Transcription not appearing

- **Live mode**: Requires a WebSocket transcription service at the URL configured in `NEXT_PUBLIC_TRANSCRIPTION_API_URL`
- **Local mode**: Requires Electron + downloaded ONNX models (`npm run download-models`)

---

## License

MIT. See [LICENSE](LICENSE) for details.

Fuse Video Client is an independent open-source project and is not officially affiliated with or endorsed by Pexip. "Pexip" and "Pexip Infinity" are trademarks of Pexip AS.
