import { CompletionContext, CompletionResult, Completion, autocompletion } from '@codemirror/autocomplete';
import { ReadFile, ListFiles } from '../../bindings/Underleaf/backend/project/service.js';

// ─── Static LaTeX command list ─────────────────────────────────────────────────

const LATEX_CMDS: Completion[] = [
  // Structure
  { label: '\\documentclass', detail: 'Document class declaration', type: 'keyword' },
  { label: '\\usepackage', detail: 'Import a package', type: 'keyword' },
  { label: '\\begin', detail: 'Begin environment', type: 'keyword' },
  { label: '\\end', detail: 'End environment', type: 'keyword' },
  { label: '\\section', detail: 'Section heading', type: 'keyword' },
  { label: '\\subsection', detail: 'Subsection heading', type: 'keyword' },
  { label: '\\subsubsection', detail: 'Subsubsection', type: 'keyword' },
  { label: '\\paragraph', detail: 'Paragraph heading', type: 'keyword' },
  { label: '\\chapter', detail: 'Chapter heading', type: 'keyword' },
  { label: '\\title', detail: 'Document title', type: 'keyword' },
  { label: '\\author', detail: 'Document author', type: 'keyword' },
  { label: '\\date', detail: 'Document date', type: 'keyword' },
  { label: '\\maketitle', detail: 'Generate title block', type: 'keyword' },
  { label: '\\tableofcontents', detail: 'Generate table of contents', type: 'keyword' },
  // References & Citations
  { label: '\\label', detail: 'Define a label', type: 'keyword', apply: '\\label{}' },
  { label: '\\ref', detail: 'Reference a label', type: 'keyword', apply: '\\ref{}' },
  { label: '\\pageref', detail: 'Reference a page', type: 'keyword', apply: '\\pageref{}' },
  { label: '\\cite', detail: 'Cite a reference', type: 'keyword', apply: '\\cite{}' },
  { label: '\\bibliography', detail: 'Include bibliography', type: 'keyword' },
  { label: '\\bibliographystyle', detail: 'Set bibliography style', type: 'keyword' },
  // Math
  { label: '\\frac', detail: 'Fraction', type: 'function', apply: '\\frac{}{}' },
  { label: '\\sqrt', detail: 'Square root', type: 'function', apply: '\\sqrt{}' },
  { label: '\\sum', detail: 'Summation', type: 'function' },
  { label: '\\int', detail: 'Integral', type: 'function' },
  { label: '\\prod', detail: 'Product', type: 'function' },
  { label: '\\lim', detail: 'Limit', type: 'function' },
  { label: '\\infty', detail: 'Infinity', type: 'constant' },
  { label: '\\alpha', detail: 'Greek letter α', type: 'constant' },
  { label: '\\beta', detail: 'Greek letter β', type: 'constant' },
  { label: '\\gamma', detail: 'Greek letter γ', type: 'constant' },
  { label: '\\delta', detail: 'Greek letter δ', type: 'constant' },
  { label: '\\epsilon', detail: 'Greek letter ε', type: 'constant' },
  { label: '\\theta', detail: 'Greek letter θ', type: 'constant' },
  { label: '\\lambda', detail: 'Greek letter λ', type: 'constant' },
  { label: '\\mu', detail: 'Greek letter μ', type: 'constant' },
  { label: '\\pi', detail: 'Greek letter π', type: 'constant' },
  { label: '\\sigma', detail: 'Greek letter σ', type: 'constant' },
  { label: '\\omega', detail: 'Greek letter ω', type: 'constant' },
  { label: '\\Omega', detail: 'Greek letter Ω', type: 'constant' },
  { label: '\\nabla', detail: 'Nabla / del operator', type: 'constant' },
  { label: '\\partial', detail: 'Partial derivative', type: 'constant' },
  { label: '\\cdot', detail: 'Center dot', type: 'constant' },
  { label: '\\times', detail: 'Times / cross product', type: 'constant' },
  { label: '\\leq', detail: 'Less than or equal', type: 'constant' },
  { label: '\\geq', detail: 'Greater than or equal', type: 'constant' },
  { label: '\\neq', detail: 'Not equal', type: 'constant' },
  { label: '\\approx', detail: 'Approximately equal', type: 'constant' },
  { label: '\\in', detail: 'Element of', type: 'constant' },
  { label: '\\subset', detail: 'Subset', type: 'constant' },
  { label: '\\cup', detail: 'Set union', type: 'constant' },
  { label: '\\cap', detail: 'Set intersection', type: 'constant' },
  { label: '\\forall', detail: 'For all', type: 'constant' },
  { label: '\\exists', detail: 'There exists', type: 'constant' },
  { label: '\\mathbb', detail: 'Blackboard bold', type: 'function', apply: '\\mathbb{}' },
  { label: '\\mathbf', detail: 'Bold math', type: 'function', apply: '\\mathbf{}' },
  { label: '\\mathrm', detail: 'Roman math', type: 'function', apply: '\\mathrm{}' },
  { label: '\\text', detail: 'Text in math', type: 'function', apply: '\\text{}' },
  { label: '\\overline', detail: 'Overline', type: 'function', apply: '\\overline{}' },
  { label: '\\underbrace', detail: 'Underbrace', type: 'function', apply: '\\underbrace{}' },
  { label: '\\hat', detail: 'Hat accent', type: 'function', apply: '\\hat{}' },
  { label: '\\vec', detail: 'Vector arrow', type: 'function', apply: '\\vec{}' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractLabels(docText: string): string[] {
  const re = /\\label\{([^}]+)\}/g;
  const labels: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(docText)) !== null) labels.push(m[1]);
  return labels;
}

