# Deploy menu for the Spelling Tutor / Good Plus Fast Cloudflare targets.
#
# Run it with tools\05.deploy_apis.bat. Pick a number, it deploys, then returns to the menu.
#
#   -DryRun       print what each step would run without running anything
#   -Select 1     deploy one target (or A for all) without showing the menu, then exit
#   -AuthStatus   show who you are logged in to Cloudflare as, then exit
#   -UseApiToken  use the CLOUDFLARE_API_TOKEN environment variable instead of logging in
#
# Login: by default this script IGNORES CLOUDFLARE_API_TOKEN (for this run only; your saved
# variable is untouched) and uses a normal `wrangler login` instead, because that token does
# not have D1 / Workers write access. If you are not logged in, it opens the login page for you.
#
# To add a target, add one entry to $targets below (Key, Name, Dir, Note and Steps).

param(
    [switch]$DryRun,
    [string]$Select = '',
    [switch]$AuthStatus,
    [switch]$UseApiToken
)

$apps = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path   # ...\My Apps
$astro = Join-Path $apps 'Astro Project'
$zoneId = 'dbada03c0822fadab4f40eac097098c4'

# A Cloudflare cache purge that never fails the deploy (the token is optional).
$purgeStep = {
    if (-not $env:CACHE_PURGE_TOKEN) {
        Write-Host 'CACHE_PURGE_TOKEN is not set, so the CDN cache was not purged.' -ForegroundColor DarkYellow
        return
    }
    try {
        $body = @{ files = @('https://goodplusfast.com/spelling/app/', 'https://www.goodplusfast.com/spelling/app/') } | ConvertTo-Json
        Invoke-RestMethod -Method Post -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/purge_cache" `
            -Headers @{ Authorization = "Bearer $env:CACHE_PURGE_TOKEN" } -ContentType 'application/json' -Body $body | Out-Null
        Write-Host 'CDN cache purged.' -ForegroundColor Green
    } catch {
        Write-Host "CDN purge failed (deploy is still live): $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
}

# Each step: Label, Cmd (the text shown), Run (what executes). Steps run in order and stop at the first failure.
$targets = @(
    @{
        Key = '1'; Name = 'Spelling Tutor API'; Note = 'tests, D1 migrations, deploy'
        Dir = Join-Path $astro 'apps\spelling-tutor-api'
        Steps = @(
            @{ Label = 'Run tests';                    Cmd = 'npm test';                                                  Run = { npm test } },
            @{ Label = 'Apply D1 migrations (remote)'; Cmd = 'npx wrangler d1 migrations apply spelling-tutor-db --remote'; Run = { npx wrangler d1 migrations apply spelling-tutor-db --remote } },
            @{ Label = 'Deploy worker';                Cmd = 'npx wrangler deploy';                                       Run = { npx wrangler deploy } }
        )
    },
    @{
        Key = '2'; Name = 'Flashy Cards API'; Note = 'tests, deploy'
        Dir = Join-Path $astro 'apps\flashy-cards-api'
        Steps = @(
            @{ Label = 'Run tests';    Cmd = 'npm test';           Run = { npm test } },
            @{ Label = 'Deploy worker'; Cmd = 'npx wrangler deploy'; Run = { npx wrangler deploy } }
        )
    },
    @{
        Key = '3'; Name = 'Website (goodplusfast.com)'; Note = 'build, deploy'
        Dir = Join-Path $astro 'jerome-portfolio'
        Steps = @(
            @{ Label = 'Build and deploy'; Cmd = 'npm run deploy'; Run = { npm run deploy } }
        )
    },
    @{
        Key = '4'; Name = 'Spelling Tutor app (Pages)'; Note = 'tests, build, deploy, cache purge'
        Dir = Join-Path $apps 'spelling_tutor'
        Steps = @(
            @{ Label = 'Run tests';        Cmd = 'npm test';      Run = { npm test } },
            @{ Label = 'Build';            Cmd = 'npm run build'; Run = { npm run build } },
            @{ Label = 'Deploy to Pages';  Cmd = 'npx wrangler pages deploy dist --project-name=spelling-tutor --branch=main --commit-dirty=true'
               Run = { npx wrangler pages deploy dist --project-name=spelling-tutor --branch=main --commit-dirty=true } },
            @{ Label = 'Purge CDN cache';  Cmd = '(Cloudflare API, only if CACHE_PURGE_TOKEN is set)'; Run = $purgeStep }
        )
    },
    @{
        Key = '5'; Name = 'Spelling proxy worker'; Note = 'deploy (rarely needed)'
        Dir = $astro
        Steps = @(
            @{ Label = 'Deploy worker'; Cmd = 'npx wrangler deploy spelling-proxy-worker.js --config spelling-proxy-wrangler.toml'
               Run = { npx wrangler deploy spelling-proxy-worker.js --config spelling-proxy-wrangler.toml } }
        )
    }
)

$allOrder = @('1', '2', '3', '4')   # the recommended order when deploying everything: APIs first, app last

# ---- Cloudflare login ----
$authDir = Join-Path $astro 'apps\spelling-tutor-api'   # any folder with wrangler; the login itself is global

# Returns @{ State = 'logged-in' | 'not-logged-in' | 'unknown'; Detail = <text> }.
function Get-CloudflareAuth {
    Push-Location $authDir
    try { $out = (cmd /c "npx wrangler whoami 2>&1" | Out-String) } finally { Pop-Location }
    $state = 'unknown'
    if ($out -match 'not authenticated') { $state = 'not-logged-in' }
    elseif ($out -match 'You are logged in') { $state = 'logged-in' }
    $who = ''
    if ($out -match '(You are logged in[^\r\n]*)') { $who = $Matches[1].Trim() }
    return @{ State = $state; Detail = $who }
}

# Opens the browser login page and waits for it to finish.
function Start-CloudflareLogin {
    Write-Host 'Opening the Cloudflare login page in your browser. Approve it, then come back here.' -ForegroundColor Yellow
    Push-Location $authDir
    try { npx wrangler login } finally { Pop-Location }
}

# Makes sure wrangler will use a browser login, and logs you in if needed.
function Confirm-CloudflareLogin {
    if ($DryRun) { Write-Host '[DRY RUN] would check your Cloudflare login here.' -ForegroundColor DarkGray; return }

    if ($env:CLOUDFLARE_API_TOKEN -and -not $UseApiToken) {
        Remove-Item Env:CLOUDFLARE_API_TOKEN   # this process only; children (wrangler) inherit the change
        Write-Host 'Ignoring CLOUDFLARE_API_TOKEN for this run (it lacks D1 / Workers write access). Your saved variable is unchanged.' -ForegroundColor DarkYellow
    }

    $auth = Get-CloudflareAuth
    if ($auth.State -eq 'not-logged-in') {
        Write-Host 'You are not logged in to Cloudflare.' -ForegroundColor DarkYellow
        Start-CloudflareLogin
        $auth = Get-CloudflareAuth
    }

    switch ($auth.State) {
        'logged-in' { Write-Host "Cloudflare: $($auth.Detail)" -ForegroundColor Green }
        'not-logged-in' { Write-Host 'Still not logged in. Deploys will fail until you choose L on the menu and finish the login.' -ForegroundColor Red }
        default { Write-Host 'Could not check your Cloudflare login (offline?). Continuing anyway.' -ForegroundColor DarkYellow }
    }
    Write-Host ''
}

function Write-Rule($text, $color = 'Cyan') {
    Write-Host ('=' * 55) -ForegroundColor $color
    Write-Host " $text" -ForegroundColor $color
    Write-Host ('=' * 55) -ForegroundColor $color
}

function Show-Menu {
    Write-Rule 'Spelling Tutor - Deploy Menu'
    foreach ($t in $targets) {
        Write-Host ("  {0}) {1,-30} {2}" -f $t.Key, $t.Name, $t.Note)
    }
    Write-Host ("  A) {0,-30} {1}" -f 'All of 1-4, in order', 'stops at the first failure')
    Write-Host ("  L) {0,-30} {1}" -f 'Log in to Cloudflare', 'browser login (use this if a deploy says not authorized)')
    Write-Host ("  W) {0,-30} {1}" -f 'Who am I logged in as?', '')
    Write-Host '  Q) Quit'
    Write-Host ''
}

# Sets $script:StepOk. Called as a plain statement (not piped or assigned) so wrangler keeps a real console
# and can ask its own questions.
function Invoke-Step($step) {
    Write-Host ''
    Write-Host ">> $($step.Label)" -ForegroundColor Yellow
    Write-Host "   $($step.Cmd)" -ForegroundColor DarkGray
    $script:StepOk = $true
    if ($DryRun) { return }
    $global:LASTEXITCODE = 0
    & $step.Run
    if ($LASTEXITCODE -ne 0) { $script:StepOk = $false }
}

# Sets $script:TargetOk.
function Invoke-Target($t) {
    $script:TargetOk = $false
    Write-Host ''
    Write-Rule "Deploying: $($t.Name)" 'Cyan'

    if (-not (Test-Path $t.Dir)) {
        Write-Host "[ERROR] Folder not found: $($t.Dir)" -ForegroundColor Red
        return
    }

    # Warn before shipping code that is not committed (the deploy uses the working folder, not git).
    $dirty = git -C $t.Dir status --porcelain 2>$null
    if ($dirty) {
        Write-Host 'Uncommitted changes in this repo:' -ForegroundColor DarkYellow
        $dirty | Select-Object -First 8 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkYellow }
        if (-not $DryRun -and $Select -eq '') {
            $answer = Read-Host 'Deploy anyway? (y/N)'
            if ($answer -notmatch '^[yY]') { Write-Host 'Skipped.' -ForegroundColor DarkYellow; return }
        }
    }

    $clock = [Diagnostics.Stopwatch]::StartNew()
    Push-Location $t.Dir
    try {
        foreach ($step in $t.Steps) {
            Invoke-Step $step
            if (-not $script:StepOk) {
                Write-Host ''
                Write-Host "[FAILED] $($t.Name): step '$($step.Label)' failed. Nothing after it was run." -ForegroundColor Red
                if ($step.Label -match 'migrations|Deploy') {
                    Write-Host 'If this is an authentication error ("not authorized"), choose L on the menu to log in again.' -ForegroundColor DarkYellow
                }
                return
            }
        }
    } finally {
        Pop-Location
    }
    $clock.Stop()
    $label = if ($DryRun) { '[DRY RUN]' } else { '[OK]' }
    Write-Host ''
    Write-Host ("{0} {1} finished in {2:N0}s" -f $label, $t.Name, $clock.Elapsed.TotalSeconds) -ForegroundColor Green
    $script:TargetOk = $true
}

