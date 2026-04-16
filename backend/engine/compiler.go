package engine

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type CompilerService struct {
	sidecarPath string
	mu          sync.Mutex
}

func NewCompilerService(sidecarPath string) *CompilerService {
	return &CompilerService{sidecarPath: sidecarPath}
}

// Compile takes raw LaTeX source, writes to a temp file, compiles using the Tectonic sidecar,
// and returns the resulting PDF as a base64 encoded string.
func (c *CompilerService) Compile(source string, projectPath string) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Create a temporary directory for the compilation
	tempDir, err := os.MkdirTemp("", "underleaf-compile-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir) // Clean up temp files when done

	// Write the source to a .tex file
	texFile := filepath.Join(tempDir, "document.tex")
	if err := os.WriteFile(texFile, []byte(source), 0644); err != nil {
		return "", fmt.Errorf("failed to write source file: %w", err)
	}

	// 60-second timeout so a hung tectonic never freezes the UI
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Run tectonic with --outdir pointing to tempDir so the PDF lands there
	cmd := exec.CommandContext(ctx, c.sidecarPath, "--outdir", tempDir, texFile)
	if projectPath != "" {
		cmd.Dir = projectPath
	} else {
		cmd.Dir = tempDir
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return "", fmt.Errorf("compilation timed out after 60s")
		}
		cleanOutput := filterTectonicOutput(string(output))
		return "", fmt.Errorf("%s", cleanOutput)
	}

	// Read the resulting PDF
	pdfFile := filepath.Join(tempDir, "document.pdf")
	pdfBytes, err := os.ReadFile(pdfFile)
	if err != nil {
		return "", fmt.Errorf("failed to read generated PDF: %w", err)
	}

	// Encode to base64
	return base64.StdEncoding.EncodeToString(pdfBytes), nil
}

// filterTectonicOutput extracts only meaningful error/warning lines from Tectonic's verbose output.
func filterTectonicOutput(raw string) string {
	lines := strings.Split(raw, "\n")
	var errs []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "error:") || strings.HasPrefix(line, "warning:") {
			// Skip noise-only warnings
			if strings.Contains(line, "Fontconfig") || strings.Contains(line, "Overfull") {
				continue
			}
			errs = append(errs, line)
		}
	}
	if len(errs) == 0 {
		return "compilation failed (no output)"
	}
	return strings.Join(errs, "\n")
}