// Bib cache with expiration (30s)
let bibCache: { projectPath: string; keys: string[]; lastFetched: number } = { projectPath: '', keys: [], lastFetched: 0 };

async function fetchBibKeys(projectPath: string): Promise<string[]> {
  if (!projectPath) return [];
  
  const now = Date.now();
  if (bibCache.projectPath === projectPath && (now - bibCache.lastFetched) < 30000) {
    return bibCache.keys;
  }

  try {
    const root = await ListFiles(projectPath);
    if (!root || !root.children) return [];

    const bibFiles: string[] = [];
    const findBib = (node: any) => {
      if (!node.isDir && node.name.endsWith('.bib')) bibFiles.push(node.path);
      if (node.children) node.children.forEach(findBib);
    };
    findBib(root);

    const keys: string[] = [];
    for (const bibPath of bibFiles) {
      const content = await ReadFile(bibPath);
      const re = /@\w+\{([^,\s]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) keys.push(m[1]);
    }
    
    bibCache = { projectPath, keys, lastFetched: now };
    return keys;
  } catch {
    return [];
  }
}

// ─── Main completion source ───────────────────────────────────────────────────

export function latexCompletionSource(getProjectPath: () => string) {
  return async function(context: CompletionContext): Promise<CompletionResult | null> {
    const docText = context.state.doc.toString();

    // ── \ref{ → labels
    const refMatch = context.matchBefore(/\\ref\{[^}]*/);
    if (refMatch) {
      const labels = extractLabels(docText);
      return {
        from: refMatch.from + 5,
        options: labels.map(l => ({ label: l, type: 'variable', detail: 'label' })),
        validFor: /^[^}]*$/,
      };
    }

    // ── \cite{ → bib keys
    const citeMatch = context.matchBefore(/\\cite\{[^}]*/);
    if (citeMatch) {
      const projectPath = getProjectPath();
      if (!projectPath) return null;
      const keys = await fetchBibKeys(projectPath);
      return {
        from: citeMatch.from + 6,
        options: keys.map(k => ({ label: k, type: 'variable', detail: 'citation' })),
        validFor: /^[^}]*$/,
      };
    }

    // ── \<command>
    const cmdMatch = context.matchBefore(/\\[a-zA-Z]*/);
    if (cmdMatch) {
      return {
        from: cmdMatch.from,
        options: LATEX_CMDS,
        validFor: /^\\[a-zA-Z]*$/,
      };
    }

    return null;
  };
}

export function latexAutocomplete(getProjectPath: () => string) {
  return autocompletion({
    override: [latexCompletionSource(getProjectPath)],
    activateOnTyping: true,
  });
}
