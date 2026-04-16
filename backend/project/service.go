package project

import (
	"archive/zip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type Service struct {
	activeProject string
}

func NewProjectService() *Service {
	return &Service{}
}

// FileNode represents a file or directory in the file explorer.
type FileNode struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	IsDir    bool        `json:"isDir"`
	Children []*FileNode `json:"children"`
}

// ProjectRecord stores a named project with its disk path.
type ProjectRecord struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// GetCurrentProject returns the currently tracked project directory.
func (s *Service) GetCurrentProject() string {
	return s.activeProject
}

// SetCurrentProject sets the active project directory.
func (s *Service) SetCurrentProject(path string) {
	s.activeProject = path
}

// PickDirectory opens a native OS dialog to select a folder and returns the path.
func (s *Service) PickDirectory(title string) string {
	dir, err := application.Get().Dialog.OpenFile().
		SetTitle(title).
		CanChooseDirectories(true).
		CanChooseFiles(false).
		PromptForSingleSelection()
	if err != nil {
		return ""
	}
	return dir
}

// ImportFile picks a file and copies it to the project path.
func (s *Service) ImportFile(targetDir string) error {
	path, err := application.Get().Dialog.OpenFile().
		SetTitle("Select File to Import").
		PromptForSingleSelection()
	if err != nil || path == "" {
		return nil
	}

	dest := filepath.Join(targetDir, filepath.Base(path))
	return copyFile(path, dest)
}

// SaveImageAsset writes a base64-encoded image from the frontend into <projectPath>/assets/.
// Returns the relative path usable in \includegraphics (e.g. "assets/photo.png").
func (s *Service) SaveImageAsset(projectPath string, filename string, base64Data string) (string, error) {
	assetsDir := filepath.Join(projectPath, "assets")
	if err := os.MkdirAll(assetsDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create assets dir: %w", err)
	}

	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %w", err)
	}

	safeName := filepath.Base(filename)
	destPath := filepath.Join(assetsDir, safeName)
	if err := os.WriteFile(destPath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write image: %w", err)
	}

	return "assets/" + safeName, nil
}

// ImportZip picks a zip and extracts it to the project path.
func (s *Service) ImportZip(targetDir string) error {
	path, err := application.Get().Dialog.OpenFile().
		SetTitle("Select Zip Archive to Import").
		AddFilter("Zip Archives", "*.zip").
		PromptForSingleSelection()
	if err != nil || path == "" {
		return nil
	}

	return s.extractZip(path, targetDir)
}

// ImportProjectFromZip creates a new project from a selected zip file.
func (s *Service) ImportProjectFromZip(projectName string, targetBaseDir string) (*ProjectRecord, error) {
	zipPath, err := application.Get().Dialog.OpenFile().
		SetTitle("Select Project Zip").
		AddFilter("Zip Archives", "*.zip").
		PromptForSingleSelection()
	if err != nil || zipPath == "" {
		return nil, nil
	}

	projectPath := filepath.Join(targetBaseDir, projectName)
	if err := os.MkdirAll(projectPath, 0755); err != nil {
		return nil, err
	}

	if err := s.extractZip(zipPath, projectPath); err != nil {
		return nil, err
	}

	if err := s.SaveProject(projectName, projectPath); err != nil {
		return nil, err
	}

	return &ProjectRecord{Name: projectName, Path: projectPath}, nil
}

