package engine

import (
	"crypto/sha256"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// ExtractTectonic writes the embedded tectonic binary to a persistent cache
// directory and returns its absolute path.
//
// Strategy:
//  1. If data is nil/empty, skip extraction and fall back to system tectonic
//     via exec.LookPath — this handles non-Windows builds and dev mode.
//  2. Compute SHA-256 of the embedded bytes and compare against a sentinel
//     file (<dest>.sha256). If they match, the cached binary is current and
//     extraction is skipped entirely (fast path on every subsequent launch).
//  3. Otherwise, write the binary and update the sentinel.
//
// The cache location is %LOCALAPPDATA%\UnderLeaf\ on Windows.
// Returns ("", nil) when no embedded data exists and no system tectonic is
// found; the caller's resolveTectonic() will handle the error gracefully.
func ExtractTectonic(data []byte) (string, error) {
	if len(data) == 0 {
		// No embedded binary (non-Windows build or dev). Return "" so the
		// caller falls through to exec.LookPath("tectonic").
		return "", nil
	}

	cacheDir, err := tectonicCacheDir()
	if err != nil {
		return "", fmt.Errorf("tectonic cache dir: %w", err)
	}

	dest := filepath.Join(cacheDir, "tectonic.exe")
	hashFile := dest + ".sha256"

	// Compute expected hash.
	sum := sha256.Sum256(data)
	newHash := fmt.Sprintf("%x", sum)

	// Fast path: compare against stored hash; skip write if identical.
	if existing, readErr := os.ReadFile(hashFile); readErr == nil {
		if string(existing) == newHash {
			return dest, nil
		}
	}

	// Write the binary (may overwrite a stale version).
	if err := os.WriteFile(dest, data, 0o755); err != nil {
		return "", fmt.Errorf("write tectonic binary: %w", err)
	}

	// Persist the hash sentinel so subsequent launches skip extraction.
	_ = os.WriteFile(hashFile, []byte(newHash), 0o644)

	return dest, nil
}

// tectonicCacheDir returns %LOCALAPPDATA%\UnderLeaf (Windows) or a fallback,
// creating the directory if it does not exist.
func tectonicCacheDir() (string, error) {
	// os.UserCacheDir() returns %LOCALAPPDATA% on Windows, ~/.cache on Linux/macOS.
	base, err := os.UserCacheDir()
	if err != nil {
		// Last-resort: use LOCALAPPDATA directly.
		base = os.Getenv("LOCALAPPDATA")
		if base == "" {
			return "", fmt.Errorf("cannot determine cache directory: %w", err)
		}
	}

	dir := filepath.Join(base, "UnderLeaf")
	if mkErr := os.MkdirAll(dir, 0o755); mkErr != nil {
		return "", fmt.Errorf("create UnderLeaf cache dir: %w", mkErr)
	}
	return dir, nil
}

// lookupSystemTectonic is a thin wrapper kept for testability.
func lookupSystemTectonic() string {
	if p, err := exec.LookPath("tectonic"); err == nil {
		return p
	}
	return ""
}
