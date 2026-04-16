//go:build !windows

package engine

import (
	"os/exec"
)

// hideWindow does nothing on non-Windows OSes.
func hideWindow(cmd *exec.Cmd) {
	// SysProcAttr.HideWindow does not exist on Linux/macOS
}
