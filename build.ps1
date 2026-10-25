[CmdletBinding()]
Param(
    [Parameter(Position=0,Mandatory=$false,ValueFromRemainingArguments=$true)]
    [string[]]$BuildArguments
)

Set-StrictMode -Version 2.0; $ErrorActionPreference = "Stop"; $ConfirmPreference = "None"; trap { Write-Error $_ -ErrorAction Continue; exit 1 }
$PSScriptRoot = Split-Path $MyInvocation.MyCommand.Path -Parent

###########################################################################
# CONFIGURATION
###########################################################################

$BuildProjectFile = Join-Path $PSScriptRoot 'src/build/_build.csproj'
$TempDirectory = Join-Path $PSScriptRoot '.fallout/temp'

$DotNetInstallUrl = "https://dot.net/v1/dotnet-install.ps1"
$DotNetChannel = "10.0"

$env:DOTNET_CLI_TELEMETRY_OPTOUT = 1
$env:DOTNET_NOLOGO = 1

###########################################################################
# EXECUTION
###########################################################################

function ExecSafe([scriptblock] $cmd) {
    & $cmd
    if ($LASTEXITCODE) { exit $LASTEXITCODE }
}

Set-Location $PSScriptRoot

# Use the installed dotnet CLI only if it has an SDK that satisfies global.json;
# otherwise provision a local copy under .fallout\temp.
$DotNetCommand = Get-Command "dotnet" -ErrorAction SilentlyContinue
if ($null -ne $DotNetCommand -and $(& $DotNetCommand.Path --version 2>$null) -and $LASTEXITCODE -eq 0) {
    $env:DOTNET_EXE = $DotNetCommand.Path
}
else {
    $DotNetInstallFile = Join-Path $TempDirectory 'dotnet-install.ps1'
    $DotNetDirectory = Join-Path $TempDirectory 'dotnet-win'
    New-Item -ItemType Directory -Path $TempDirectory -Force | Out-Null
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    (New-Object System.Net.WebClient).DownloadFile($DotNetInstallUrl, $DotNetInstallFile)
    ExecSafe { & powershell -NoProfile -ExecutionPolicy Bypass -File $DotNetInstallFile -InstallDir $DotNetDirectory -Channel $DotNetChannel -NoPath }
    $env:DOTNET_EXE = Join-Path $DotNetDirectory 'dotnet.exe'
    $env:PATH = "$DotNetDirectory;$env:PATH"
}

Write-Output "Microsoft (R) .NET SDK version $(& $env:DOTNET_EXE --version)"

ExecSafe { & $env:DOTNET_EXE build $BuildProjectFile -nologo -clp:NoSummary --verbosity quiet }
ExecSafe { & $env:DOTNET_EXE run --project $BuildProjectFile --no-build -- $BuildArguments }
