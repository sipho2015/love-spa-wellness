Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\..\LoveSpaFrontend"
try {
    # Use npm.cmd to avoid PowerShell execution policy blocks on npm.ps1.
    npm.cmd start
} finally {
    Pop-Location
}
