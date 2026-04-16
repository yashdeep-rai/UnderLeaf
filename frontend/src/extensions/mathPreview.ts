import {
  RangeSetBuilder,
} from '@codemirror/state';
import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// ─── KaTeX Widget ─────────────────────────────────────────────────────────────

class MathWidget extends WidgetType {
  constructor(readonly source: string, readonly displayMode: boolean) {
    super();
  }

  eq(other: MathWidget) {
    return this.source === other.source && this.displayMode === other.displayMode;
  }

  toDOM() {
    const wrap = document.createElement(this.displayMode ? 'div' : 'span');
    wrap.className = `cm-math-preview ${this.displayMode ? 'block' : 'inline'}`;
    wrap.style.cssText = this.displayMode
      ? 'display:block;text-align:center;padding:6px 0;cursor:pointer;'
      : 'cursor:pointer;';
    try {
      const inner = this.displayMode
        ? this.source.replace(/^\$\$|\$\$$|^\\\[|\\\]$/g, '').trim()
        : this.source.replace(/^\$|\$$/g, '').trim();
      katex.render(inner, wrap, {
        displayMode: this.displayMode,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      wrap.textContent = this.source;
    }
    return wrap;
  }
}

// ─── Regex patterns ───────────────────────────────────────────────────────────

const RE_DISPLAY = /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$)/g;
const RE_INLINE  = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g;

// ─── Optimized ViewPlugin ─────────────────────────────────────────────────────

export const mathDecorationsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDeco(view);
    }

    update(update: ViewUpdate) {
      // Optimization: only rebuild if document changed or viewport scrolled
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDeco(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

function buildDeco(view: EditorView): DecorationSet {
  try {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = view.state.doc;
    const cursorPos = view.state.selection.main.head;
    const { visibleRanges } = view;

    const ranges: { from: number; to: number; display: boolean; source: string }[] = [];

    // Scan only visible ranges + small buffer for smoothness
    for (const { from, to } of visibleRanges) {
      const scanFrom = Math.max(0, from - 1000);
      const scanTo = Math.min(doc.length, to + 1000);
      const text = doc.sliceString(scanFrom, scanTo);

      // Display math
      RE_DISPLAY.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = RE_DISPLAY.exec(text)) !== null) {
        const start = scanFrom + m.index;
        const end = start + m[0].length;
        ranges.push({ from: start, to: end, display: true, source: m[0] });
      }

      // Inline math
      RE_INLINE.lastIndex = 0;
      while ((m = RE_INLINE.exec(text)) !== null) {
        const start = scanFrom + m.index;
        const end = start + m[0].length;
        if (!ranges.some(r => start >= r.from && end <= r.to)) {
          ranges.push({ from: start, to: end, display: false, source: m[0] });
        }
      }
    }

    // Sort and deduplicate
    ranges.sort((a, b) => a.from - b.from);
    
    let lastTo = -1;
    for (const r of ranges) {
      if (r.from < lastTo) continue; // skip overlapping
      
      // Don't render widget if cursor is inside
      if (cursorPos >= r.from && cursorPos <= r.to) {
        lastTo = r.to;
        continue;
      }

      builder.add(r.from, r.to, Decoration.replace({
        widget: new MathWidget(r.source, r.display),
        inclusive: false,
      }));
      lastTo = r.to;
    }

    return builder.finish();
  } catch (e) {
    console.warn("Math preview error", e);
    return Decoration.none;
  }
}

export const mathASTField = { extension: [] };
export const setMathAST = { of: (_: any) => ({}) };
