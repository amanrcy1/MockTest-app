# Security Audit Script (PowerShell)
# Runs comprehensive security checks on the codebase

Write-Host "Security Audit" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host ""

$IssuesFound = 0

# 1. Check for secrets in code
Write-Host "1. Checking for exposed secrets..." -ForegroundColor Yellow
$secretPatterns = @("api[_-]?key", "password", "secret", "token", "private[_-]?key")
$secretsFound = $false

foreach ($pattern in $secretPatterns) {
    $results = Get-ChildItem -Path src -Recurse -Include *.js,*.jsx -Exclude *.test.js | 
        Select-String -Pattern $pattern -CaseSensitive:$false |
        Where-Object { $_.Line -notmatch "REACT_APP_" -and $_.Line -notmatch "process\.env" -and $_.Line -notmatch "//" -and $_.Line -notmatch "/\*" }
    
    if ($results) {
        $secretsFound = $true
        $results | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    }
}

if ($secretsFound) {
    Write-Host "❌ Potential secrets found in code!" -ForegroundColor Red
    $IssuesFound++
} else {
    Write-Host "✅ No exposed secrets found" -ForegroundColor Green
}
Write-Host ""

# 2. Check for .env in git
Write-Host "2. Checking .env files..." -ForegroundColor Yellow
$envInGit = git ls-files | Select-String -Pattern "^\.env$"
if ($envInGit) {
    Write-Host "❌ .env file is tracked in git!" -ForegroundColor Red
    $IssuesFound++
} else {
    Write-Host "✅ .env file not tracked" -ForegroundColor Green
}
Write-Host ""

# 3. NPM audit
Write-Host "3. Running npm audit..." -ForegroundColor Yellow
$auditResult = npm audit --audit-level=moderate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ No moderate or higher vulnerabilities" -ForegroundColor Green
} else {
    Write-Host "⚠️  Vulnerabilities found - review above" -ForegroundColor Yellow
    Write-Host $auditResult
    $IssuesFound++
}
Write-Host ""

# 4. Check for console.log in production code
Write-Host "4. Checking for console.log statements..." -ForegroundColor Yellow
$consoleLogs = Get-ChildItem -Path src -Recurse -Include *.js,*.jsx -Exclude *.test.js,logger.js,errorTracking.js | 
    Select-String -Pattern "console\.log" | 
    Measure-Object | 
    Select-Object -ExpandProperty Count

if ($consoleLogs -gt 0) {
    Write-Host "⚠️  Found $consoleLogs console.log statements" -ForegroundColor Yellow
    Write-Host "   Consider using logger utility instead"
} else {
    Write-Host "✅ No console.log statements found" -ForegroundColor Green
}
Write-Host ""

# 5. Check for eval() usage
Write-Host "5. Checking for dangerous eval() usage..." -ForegroundColor Yellow
$evalUsage = Get-ChildItem -Path src -Recurse -Include *.js,*.jsx -Exclude *.test.js | 
    Select-String -Pattern "eval\("

if ($evalUsage) {
    Write-Host "❌ eval() usage found - security risk!" -ForegroundColor Red
    $evalUsage | ForEach-Object { Write-Host "  $_" }
    $IssuesFound++
} else {
    Write-Host "✅ No eval() usage found" -ForegroundColor Green
}
Write-Host ""

# 6. Check for innerHTML usage
Write-Host "6. Checking for innerHTML usage..." -ForegroundColor Yellow
$innerHTMLCount = Get-ChildItem -Path src -Recurse -Include *.js,*.jsx -Exclude *.test.js | 
    Select-String -Pattern "innerHTML" | 
    Measure-Object | 
    Select-Object -ExpandProperty Count

if ($innerHTMLCount -gt 0) {
    Write-Host "⚠️  Found $innerHTMLCount innerHTML usages" -ForegroundColor Yellow
    Write-Host "   Ensure content is sanitized"
} else {
    Write-Host "✅ No innerHTML usage found" -ForegroundColor Green
}
Write-Host ""

# 7. Check Firebase security rules
Write-Host "7. Checking Firebase security rules..." -ForegroundColor Yellow
if (Test-Path "firestore.rules") {
    $insecureRules = Select-String -Path "firestore.rules" -Pattern "allow read, write: if true"
    if ($insecureRules) {
        Write-Host "❌ Insecure Firebase rules found!" -ForegroundColor Red
        $IssuesFound++
    } else {
        Write-Host "✅ Firebase rules look secure" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  firestore.rules not found" -ForegroundColor Yellow
}
Write-Host ""

# 8. Check for hardcoded URLs
Write-Host "8. Checking for hardcoded URLs..." -ForegroundColor Yellow
$hardcodedURLs = Get-ChildItem -Path src -Recurse -Include *.js,*.jsx -Exclude *.test.js,*.md | 
    Select-String -Pattern "https?://[a-zA-Z0-9]" | 
    Where-Object { $_.Line -notmatch "process\.env" -and $_.Line -notmatch "//" } | 
    Measure-Object | 
    Select-Object -ExpandProperty Count

if ($hardcodedURLs -gt 5) {
    Write-Host "⚠️  Found $hardcodedURLs hardcoded URLs" -ForegroundColor Yellow
    Write-Host "   Consider using environment variables"
} else {
    Write-Host "✅ Minimal hardcoded URLs" -ForegroundColor Green
}
Write-Host ""

# 9. Check dependencies for known vulnerabilities
Write-Host "9. Checking dependency versions..." -ForegroundColor Yellow
$outdated = npm outdated 2>&1 | Select-String -Pattern "(firebase|react|react-dom)"
if ($outdated) {
    Write-Host "⚠️  Core dependencies are outdated" -ForegroundColor Yellow
    $outdated | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "✅ Core dependencies are up to date" -ForegroundColor Green
}
Write-Host ""

# 10. Check for TODO/FIXME security notes
Write-Host "10. Checking for security TODOs..." -ForegroundColor Yellow
$securityTodos = Get-ChildItem -Path src -Recurse -Include *.js,*.jsx | 
    Select-String -Pattern "(TODO|FIXME).*security" -CaseSensitive:$false

if ($securityTodos) {
    $todoCount = ($securityTodos | Measure-Object).Count
    Write-Host "⚠️  Found $todoCount security-related TODOs" -ForegroundColor Yellow
    $securityTodos | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "✅ No security TODOs found" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host "=================" -ForegroundColor Cyan
Write-Host "Audit Summary" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

if ($IssuesFound -eq 0) {
    Write-Host "No critical issues found!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Found $IssuesFound critical issue(s)" -ForegroundColor Red
    Write-Host "Please review and fix the issues above"
    exit 1
}
