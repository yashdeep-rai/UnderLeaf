Here's the full feature breakdown from the spec, ordered Phase 1.1 through the unphased work, sorted from basic/MVP to novel:

---

**Phase 1.1 — Skeleton**
- (MVP) Wails project + split-pane layout: Initialize the app shell with CodeMirror on the left and a PDF viewer placeholder on the right. The foundation everything else builds on.

**Phase 1.2 — Engine Bridge**
- (MVP) Zero-config setup: Tectonic ships inside the binary. User opens the app, it compiles. No TeX Live install, no PATH configuration.
- (MVP) Tectonic compile loop: Go wrapper calls the bundled Tectonic engine, compiles a .tex file, displays result in PDF.js. Establishes the compile:success / compile:error event bus.

**Phase 1.3 — AST Layer**
- (MVP) Go Participle parser: Grammar for \section, \label, math environments, and the @bind tag. The platform layer that powers Ghost Previews and Data Binding — everything novel is built on top of this.

**Phase 1.4 — Ghost Previews**
- (MVP) Dual-mode preview (KaTeX + PDF.js): KaTeX for keystroke-speed inline math rendering; PDF.js for full-fidelity compiled output. Two layers, two purposes, zero redundancy.
- (Novel) Inline KaTeX via CodeMirror decorations: AST identifies the specific math block under the cursor, KaTeX renders only that block inline above the line being edited. Feels like editing a live document, not source code.

**Phase 1.5 — Error AI**
- (Novel) Ollama log-physician panel: On compile:error, the raw TeX log is sent to a local Ollama instance on a separate goroutine. Response streams into a dedicated panel with one-click fix application. Fully offline, no API key required. Addresses the #1 reason students quit LaTeX.

**Phase 1.6 — Data Binding**
- (Novel) Live CSV / JSON watcher: fsnotify watches bound data files. On change, re-generates the linked LaTeX table and triggers a recompile. LaTeX becomes the view layer for your data. Explicitly called out in the spec as the feature that defines the product's identity.

---

**Core Features (unphased — must ship as baseline)**
- (MVP) Command palette (Cmd+K / Ctrl+P): Compile, jump to sections, search citations, insert snippets — keyboard-first, designed for users who don't touch the mouse.
- (MVP) Context-aware LSP autocomplete: Parses .bib files for citation key and author suggestions; parses \label{} tags for cross-reference completion. Not just LaTeX commands — your actual content.

**Novel Features (unphased — differentiators)**
- (Novel) Drag-and-drop asset pipeline: Drop any image into the editor. Backend moves it to /assets, converts to a TeX-compatible format, and injects a ready-to-use \begin{figure} block with a generated label.
- (Expected) Automatic snapshot versioning / "Time Travel": Every successful compile snapshots the .tex source and output PDF. A Timeline sidebar lets you browse and restore any past version. No Git knowledge required. Always on, always local — Overleaf gates this behind a Pro plan.