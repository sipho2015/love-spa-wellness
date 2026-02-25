Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\..\LoveSpaBackend"
try {
    dotnet run
} finally {
    Pop-Location
}
