//go:build windows

package main

import _ "embed"

// embeddedTectonic holds the tectonic.exe binary baked in at compile time.
// The file must exist at bin/tectonic.exe relative to the module root when building.
//
//go:embed bin/tectonic.exe
var embeddedTectonic []byte
