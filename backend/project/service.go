package project

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/sqweek/dialog"
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

// SetCurrentProject sets the active project directory (does NOT persist automatically).
func (s *Service) SetCurrentProject(path string) {
	s.activeProject = path
}

// PickDirectory opens a native OS dialog to select a folder and returns the path.
// Returns an empty string if cancelled.
func (s *Service) PickDirectory(title string) string {
	dir, err := dialog.Directory().Title(title).Browse()
	if err != nil {
		return ""
	}
	return dir
}

// SaveProject saves/updates a named project record to the projects list.
func (s *Service) SaveProject(name string, path string) error {
	projects, _ := s.loadProjects()

	// Remove existing entry for this path (de-dup), then prepend
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

// GetProjects returns all saved projects.
func (s *Service) GetProjects() []ProjectRecord {
	projects, _ := s.loadProjects()
	if projects == nil {
		return []ProjectRecord{}
	}
	return projects
}

// DeleteProject removes a project from the saved list by path.
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

// ValidateProject checks if a given directory path exists.
func (s *Service) ValidateProject(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

// CreateEmptyFile creates a blank file inside the project.
// For .tex files, a minimal LaTeX boilerplate is written instead of empty content.
func (s *Service) CreateEmptyFile(dirPath string, filename string) error {
	fullPath := filepath.Join(dirPath, filename)
	if _, err := os.Stat(fullPath); err == nil {
		return nil // already exists
	}
	content := ""
	if filepath.Ext(filename) == ".tex" {
		content = "\\documentclass{article}\n\\begin{document}\n\nNew document.\n\n\\end{document}\n"
	}
	return os.WriteFile(fullPath, []byte(content), 0644)
}

// CreateBlankProject creates the directory and scaffolds a main.tex inside.
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

// ListFiles returns the file tree of the given directory.
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

// ReadFile reads a file from the filesystem.
func (s *Service) ReadFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	return string(data), err
}

// SaveFile saves text content to the filesystem.
func (s *Service) SaveFile(path, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}