function Find-Target($key) { $targets | Where-Object { $_.Key -eq $key } | Select-Object -First 1 }

# Runs one choice ('1'..'5' or 'A'). Returns nothing; results are printed.
function Invoke-Choice($choice) {
    if ($choice -eq 'A') {
        foreach ($k in $allOrder) {
            Invoke-Target (Find-Target $k)
            if (-not $script:TargetOk) {
                Write-Host "Stopped: the remaining targets were not deployed." -ForegroundColor Red
                return
            }
        }
        Write-Host ''
        Write-Host 'All targets deployed.' -ForegroundColor Green
        return
    }
    Invoke-Target (Find-Target $choice)
}

# ---- Non-interactive: -AuthStatus ----
if ($AuthStatus) {
    if ($env:CLOUDFLARE_API_TOKEN -and -not $UseApiToken) { Remove-Item Env:CLOUDFLARE_API_TOKEN }
    $a = Get-CloudflareAuth
    Write-Host "State: $($a.State)  $($a.Detail)"
    if ($a.State -eq 'logged-in') { exit 0 } else { exit 1 }
}

# ---- Non-interactive: -Select 1 (or A) ----
if ($Select -ne '') {
    $choice = $Select.Trim().ToUpper()
    if ($choice -ne 'A' -and -not (Find-Target $choice)) {
        Write-Host "Unknown choice '$Select'. Use 1-5 or A." -ForegroundColor Red
        exit 2
    }
    Confirm-CloudflareLogin
    Invoke-Choice $choice
    if ($script:TargetOk) { exit 0 } else { exit 1 }
}

