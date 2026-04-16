import {
  RangeSetBuilder,
  StateField,
  StateEffect,
  Transaction
} from '@codemirror/state';
import {
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';

// Effect to notify React about which table the user wants to edit
export const openTableEditorEffect = StateEffect.define<{from: number, to: number, source: string}>();

class TableWandWidget extends WidgetType {
  constructor(readonly from: number, readonly to: number, readonly source: string) {
    super();
  }

  eq(other: TableWandWidget) {
    return this.from === other.from && this.to === other.to && this.source === other.source;
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('div');
    wrap.className = `cm-table-wand-widget`;
    wrap.style.cssText = 'display:block; text-align:right; margin-top:-20px; z-index:10; position:relative; height: 0px;';
    
    const btn = document.createElement('button');
    btn.innerHTML = '🪄 Edit Table';
    btn.style.cssText = `
      background: #bbf7d0; color: #166534; font-weight: 700; font-size: 11px;
      padding: 4px 8px; border: 1px solid #22c55e; border-radius: 4px;
      cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      transform: translateY(-100%);
    `;
    
    btn.onclick = (e) => {
      e.preventDefault();
      view.dispatch({
        effects: [openTableEditorEffect.of({ from: this.from, to: this.to, source: this.source })]
      });
    };

    wrap.appendChild(btn);
    return wrap;
  }
}

// Regex to quickly find tabular blocks
const RE_TABLE = /\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g;

export const tableDecorationsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDeco(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
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
    const { visibleRanges } = view;

    const ranges: { from: number; to: number; source: string }[] = [];

    for (const { from, to } of visibleRanges) {
      const scanFrom = Math.max(0, from - 1000);
      const scanTo = Math.min(doc.length, to + 1000);
      const text = doc.sliceString(scanFrom, scanTo);

      RE_TABLE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = RE_TABLE.exec(text)) !== null) {
        const start = scanFrom + m.index;
        const end = start + m[0].length;
        ranges.push({ from: start, to: end, source: m[0] });
      }
    }

    // Sort to ensure order
    ranges.sort((a, b) => a.from - b.from);
    
    let lastTo = -1;
    for (const r of ranges) {
      if (r.from < lastTo) continue; 
      
      // Inject widget BEFORE the \begin{tabular}
      builder.add(r.from, r.from, Decoration.widget({
        widget: new TableWandWidget(r.from, r.to, r.source),
        side: -1
      }));
      
      lastTo = r.to;
    }

    return builder.finish();
  } catch (e) {
    console.warn("Table preview error", e);
    return Decoration.none;
  }
}
