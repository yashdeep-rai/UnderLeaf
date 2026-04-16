package project

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type SnapshotMeta struct {
	ID        string `json:"id"`
	Timestamp string `json:"timestamp"`
	Label     string `json:"label"`
}

type SnapshotManifest struct {
	Snapshots []SnapshotMeta `json:"snapshots"`
}

type SnapshotService struct{}

func NewSnapshotService() *SnapshotService {
	return &SnapshotService{}
}

func getSnapshotsDir(projectPath string) string {
	return filepath.Join(projectPath, ".underleaf", "snapshots")
}

func getManifestPath(projectPath string) string {
	return filepath.Join(getSnapshotsDir(projectPath), "manifest.json")
}

func readManifest(projectPath string) *SnapshotManifest {
	manifest := &SnapshotManifest{Snapshots: []SnapshotMeta{}}
	data, err := os.ReadFile(getManifestPath(projectPath))
	if err == nil {
		json.Unmarshal(data, manifest)
	}
	return manifest
}

func writeManifest(projectPath string, manifest *SnapshotManifest) error {
	dir := getSnapshotsDir(projectPath)
	os.MkdirAll(dir, 0755)
	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(getManifestPath(projectPath), data, 0644)
}

// CreateSnapshot takes the current active file and its compiled PDF and saves a snapshot.
func (s *SnapshotService) CreateSnapshot(projectPath string, activeFilePath string, label string, pdfBase64 string) (*SnapshotMeta, error) {
	if projectPath == "" || activeFilePath == "" {
		return nil, fmt.Errorf("project path or active file missing")
	}

	manifest := readManifest(projectPath)
	id := fmt.Sprintf("%d", time.Now().UnixMilli())

	// Read source code
	sourceCode, err := os.ReadFile(activeFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read source: %w", err)
	}

	// Read PDF from base64 if provided
	var pdfBytes []byte
	if pdfBase64 != "" {
		pdfBytes, _ = base64.StdEncoding.DecodeString(pdfBase64)
	}

	snapDir := filepath.Join(getSnapshotsDir(projectPath), id)
	if err := os.MkdirAll(snapDir, 0755); err != nil {
		return nil, err
	}

	if err := os.WriteFile(filepath.Join(snapDir, "source.tex"), sourceCode, 0644); err != nil {
		return nil, err
	}
	if len(pdfBytes) > 0 {
		if err := os.WriteFile(filepath.Join(snapDir, "output.pdf"), pdfBytes, 0644); err != nil {
			return nil, err
		}
	}

	meta := SnapshotMeta{
		ID:        id,
		Timestamp: time.Now().Format(time.RFC3339),
		Label:     label,
	}

	// Insert at top
	manifest.Snapshots = append([]SnapshotMeta{meta}, manifest.Snapshots...)

	// Truncate to 50
	if len(manifest.Snapshots) > 50 {
		removed := manifest.Snapshots[50:]
		manifest.Snapshots = manifest.Snapshots[:50]
		for _, r := range removed {
			os.RemoveAll(filepath.Join(getSnapshotsDir(projectPath), r.ID))
		}
	}

	writeManifest(projectPath, manifest)
	return &meta, nil
}

func (s *SnapshotService) GetSnapshots(projectPath string) ([]SnapshotMeta, error) {
	if projectPath == "" {
		return []SnapshotMeta{}, nil
	}
	manifest := readManifest(projectPath)
	return manifest.Snapshots, nil
}

// SnapshotData represents the full payload for the frontend
type SnapshotData struct {
	Source    string `json:"source"`
	PDFBase64 string `json:"pdfBase64"`
}

func (s *SnapshotService) GetSnapshotData(projectPath string, snapshotID string) (*SnapshotData, error) {
	snapDir := filepath.Join(getSnapshotsDir(projectPath), snapshotID)
	
	source, err := os.ReadFile(filepath.Join(snapDir, "source.tex"))
	if err != nil {
		return nil, err
	}

	pdfBase64 := ""
	if pdfBytes, err := os.ReadFile(filepath.Join(snapDir, "output.pdf")); err == nil {
		pdfBase64 = base64.StdEncoding.EncodeToString(pdfBytes)
	}

	return &SnapshotData{
		Source:    string(source),
		PDFBase64: pdfBase64,
	}, nil
}

func (s *SnapshotService) RestoreSnapshot(projectPath string, activeFilePath string, snapshotID string) error {
	snapDir := filepath.Join(getSnapshotsDir(projectPath), snapshotID)
	
	source, err := os.ReadFile(filepath.Join(snapDir, "source.tex"))
	if err != nil {
		return err
	}

	return os.WriteFile(activeFilePath, source, 0644)
}
