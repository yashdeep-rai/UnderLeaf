//go:build windows

package main

import "syscall"

// HideTerminal physically forces Windows to drop the allocated console window
// immediately when the GUI boots up. This serves as a hard override if Wails
// build flags fail to apply properly in development/debug modes.
func HideTerminal() {
	getConsoleWindow := syscall.NewLazyDLL("kernel32.dll").NewProc("GetConsoleWindow")
	showWindow := syscall.NewLazyDLL("user32.dll").NewProc("ShowWindow")

	hwnd, _, _ := getConsoleWindow.Call()
	if hwnd != 0 {
		showWindow.Call(hwnd, 0) // 0 == SW_HIDE
	}
}
