package engine

import (
	"bytes"
	"encoding/base64"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

type CompileResult struct {
	Success        bool     `json:"success"`
	PDFData        string   `json:"pdfData"` // base64 for JSON transport
	Errors         []string `json:"errors"`
	Warnings       []string `json:"warnings"`
	Output         string   `json:"output"`
	FullLog        string   `json:"fullLog"`
	MissingPackage string   `json:"missingPackage"`
}

type CompilerService struct {
	tectonicPath string
}

func NewCompilerService(tectonicPath string) *CompilerService {
	return &CompilerService{tectonicPath: tectonicPath}
}

// resolveTectonic returns the tectonic binary path.
// It prefers the extracted/sidecar path set at startup, then falls back to
// any system-installed tectonic on $PATH.
func (s *CompilerService) resolveTectonic() string {
	if s.tectonicPath != "" {
		if _, err := os.Stat(s.tectonicPath); err == nil {
			return s.tectonicPath
		}
	}
	if p := lookupSystemTectonic(); p != "" {
		return p
	}
	return ""
}

// ClearCache removes the Tectonic cache on Windows, forcing a fresh package download.
func (s *CompilerService) ClearCache() error {
	localAppData := os.Getenv("LOCALAPPDATA")
	if localAppData == "" {
		return nil
	}
	cachePath := filepath.Join(localAppData, "Tectonic", "Cache")
	if _, err := os.Stat(cachePath); os.IsNotExist(err) {
		return nil
	}
	return os.RemoveAll(cachePath)
}

// Compile compiles the given .tex file with Tectonic and returns the result.
func (s *CompilerService) Compile(activeFilePath string) (*CompileResult, error) {
	if activeFilePath == "" {
		return &CompileResult{Success: false, Errors: []string{"No active file to compile"}}, nil
	}

	bin := s.resolveTectonic()
	if bin == "" {
		return &CompileResult{
			Success: false,
			Errors:  []string{"tectonic not found. Make sure tectonic.exe is in the app directory."},
		}, nil
	}

	tempDir, err := os.MkdirTemp("", "underleaf-build-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(tempDir)

	cmd := exec.Command(bin,
		"--print",              // emit full TeX output so we can capture it
		"--keep-logs",          // preserve .log file in output dir
		"-Z", "continue-on-errors", // don't halt on recoverable errors (nonstopmode equivalent)
		"-o", tempDir,
		activeFilePath,
	)
	hideWindow(cmd)
	cmd.Dir = filepath.Dir(activeFilePath)
	cmd.Env = os.Environ()

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	runErr := cmd.Run()
	output := stdout.String() + stderr.String()

	// ── Parse errors only (skip notes, warnings, Fontconfig noise) ──────────
	var latexErrors []string
	var latexWarnings []string
	lines := strings.Split(output, "\n")
	var currentBlock []string
	currentType := "" // "error" or "warning"

	for _, line := range lines {
		// Skip the spurious Windows Fontconfig message entirely
		if strings.Contains(line, "Fontconfig error") || strings.Contains(line, "Cannot load default config") {
			continue
		}

		switch {
		case strings.HasPrefix(line, "error:"):
			if len(currentBlock) > 0 {
				block := strings.Join(currentBlock, "\n")
				if currentType == "error" { latexErrors = append(latexErrors, block) } else { latexWarnings = append(latexWarnings, block) }
			}
			currentBlock = []string{line}
			currentType = "error"

		case strings.HasPrefix(line, "warning:"):
			if len(currentBlock) > 0 {
				block := strings.Join(currentBlock, "\n")
				if currentType == "error" { latexErrors = append(latexErrors, block) } else { latexWarnings = append(latexWarnings, block) }
			}
			currentBlock = []string{line}
			currentType = "warning"

		case len(currentBlock) > 0 && (strings.HasPrefix(line, "  ") || strings.HasPrefix(line, "l.")):
			currentBlock = append(currentBlock, line)

		default:
			if len(currentBlock) > 0 {
				block := strings.Join(currentBlock, "\n")
				if currentType == "error" { latexErrors = append(latexErrors, block) } else { latexWarnings = append(latexWarnings, block) }
				currentBlock = nil
				currentType = ""
			}
		}
	}
	if len(currentBlock) > 0 {
		block := strings.Join(currentBlock, "\n")
		if currentType == "error" { latexErrors = append(latexErrors, block) } else { latexWarnings = append(latexWarnings, block) }
	}

	// ── Missing package detection ────────────────────────────────────────────
	missingPkg := ""
	pkgRegex := regexp.MustCompile(
		`(?i)failed to load resource "(.*\.sty)"|file ` + "`" + `(.*\.sty)' not found`,
	)
	if m := pkgRegex.FindStringSubmatch(output); len(m) > 1 {
		if m[1] != "" {
			missingPkg = m[1]
		} else if m[2] != "" {
			missingPkg = m[2]
		}
	}

	// ── Full log — prefer the .log file; strip Fontconfig noise ──────────────
	baseName := strings.TrimSuffix(filepath.Base(activeFilePath), filepath.Ext(activeFilePath))
	fullLog := filterFontconfig(output)
	logPath := filepath.Join(tempDir, baseName+".log")
	if logData, readErr := os.ReadFile(logPath); readErr == nil {
		fullLog = filterFontconfig(string(logData))
	}

	result := &CompileResult{
		Success:        runErr == nil,
		Errors:         latexErrors,
		Warnings:       latexWarnings,
		Output:         output,
		FullLog:        fullLog,
		MissingPackage: missingPkg,
	}

	// ── Read PDF — success if we got a PDF, even with errors ─────────────────
	pdfPath := filepath.Join(tempDir, baseName+".pdf")
	if pdfBytes, readErr := os.ReadFile(pdfPath); readErr == nil {
		result.PDFData = base64.StdEncoding.EncodeToString(pdfBytes)
		result.Success = true // PDF produced = compilation succeeded enough
	} else if runErr != nil && len(latexErrors) == 0 {
		result.Errors = append(result.Errors, "Compilation failed completely. See full log for details.")
	}

	return result, nil
}

// filterFontconfig removes the spurious Windows Fontconfig warning lines.
func filterFontconfig(s string) string {
	var kept []string
	for _, line := range strings.Split(s, "\n") {
		if strings.Contains(line, "Fontconfig error") || strings.Contains(line, "Cannot load default config") {
			continue
		}
		kept = append(kept, line)
	}
	return strings.Join(kept, "\n")
}
