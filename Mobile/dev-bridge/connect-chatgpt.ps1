# Secure MCP Tunnel adapter for SoloScape's private original-engine MCP server.
# No keys or account credentials are saved in the repository.
[CmdletBinding()]
param(
    [ValidateSet("check", "configure", "doctor", "run")]
    [string]$Mode = "check",
    [ValidatePattern("^[A-Za-z][A-Za-z0-9_-]{1,63}$")]
    [string]$Profile = "soloscape-original"
)
$ErrorActionPreference = "Stop"
$mobile = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$server = Join-Path $PSScriptRoot "stdio.mjs"

function Require-Node {
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
        throw "Node.js 22.16+ is required on PATH."
    }
    if (-not (Test-Path -LiteralPath $server -PathType Leaf)) {
        throw "The original Stage 1 MCP stdio server is missing."
    }
}
function Find-TunnelClient {
    $binary = $env:TUNNEL_CLIENT_BIN
    if ($binary) {
        if (-not (Test-Path -LiteralPath $binary -PathType Leaf)) {
            throw "TUNNEL_CLIENT_BIN points to a missing tunnel-client executable."
        }
        return (Resolve-Path -LiteralPath $binary).Path
    }
    $available = Get-Command tunnel-client.exe -ErrorAction SilentlyContinue
    if (-not $available) {
        $available = Get-Command tunnel-client -ErrorAction SilentlyContinue
    }
    if (-not $available) {
        throw "OpenAI tunnel-client is not installed. Download it from https://platform.openai.com/settings/organization/tunnels or https://github.com/openai/tunnel-client/releases/latest, then set TUNNEL_CLIENT_BIN."
    }
    return $available.Source
}
function Require-TunnelCredentials {
    if (-not $env:CONTROL_PLANE_TUNNEL_ID -or
        $env:CONTROL_PLANE_TUNNEL_ID -notmatch '^tunnel_[A-Za-z0-9_-]{8,128}$') {
        throw "CONTROL_PLANE_TUNNEL_ID must contain a valid tunnel ID from OpenAI Platform tunnel settings."
    }
    if (-not $env:CONTROL_PLANE_API_KEY) {
        throw "CONTROL_PLANE_API_KEY is missing. Supply a runtime key in this terminal only; never put it in Git or on the command line."
    }
}

try {
    Require-Node
    $tunnelClient = Find-TunnelClient
    if ($Mode -eq "check") {
        Write-Output "[READY] Node and Stage 1 stdio server found."
        Write-Output "[READY] OpenAI tunnel-client executable found."
        Write-Output ("[STATUS] Tunnel ID configured: " + [bool]$env:CONTROL_PLANE_TUNNEL_ID)
        Write-Output ("[STATUS] Runtime key present: " + [bool]$env:CONTROL_PLANE_API_KEY)
        Write-Output "[INFO] Check only: no tunnel created, network connection opened, or credentials logged."
        exit 0
    }
    Require-TunnelCredentials
    Push-Location $mobile
    try {
        if ($Mode -eq "configure") {
            # The private profile is managed by tunnel-client, not this repo.
            # MCP entrypoint uses an absolute file path; no user-provided commands.
            $mcpCommand = "node dev-bridge/stdio.mjs"
            & $tunnelClient init --sample sample_mcp_stdio_local --profile $Profile --tunnel-id $env:CONTROL_PLANE_TUNNEL_ID --mcp-command $mcpCommand
        } elseif ($Mode -eq "doctor") {
            & $tunnelClient doctor --profile $Profile --explain
        } else {
            # One active tunnel-client per tunnel ID. Do not spawn duplicate bridges.
            & $tunnelClient run --profile $Profile
        }
        if ($LASTEXITCODE -ne 0) {
            throw ("tunnel-client " + $Mode + " failed with exit code " + $LASTEXITCODE)
        }
    } finally {
        Pop-Location
    }
} catch {
    # Exception output may contain paths, but never echo keys or tokens.
    Write-Error ("[ERROR] " + $_.Exception.Message)
    exit 1
}
