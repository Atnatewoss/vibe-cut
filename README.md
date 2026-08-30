# Vibe Cut

A desktop video IDE that lets you vibe-code motion graphics and launch videos the same way Cursor lets you vibe-code software. Built with React, Remotion, and Tauri.

## What it is

Vibe Cut is a local-first video editor designed for indie hackers and founders who need high-quality launch videos without the friction of traditional NLE software. The core idea: code is the source of truth. Everything is React and Remotion components.

- Drop in shadcn, your own components, or let the agent write them
- Real multi-track timeline with live preview
- Deep agent integration that can read and edit the timeline, write React components, and iterate with you
- Looks and feels like a professional IDE, not a consumer video editor

## Architecture

```
Left:     Media / Effects / Audio / Templates library
Center:   Live preview + multi-track timeline
Right:    Agentic chat panel (Cursor-style)
```

The layout is modeled after professional NLEs (DaVinci Resolve, Premiere Pro, Final Cut Pro) with a Cursor-like agent panel on the right.

## Tech Stack

- **React 19** with TypeScript
- **Tauri 2** for the desktop shell (local-first, private)
- **Tailwind CSS 4** for styling
- **ffmpeg.wasm** for background proxy transcoding
- **Vite 7** for dev server and bundling

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Rust toolchain (for Tauri)

### Install

```bash
pnpm install
```

### Dev (browser)

```bash
pnpm dev
```

Opens at `http://localhost:5173`.

### Dev (Tauri desktop)

```bash
pnpm tauri dev
```

### Build

```bash
pnpm tauri build
```

## Features

### Media Library

- Import video, image, and audio files via drag-and-drop or file picker
- Thumbnail grid with duration badges (DaVinci Resolve style)
- Deduplication prevents importing the same file twice
- Built-in sample assets for testing

### Timeline

- Multi-track layout (V1-V4 video, A1-A4 audio) with dynamic track creation
- Drag-and-drop from library to timeline
- Double-click to add media to timeline
- Clip dragging, trimming (edge handles), and splitting at playhead
- Snap to playhead, clip edges, and timeline start
- Zoom in/out (25%-400%)
- Draggable playhead for scrubbing
- Track controls: Mute, Solo, Lock

### Preview

- Real video/image playback using native HTML elements
- Transport bar with play/pause
- Time display synced with playhead
- Clean, dark canvas background

### Agent Panel

- Cursor-style chat interface on the right side
- Agent can read and edit the timeline
- Skill selector and context attachment

### Keyboard Shortcuts

- `Space` -- Play / Pause
- `Delete` / `Backspace` -- Delete selected clip
- `Ctrl+S` -- Split clip at playhead

## Project Structure

```
src/
  App.tsx                  Main layout and state management
  index.css                Global styles and CSS variables
  main.tsx                 Entry point
  components/
    library-panel.tsx      Media, Effects, Audio, Templates tabs
    preview.tsx            Video/image preview and transport bar
    timeline.tsx           Multi-track timeline with clips
    agent-panel.tsx        AI agent chat panel
    top-bar.tsx            Top navigation bar
    activity-bar.tsx       Sidebar icon strip
    ui/                    Shared UI components
  lib/
    dnd.ts                 Drag-and-drop payload system
    media-store.ts         File import, thumbnails, proxy transcoding
    demo-media.ts          Sample assets for testing
    utils.ts               Utility functions
    files.ts               File helpers
```

## How Media Import Works

1. Drop a file onto the media panel or click to browse
2. Thumbnail is generated via Canvas API (video frames captured at 1s)
3. File plays immediately using the original
4. Proxy transcoding runs in background via ffmpeg.wasm (optional, for smoother scrubbing)
5. Double-click or drag the thumbnail to add it to the timeline

## License

Private. All rights reserved.
