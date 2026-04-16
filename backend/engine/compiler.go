package engine

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

type CompileResult struct {
	Success bool     `json:"success"`
	PDFData []byte   `json:"pdfData"`
	Errors  []string `json:"errors"`
	Output  string   `json:"output"`
}

type CompilerService struct {
	tectonicPath string
}

func NewCompilerService(tectonicPath string) *CompilerService {
	return &CompilerService{tectonicPath: tectonicPath}
}

func (s *CompilerService) Compile(projectPath, content string) (*CompileResult, error) {
	if projectPath == "" || content == "" {
		return &CompileResult{Success: false, Errors: []string{"Empty document or project path"}}, nil
	}

	tempDir, err := os.MkdirTemp("", "underleaf-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(tempDir)

	texFile := filepath.Join(tempDir, "document.tex")
	if err := os.WriteFile(texFile, []byte(content), 0644); err != nil {
		return nil, err
	}

	// Tectonic command
	cmd := exec.Command(s.tectonicPath, "document.tex")
	cmd.Dir = tempDir

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	output := stdout.String() + stderr.String()

	// Parse errors from Tectonic output
	var latexErrors []string
	re := regexp.MustCompile(`(?m)^error: (.*)|^.*\.tex:\d+: (.*)`)
	matches := re.FindAllStringSubmatch(output, -1)
	for _, m := range matches {
		if m[1] != "" {
			latexErrors = append(latexErrors, m[1])
		} else if m[2] != "" {
			latexErrors = append(latexErrors, m[2])
		}
	}

	// Filter noise
	filteredErrors := []string{}
	for _, e := range latexErrors {
		if !strings.Contains(e, "Fontconfig") && !strings.Contains(e, "overfull") {
			filteredErrors = append(filteredErrors, e)
		}
	}

	if err != nil && len(filteredErrors) == 0 {
		filteredErrors = append(filteredErrors, "Compilation failed (see console for details)")
	}

	result := &CompileResult{
		Success: err == nil,
		Errors:  filteredErrors,
		Output:  output,
	}

	if err == nil {
		pdfPath := filepath.Join(tempDir, "document.pdf")
		pdfData, readErr := os.ReadFile(pdfPath)
		if readErr == nil {
			result.PDFData = pdfData
		}
	}

	return result, nil
}
