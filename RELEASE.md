# UnderLeaf v0.0.3 Release Notes

**Build Status:** Production Ready 
**Target:** macOS / Windows / Linux

## 🚀 Major Features

* **Magic Tables (WYSIWYG Spreadsheet Mode):** Say goodbye to manually aligning `&` characters. Clicking the `🪄 Edit Table` wand above any `\begin{tabular}` block now launches a powerful, natively-bound spreadsheet directly over your code. Add rows, adjust columns visually, and UnderLeaf will flawlessly reconstruct beautifully padded raw LaTeX syntax back into your file automatically.
* **Interactive Ghost Previews (Math Overlays):** Seamlessly bridged KaTeX with our Go Participle AST. Mathematical configurations (`$$`, `\[`, etc.) now render directly inline *while* you edit, eliminating the frustrating visual blindness typical to TeX editors.

## 🛠️ Enhancements & Bug Fixes

* **Windows GUI Terminal Suppression:** Fully patched the `os/exec` architecture to execute Tectonic commands natively as hidden subprocesses using native `SysProcAttr`. Typing inside the CodeMirror active layout will no longer continuously pop black terminal screens in the background.
* **Smart File Extensions:** The sidebar File Explorer's creation logic will now proactively sanitize input. Creating a file named `my_document` natively defaults to `my_document.tex` ensuring your active research files correctly register against the compile watcher immediately.
* **Project Report Integration:** Included fully generated `Project_Report.md` and highly complex `Project_Report.tex` matrices detailing active project architectures and group contributions for your upcoming project defense.

## ⚙️ Core Architecture Upgrades
* Fully migrated layout structures and CSS constraint algorithms handling the Magic Tables module, enforcing strict layout boundaries that no longer bleed out of the viewport.
* Upgraded Wails build parameters to forcefully inject native `-H windowsgui` flags at compile time for pure, self-sufficient binaries.
