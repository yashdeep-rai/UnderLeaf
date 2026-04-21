//go:build !windows

package main

// embeddedTectonic is empty on non-Windows platforms.
// ExtractTectonic will fall back to exec.LookPath("tectonic") in this case.
var embeddedTectonic []byte
