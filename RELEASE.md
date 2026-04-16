# UnderLeaf v1.0.0

Welcome to the first major release of UnderLeaf! This update brings a massive overhaul to the compilation engine, asset management, and the overall UI/UX, transforming UnderLeaf into a powerful, zero-config LaTeX IDE.

## 🚀 Key Features

* **Zero-Config Tectonic Engine**: UnderLeaf now exclusively uses the Tectonic engine. It automatically downloads missing packages on the fly, meaning you no longer need a massive 2GB system TeX installation to write LaTeX! 
* **Smart Drag-and-Drop Asset Pipeline**: Just drag and drop an image directly into the editor! UnderLeaf will automatically:
  * Save the image into your project's `/assets` folder.
  * Inject `\usepackage{graphicx}` securely into your preamble if missing.
  * Auto-generate and insert a beautifully formatted `\begin{figure}` block right at your cursor.
* **Intelligent ZIP Imports**: You can now seamlessly import `.zip` archives (like those exported from Overleaf). UnderLeaf automatically detects and removes pesky nested top-level folders during extraction, dropping your files exactly where they belong.
* **Infinite PDF Preview Limit**: Powered by a robust Blob URL memory implementation, you can now seamlessly render and scroll through massive, 100+ page PDFs without freezing the viewer or hitting browser memory limits.

## ✨ UI/UX Refinements

* **Centered Command Loader**: Swapped out the old jittery bottom-bar for a sleek, frosted-glass compilation overlay that locks the screen while your document builds safely.
* **Dismissible Logs**: Compilation errors and warnings now live in a stylized interactive dropdown that can be fully dismissed into the background using the [X] button.
* **Warning Isolation**: Tectonic notes, font caches, and warning events are beautifully parsed. If your build completes with warnings but without fatal errors, you still get a successful render while keeping the warnings quietly accessible.
* **Fresh Aesthetics**: Removed default browser scrollbars and generic styling in favor of specialized, tailor-made aesthetic borders, vibrant state indicators, and premium CSS. 

## 🛠 Fixes

* **Fixed**: Zombie Vite server crashing Wails 3 hot-reloading configurations. 
* **Fixed**: Massive PDF `data:URI` string crash inside the `<Viewer>` component causing a blank white screen. 
* **Fixed**: TeX engine hard-halting abruptly on easily recoverable syntax errors. 
* **Fixed**: Fontconfig registry spam on Windows machines polluting the build terminal output.

## 🔮 Coming Soon (Roadmap)

* **Automatic Snapshot Versioning / "Time Travel"**: Every successful compile snapshots the `.tex` source and output PDF. A Timeline sidebar lets you browse and restore any past version seamlessly. No Git knowledge required. Always on, always local — a feature Overleaf gates behind a Pro plan!

---
**Installation Note**: The final standalone compiled executable can be found within the `/bin/` directory as `UnderLeaf.exe`. Just run it and start typing!
