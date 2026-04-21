package main

import (
	"embed"
	"log"

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
	
	// Extract the embedded tectonic binary to %LOCALAPPDATA%\UnderLeaf\tectonic.exe.
	// On subsequent launches this is a fast no-op (sha256 sentinel check).
	tectonicPath, err := engine.ExtractTectonic(embeddedTectonic)
	if err != nil {
		log.Printf("warning: could not extract embedded tectonic: %v (will try system PATH)", err)
	}

	app := application.New(application.Options{
		Name:        "Underleaf",
		Description: "A LaTeX IDE built with Wails and React",
		Services: []application.Service{
			application.NewService(engine.NewCompilerService(tectonicPath)),
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
		Title:     "Underleaf",
		Frameless: true,
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
