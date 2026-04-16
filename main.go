package main

import (
	"embed"
	_ "embed"
	"log"
	"os"
	"path/filepath"

	"Underleaf/backend/ai"
	"Underleaf/backend/ast"
	"Underleaf/backend/engine"
	"Underleaf/backend/project"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func init() {
	application.RegisterEvent[string]("time")
}

func main() {
	HideTerminal()
	
	// Resolve tectonic sidecar path relative to the running executable.
	// os.Executable() gives us the real binary location whether in dev (bin/) or packaged.
	exePath, err := os.Executable()
	if err != nil {
		log.Fatal("cannot resolve executable path:", err)
	}
	sidecarPath := filepath.Join(filepath.Dir(exePath), "tectonic.exe")

	app := application.New(application.Options{
		Name:        "Underleaf",
		Description: "A LaTeX IDE built with Wails and React",
		Services: []application.Service{
			application.NewService(engine.NewCompilerService(sidecarPath)),
			application.NewService(project.NewProjectService()),
			application.NewService(project.NewSnapshotService()),
			application.NewService(ast.NewASTService()),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "Underleaf",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})

	orchestrator := ai.NewOrchestrator(app)
	orchestrator.StartHealthCheck()

	err = app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
