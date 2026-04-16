package engine

import (
	"os/exec"
	"syscall"
)

// hideWindow prevents a console window from flashing on Windows.
func hideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
