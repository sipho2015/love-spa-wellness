Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\..\LoveSpaBackend"
try {
    dotnet ef database update
} finally {
    Pop-Location
}
