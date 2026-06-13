# Deploy The A Line to Hostinger shared hosting from Windows over SSH.
# Builds locally, then ships public/ + api/ + .htaccess to the server.
# Usage (PowerShell, from the project root):
#     npm run deploy           (or)     powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
# Config: scripts/deploy.env (copy scripts/deploy.env.example first).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# ---- Load scripts/deploy.env ----
$cfg = @{}
$cfgPath = Join-Path $PSScriptRoot 'deploy.env'
if (Test-Path $cfgPath) {
  Get-Content $cfgPath | ForEach-Object {
    if ($_ -match '^\s*([^#=][^=]*)=(.*)$') { $cfg[$matches[1].Trim()] = $matches[2].Trim() }
  }
}
$H = $cfg['SSH_HOST']; $U = $cfg['SSH_USER']
$P = if ($cfg['SSH_PORT'])    { $cfg['SSH_PORT'] }    else { '65002' }
$R = if ($cfg['REMOTE_PATH']) { $cfg['REMOTE_PATH'] } else { 'public_html' }
if (-not $H -or -not $U) { throw "Set SSH_HOST and SSH_USER in scripts/deploy.env (copy scripts/deploy.env.example)" }
$target = "$U@$H"

Write-Host "==> Building (npm run build)" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "build failed" }

Write-Host "==> Packaging public/ + api/ + .htaccess" -ForegroundColor Cyan
if (Test-Path deploy.tgz) { Remove-Item deploy.tgz -Force }
tar -czf deploy.tgz public api .htaccess
if ($LASTEXITCODE -ne 0) { throw "tar failed" }

try {
  Write-Host "==> Uploading to ${target}:$R (port $P)" -ForegroundColor Cyan
  scp -P $P deploy.tgz "${target}:$R/deploy.tgz"
  if ($LASTEXITCODE -ne 0) { throw "scp failed" }

  Write-Host "==> Extracting on server (replaces public/, keeps .env + uploads)" -ForegroundColor Cyan
  ssh -p $P $target "cd '$R' && rm -rf public && tar -xzf deploy.tgz && rm -f deploy.tgz && echo '   extracted OK'"
  if ($LASTEXITCODE -ne 0) { throw "remote extract failed" }
}
finally {
  if (Test-Path deploy.tgz) { Remove-Item deploy.tgz -Force }
}

Write-Host "==> Done. Verify your site's /api/health endpoint returns status: up" -ForegroundColor Green