# ---- Interactive menu ----
Clear-Host
Confirm-CloudflareLogin
while ($true) {
    Show-Menu
    $raw = Read-Host 'Choose a number'
    $choice = "$raw".Trim().ToUpper()

    if ($choice -eq 'Q' -or $choice -eq '0') { break }

    if ($choice -eq 'L') {
        if ($DryRun) { Write-Host '[DRY RUN] would run: npx wrangler login' -ForegroundColor DarkGray }
        else { Start-CloudflareLogin; $a = Get-CloudflareAuth; Write-Host "State: $($a.State)  $($a.Detail)" }
        Write-Host ''
        Read-Host 'Press Enter to return to the menu' | Out-Null
        Clear-Host
        continue
    }
    if ($choice -eq 'W') {
        if ($DryRun) { Write-Host '[DRY RUN] would run: npx wrangler whoami' -ForegroundColor DarkGray }
        else { $a = Get-CloudflareAuth; Write-Host "State: $($a.State)  $($a.Detail)" }
        Write-Host ''
        Read-Host 'Press Enter to return to the menu' | Out-Null
        Clear-Host
        continue
    }

    if ($choice -ne 'A' -and -not (Find-Target $choice)) {
        Write-Host "'$raw' is not on the menu. Type 1-5, A, L, W or Q." -ForegroundColor Red
        Write-Host ''
        continue
    }

    Invoke-Choice $choice
    Write-Host ''
    Read-Host 'Press Enter to return to the menu' | Out-Null
    Clear-Host
}