func (s *Service) extractZip(zipPath string, dest string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()

	// ── Detect if all files share a common root directory ──
	var commonPrefix string
	hasRootFiles := false

	// First pass: find the common root if any
	for i, f := range r.File {
		name := filepath.ToSlash(f.Name)
		parts := strings.Split(name, "/")
		
		// If there is a file in the root of the zip, there's no common directory to strip
		if len(parts) == 1 && !f.FileInfo().IsDir() {
			hasRootFiles = true
			break
		}
		
		if i == 0 {
			if len(parts) > 0 {
				commonPrefix = parts[0] + "/"
			}
		} else if commonPrefix != "" && !strings.HasPrefix(name, commonPrefix) {
			commonPrefix = ""
		}
	}

	if hasRootFiles {
		commonPrefix = ""
	}

	for _, f := range r.File {
		name := filepath.ToSlash(f.Name)
		if commonPrefix != "" && strings.HasPrefix(name, commonPrefix) {
			name = strings.TrimPrefix(name, commonPrefix)
			// If it was just the directory entry itself, skip
			if name == "" {
				continue
			}
		}

		fpath := filepath.Join(dest, name)

		// Check for ZipSlip vulnerability
		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			return fmt.Errorf("illegal file path: %s", fpath)
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, os.ModePerm)
			continue
		}

		if err = os.MkdirAll(filepath.Dir(fpath), os.ModePerm); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)

		outFile.Close()
		rc.Close()

		if err != nil {
			return err
		}
	}
	return nil
}

func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

// Existing methods preserved below...

func (s *Service) SaveProject(name string, path string) error {
	projects, _ := s.loadProjects()
	var updated []ProjectRecord
	updated = append(updated, ProjectRecord{Name: name, Path: path})
	for _, p := range projects {
		if p.Path != path {
			updated = append(updated, p)
		}
	}
	if len(updated) > 20 {
		updated = updated[:20]
	}
	return s.saveProjects(updated)
}

func (s *Service) GetProjects() []ProjectRecord {
	projects, _ := s.loadProjects()
	if projects == nil {
		return []ProjectRecord{}
	}
	return projects
}

func (s *Service) DeleteProject(path string) error {
	projects, _ := s.loadProjects()
	var updated []ProjectRecord
	for _, p := range projects {
		if p.Path != path {
			updated = append(updated, p)
		}
	}
	return s.saveProjects(updated)
}

func (s *Service) projectsFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	appDir := filepath.Join(configDir, "Underleaf")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(appDir, "projects.json"), nil
}

func (s *Service) loadProjects() ([]ProjectRecord, error) {
	path, err := s.projectsFilePath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return []ProjectRecord{}, nil
	}
	var projects []ProjectRecord
	json.Unmarshal(data, &projects)
	return projects, nil
}

func (s *Service) saveProjects(projects []ProjectRecord) error {
	path, err := s.projectsFilePath()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(projects, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func (s *Service) ValidateProject(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func (s *Service) CreateEmptyFile(dirPath string, filename string) error {
	fullPath := filepath.Join(dirPath, filename)
	if _, err := os.Stat(fullPath); err == nil {
		return nil
	}
	content := ""
	if filepath.Ext(filename) == ".tex" {
		content = "\\documentclass{article}\n\\begin{document}\n\nNew document.\n\n\\end{document}\n"
	}
	return os.WriteFile(fullPath, []byte(content), 0644)
}

func (s *Service) CreateBlankProject(path string) error {
	if err := os.MkdirAll(path, 0755); err != nil {
		return err
	}
	mainTexPath := filepath.Join(path, "main.tex")
	boilerplate := "\\documentclass{article}\n\\begin{document}\n\nHello, Underleaf!\n\n\\end{document}\n"
	if _, err := os.Stat(mainTexPath); os.IsNotExist(err) {
		return os.WriteFile(mainTexPath, []byte(boilerplate), 0644)
	}
	return nil
}

func (s *Service) ListFiles(dirPath string) (*FileNode, error) {
	return buildFileTree(dirPath)
}

func buildFileTree(path string) (*FileNode, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	node := &FileNode{
		Name:  filepath.Base(path),
		Path:  filepath.ToSlash(path),
		IsDir: info.IsDir(),
	}
	if node.IsDir {
		entries, err := os.ReadDir(path)
		if err != nil {
			return nil, err
		}
		for _, entry := range entries {
			if entry.Name()[0] == '.' || entry.Name() == "node_modules" || entry.Name() == "bin" || entry.Name() == "dist" {
				continue
			}
			childNode, err := buildFileTree(filepath.Join(path, entry.Name()))
			if err == nil {
				node.Children = append(node.Children, childNode)
			}
		}
	}
	return node, nil
}

func (s *Service) ReadFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	return string(data), err
}

func (s *Service) SaveFile(path, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}
