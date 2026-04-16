package ast

import (
	"regexp"
	"strings"
)

// ASTNode is the flat/JSON-friendly representation we send to the frontend.
type ASTNode struct {
	Type    string `json:"type"`    // e.g. "InlineMath", "Section", "Label", "BindTag"
	Content string `json:"content"` // The raw matched string or extracted argument
	Line    int    `json:"line"`    // 1-indexed
	Column  int    `json:"column"`  // 1-indexed
}

// Service is the Wails service for AST parsing.
type Service struct{}

// NewASTService initializes the AST parser service.
func NewASTService() *Service {
	return &Service{}
}

// Regex-based patterns — far more resilient than Participle for freeform LaTeX.
var (
	displayMathBracket = regexp.MustCompile(`(?s)\\\[(.*?)\\\]`)
	displayMathDollar  = regexp.MustCompile(`(?s)\$\$(.*?)\$\$`)
	inlineMath         = regexp.MustCompile(`\$([^$\n]+)\$`)
	bindTag            = regexp.MustCompile(`@bind\{([^}]+)\}`)
	sectionMacro       = regexp.MustCompile(`\\(section|subsection|subsubsection|chapter|part)\{([^}]*)\}`)
	labelMacro         = regexp.MustCompile(`\\label\{([^}]*)\}`)
)

// Parse digests the raw LaTeX string and returns a list of semantic AST nodes
// intended to power CodeMirror decorations (Ghost Previews) and Data Binding.
func (s *Service) Parse(source string) ([]ASTNode, error) {
	if strings.TrimSpace(source) == "" {
		return []ASTNode{}, nil
	}

	var nodes []ASTNode

	// Helper: convert absolute offset to line+col
	lineCol := func(src string, offset int) (int, int) {
		line, col := 1, 1
		for i, ch := range src {
			if i >= offset {
				break
			}
			if ch == '\n' {
				line++
				col = 1
			} else {
				col++
			}
		}
		return line, col
	}

	// Display math \[ ... \]
	for _, m := range displayMathBracket.FindAllStringIndex(source, -1) {
		ln, col := lineCol(source, m[0])
		nodes = append(nodes, ASTNode{
			Type:    "DisplayMath",
			Content: source[m[0]:m[1]],
			Line:    ln,
			Column:  col,
		})
	}

	// Display math $$ ... $$
	for _, m := range displayMathDollar.FindAllStringIndex(source, -1) {
		ln, col := lineCol(source, m[0])
		nodes = append(nodes, ASTNode{
			Type:    "DisplayMath",
			Content: source[m[0]:m[1]],
			Line:    ln,
			Column:  col,
		})
	}

	// Inline math $ ... $ (skip $$ matches)
	for _, m := range inlineMath.FindAllStringIndex(source, -1) {
		matched := source[m[0]:m[1]]
		// Skip $$ matches caught above
		if strings.HasPrefix(matched, "$$") {
			continue
		}
		ln, col := lineCol(source, m[0])
		nodes = append(nodes, ASTNode{
			Type:    "InlineMath",
			Content: matched,
			Line:    ln,
			Column:  col,
		})
	}

	// @bind{...} tags
	for _, m := range bindTag.FindAllStringIndex(source, -1) {
		ln, col := lineCol(source, m[0])
		nodes = append(nodes, ASTNode{
			Type:    "BindTag",
			Content: source[m[0]:m[1]],
			Line:    ln,
			Column:  col,
		})
	}

	// \section{}, \subsection{}, etc.
	for _, m := range sectionMacro.FindAllStringSubmatchIndex(source, -1) {
		// m[0]:m[1] full match, m[4]:m[5] is the title argument
		ln, col := lineCol(source, m[0])
		title := source[m[4]:m[5]]
		nodes = append(nodes, ASTNode{
			Type:    "Section",
			Content: title,
			Line:    ln,
			Column:  col,
		})
	}

	// \label{...}
	for _, m := range labelMacro.FindAllStringSubmatchIndex(source, -1) {
		ln, col := lineCol(source, m[0])
		label := source[m[2]:m[3]]
		nodes = append(nodes, ASTNode{
			Type:    "Label",
			Content: label,
			Line:    ln,
			Column:  col,
		})
	}

	return nodes, nil
}
