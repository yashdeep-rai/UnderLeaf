//go:build !windows

package main

// HideTerminal does nothing on non-Windows platforms.
func HideTerminal() {}
