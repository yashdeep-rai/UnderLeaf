<div align="center">

<img src="frontend/src/logo.svg" width="96" height="96" alt="Underleaf logo" />

# Underleaf

**A professional, offline-first LaTeX IDE for Windows — built with Go + React.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Built with Wails](https://img.shields.io/badge/Built%20with-Wails%20v3-blue)](https://v3.wails.io/)
[![Powered by Tectonic](https://img.shields.io/badge/Engine-Tectonic-orange)](https://tectonic-typesetting.github.io/)
[![React](https://img.shields.io/badge/Frontend-React%2018-61dafb)](https://react.dev/)

</div>

---

## What is Underleaf?

Underleaf is a **self-contained desktop LaTeX editor** that ships everything you need in a single `.exe`. No TeX Live installation, no PATH variables, no internet connection required after first use.

It combines a full-featured code editor with PDF.js preview, KaTeX inline math rendering, automatic snapshot versioning, and an AI assistant — all in one window.

> **Inspired by Overleaf, built for the desktop.** Every feature Overleaf gates behind a Pro plan is free and local in Underleaf.

---

## ✨ Features

### 🔧 Zero-Configuration Setup
- **Tectonic engine is bundled inside the binary.** Launch the app, open a `.tex` file, click Compile — it works. No external dependencies.
- First compile automatically downloads required LaTeX packages via Tectonic's CTAN mirror. Subsequent compiles are fully offline.

### ✍️ Smart Editor
- **CodeMirror 6** editor with LaTeX syntax highlighting
- **Inline KaTeX previews** — math environments render in-place above the cursor as you type, no compile needed
- **Context-aware autocomplete** — `\cite{}` pulls from your `.bib`, `\ref{}` suggests your `\label{}` tags
- **Command Palette** (`Ctrl+K`) — compile, jump to sections, insert snippets, all without touching the mouse
- **Drag-and-drop image pipeline** — drop any image into the editor; it's moved to `/assets`, converted to a TeX-compatible format, and a complete `\begin{figure}` block is injected automatically

### 👁️ Live Preview
- **Dual-mode rendering:** KaTeX for instant keystroke-speed math previews; PDF.js for full-fidelity compiled output
- **Auto-compile** — debounced compilation triggers on every change; disable with one click for large documents
- **Resizable split-pane** layout with drag handles

### ⏪ Time Travel (Automatic Snapshots)
- Every successful compile saves a snapshot of the source and the output PDF
- **Timeline sidebar** — browse and restore any past version of your document
- No Git knowledge required. Always on, always local.
- *Overleaf charges $19/month for this. Underleaf ships it for free.*

### 🧮 Magic Tables
- LaTeX tables (`\begin{tabular}`) are notoriously painful to write
- Underleaf detects table environments and offers a **Notion-style spreadsheet overlay** — click cells, add columns, drag to resize
- The spreadsheet auto-translates back into perfectly aligned raw LaTeX

### 🤖 AI Orchestrator (🚧 Under Development )
- Multi-provider health monitor for local LLM servers (Ollama, LM Studio, etc.)
- Automatically routes requests to the healthiest available model
- Falls back gracefully when no AI is available — the editor is fully usable without it

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Desktop shell** | [Wails v3](https://v3.wails.io/) (Go + WebView2) |
| **LaTeX engine** | [Tectonic](https://tectonic-typesetting.github.io/) (bundled via `go:embed`) |
| **Frontend** | React 18 + TypeScript |
| **Editor** | CodeMirror 6 |
| **Math rendering** | KaTeX |
| **PDF rendering** | PDF.js |
| **LaTeX parsing** | Go + Participle (custom grammar) |
| **Styling** | Vanilla CSS (Plus Jakarta Sans) |
| **Build tool** | Vite 5 |

---

## 🚀 Getting Started

### Prerequisites

- [Go 1.22+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails v3 CLI](https://v3.wails.io/getting-started/installation/): `go install github.com/wailsapp/wails/v3/cmd/wails3@latest`
- `tectonic.exe` placed at `bin/tectonic.exe` *(required at build time only — embedded into the binary)*
  - Download from [tectonic-typesetting.github.io](https://tectonic-typesetting.github.io/en-US/install.html)

### Development

```bash
# Clone the repo
git clone https://github.com/yashdeep-rai/UnderLeaf.git
cd UnderLeaf

# Run in development mode (hot-reload)
wails3 dev
```

### Build

```bash
# Production build — outputs a single self-contained bin/UnderLeaf.exe
wails3 build
```

The resulting `bin/UnderLeaf.exe` (~60 MB) contains:
- The Go/Wails application runtime
- The complete React frontend (bundled)
- `tectonic.exe` (embedded via `go:embed`)

On first launch, `tectonic.exe` is extracted to `%LOCALAPPDATA%\UnderLeaf\` with SHA-256 change detection — subsequent launches skip extraction entirely.

---

## 🗂️ Project Structure

```
UnderLeaf/
├── main.go                    # App entry point, window setup, service registration
├── backend/
│   ├── engine/
│   │   ├── compiler.go        # Tectonic invocation, log parsing, error extraction
│   │   └── extractor.go       # Embedded binary extraction + SHA-256 caching
│   ├── project/
│   │   ├── service.go         # Project CRUD, file I/O, zip import
│   │   └── snapshotservice.go # Time Travel snapshot save/restore
│   ├── ast/                   # Go Participle LaTeX AST parser
│   └── ai/                    # Multi-provider LLM orchestrator
├── frontend/
│   └── src/
│       ├── App.tsx            # Main IDE layout (nav, editor, viewer, timeline)
│       ├── components/
│       │   ├── Editor.tsx     # CodeMirror 6 + KaTeX decorations
│       │   ├── Viewer.tsx     # PDF.js renderer
│       │   ├── FileExplorer.tsx
│       │   ├── CommandPalette.tsx
│       │   ├── WelcomeScreen.tsx
│       │   ├── TimelineSidebar.tsx
│       │   └── MagicTableEditor.tsx
│       └── hooks/
│           ├── useCompiler.ts # Compile loop, debounce, error state
│           └── useDebounce.ts
├── build/
│   ├── appicon.png            # Source icon (1024x1024)
│   └── windows/icon.ico       # Generated Windows icon
└── tectonic_embed_windows.go  # go:embed directive for tectonic.exe
```

---

## 🖥️ Screenshots

> *Coming soon — run `wails3 dev` to see it live.*

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes and test with `wails3 dev`
4. Submit a Pull Request with a clear description of the change

Please open an issue first for significant changes so we can discuss the approach.

---

## 📄 License

Apache 2.0 © Yashdeep Rai

---

<div align="center">
  <sub>Built with ❤️ using <a href="https://v3.wails.io/">Wails</a> and <a href="https://tectonic-typesetting.github.io/">Tectonic</a></sub>
</div>
