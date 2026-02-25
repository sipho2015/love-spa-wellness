Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\..\LoveSpaFrontend"
try {
    npm start
} finally {
    Pop-Location
}
