# UnderLeaf Project Report

## 1. Product Specification

**UnderLeaf** is a modern, zero-configuration LaTeX Integrated Development Environment (IDE) built using a locally bundled Tectonic engine. It embraces a local-first philosophy to bring the frictionless, batteries-included experience of cloud services directly down to native desktop environments.

### Technology Stack & Tools Utilized
- **App Framework (Wails v3):** Creates a native desktop binary cleanly paired with a web frontend, entirely bypassing the heavy memory overhead of Electron.
- **TeX Engine (Tectonic):** A single bundled Rust binary compiler that automatically fetches and caches missing scientific packages entirely on demand.
- **Frontend (React + Vite):** A blazing-fast UI framework guaranteeing minimal runtime overhead and instantaneous reactivity for the interface.
- **Editor Core (CodeMirror 6):** Selected for its modular architecture and advanced Decoration API, which is strictly required to inject Ghost Previews correctly over text.
- **AST Parser (Go Participle):** Integrates natively with the Go backend to construct dynamic Abstract Syntax Trees directly from LaTeX text streams.
- **Math Preview (KaTeX):** Renders mathematical Ghost Previews at sub-millisecond speeds natively inline, without requiring a server round-trip.
- **PDF Rendering (PDF.js):** A battle-tested PDF renderer explicitly driving the visual compilation targets on the live split-pane logic.

### System Architecture & Data Flow
The UnderLeaf live compilation architecture tightly runs a unified five-step cycle systematically driven by a debounced event loop:
1. **File Change (500ms debounce):** The user pauses typing in the editor, and CodeMirror automatically triggers an update payload.
2. **Incremental Parse:** The Go backend seamlessly evaluates the file delta and updates the internal AST natively.
3. **Tectonic Call:** Wails fetches any missing packages required by the AST and safely invokes the local Tectonic engine.
4. **Signal Emission:** Wails formally emits a `compile:success` event across the IPC bridge to the frontend boundary.
5. **Interface Refresh:** The split-pane PDF.js viewer smoothly reloads from the new blob URL output buffer, while all interactive Ghost Previews organically update.

### Performance Targets
- **< 100ms** AST Preview Latency, contained in a **< 100MB** standalone distribution binary.

---

## 2. Usefulness of the Product

Writing complex scientific or mathematical papers is severely hindered by archaic LaTeX workflows. The standard setup demands gigabytes of `TeX Live` installations, frustrating PATH adjustments, and fractured text editors. 

UnderLeaf radically solves this. A researcher can open UnderLeaf on a fresh computer without any pre-requisite installations, type their code, and instantaneously see the compiled PDF. It absolutely eliminates setup barriers, permanently respects data privacy via strict offline local operation, and intuitively bridges the gap between raw code and visual feedback.

---

## 3. Availability of Similar Products in the Market

There are three primary alternatives serving the market: Overleaf, TeXstudio, and VS Code. UnderLeaf fundamentally outperforms them in zero-friction offline usability:

| Capability | TeXstudio | Overleaf | UnderLeaf |
| :--- | :--- | :--- | :--- |
| **Setup Experience** | Manual TeX Live install | Web (No install) | **Zero-config native binary** |
| **Math Preview** | Split-screen only | Split-screen only | **Inline Ghost Previews** |
| **Image Handling** | Manual copy + code | Upload + manual code | **Drag-drop + auto-injection** |
| **Version History** | None | Pro plan only | **Always-on local snapshots** |
| **Offline Use** | Full | None | **Full** |

---

## 4. What is Novel/New in Your Product

UnderLeaf pushes past conventional IDE paradigms with highly experimental formatting integrations designed to remove the "coding" aspect from document writing:

1. **Magic Tables (WYSIWYG Spreadsheet Mode):** Instead of manually managing ampersands (`&`) and line breaks (`\\`), UnderLeaf automatically detects `tabular` blocks. With one click, it overlays a Notion-style graphical spreadsheet, allowing users to visually adjust rows and columns. Saving the grid regenerates flawlessly padded LaTeX source autonomously.
2. **Ghost Previews (Interactive Math):** Inline math commands are parsed via a custom AST and rendered instantaneously using KaTeX directly above the code cursor, masking raw variables beneath beautiful visual overlays. 
3. **Local "Time Travel" Snapshots:** Circumvents the complexity of tools like Git by establishing an integrated, local snapshot versioning ring. Users explore the Timeline sidebar visually to browse and restore past versions.
4. **Drag-and-Drop Assets:** Bypassing traditional LaTeX filepath struggles, moving an image onto the editor automatically shifts it to a local asset directory and generates the exact `\begin{figure}` macro at the cursor block.
5. **Command Palette & Keyboard-First Design:** An integrated `Cmd+K` / `Ctrl+P` search palette specifically targeted at users seeking frictionless navigation, searching citations, jumping sections, and deploying rapid snippets without utilizing a mouse.

---

## 5. Individual Contribution of Each Member of the Group

The project architecture required intense, highly optimized execution across network interfaces, concurrent logic loops, UI elements, and parsers:

* **Yashdeep (123CS0077) -- Native Systems & OS Bridge:** 
  Solely owned the architecture and deployment of the Wails backend framework. They managed the bidirectional IPC event bus seamlessly linking Go with React, successfully achieving the difficult latency targets by bounding the React states to Go without blocking concurrency loops.
* **Ayush Rewenshete (523CS0020) -- Frontend & Visual Tools:** 
  Completely architected the React interface and the complex split-pane UI scaling. They developed the custom CodeMirror 6 plugins required to inject UI widgets natively into text streams, seamlessly binding the *Magic Tables* WYSIWYG spreadsheet integration over LaTeX structural code.
* **Vishal Kumar (123AD0052) -- Version Control & Assets:** 
  Engineered the heavily optimized filesystem logic driving the local *Time Travel* storage arrays and frontend Timeline. They constructed highly redundant, optimized local storage snapshots to ensure 100% state safety with zero Git dependencies, along with native Drag-and-Drop deployment tools.
* **Chaitanya Jambhulkar (123AD0045) -- Parsers & Base Compilers:** 
  Managed the Zero-config Tectonic CLI integration loops and led the development of the Go Participle AST parsers driving Context-Aware LSP algorithms. They engineered the intricate tokenization engine tracking mathematical delimiters for *Ghost Previews*, mitigating KaTeX flickering through localized debounced synchronization cycles.
