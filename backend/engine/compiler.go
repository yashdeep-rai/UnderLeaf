package engine

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type CompilerService struct {
	sidecarPath string
}

func NewCompilerService(sidecarPath string) *CompilerService {
	return &CompilerService{sidecarPath: sidecarPath}
}

// Compile takes raw LaTeX source, writes to a temp file, compiles using the Tectonic sidecar,
// and returns the resulting PDF as a base64 encoded string.
func (c *CompilerService) Compile(source string) (string, error) {
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
	cmd.Dir = tempDir

	output, err := cmd.CombinedOutput()
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return "", fmt.Errorf("compilation timed out after 60s")
		}
		return "", fmt.Errorf("compilation failed: %v\nOutput: %s", err, string(output))
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
