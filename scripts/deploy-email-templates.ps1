# Deploy Email Templates to Firebase (PowerShell)
# This script helps you deploy the custom email functions

Write-Host "🚀 Deploying Email Templates to Firebase" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
$firebaseCmd = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCmd) {
    Write-Host "❌ Firebase CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Firebase CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Firebase authentication..." -ForegroundColor Yellow
firebase projects:list 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Firebase" -ForegroundColor Red
    Write-Host "Run: firebase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Authenticated" -ForegroundColor Green
Write-Host ""

# Navigate to functions directory
if (-not (Test-Path "functions")) {
    Write-Host "❌ functions directory not found" -ForegroundColor Red
    exit 1
}

Set-Location functions

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found in functions directory" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Go back to root
Set-Location ..

# Deploy functions
Write-Host "🚀 Deploying functions to Firebase..." -ForegroundColor Yellow
firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Go to Firebase Console → Authentication → Templates"
Write-Host "2. Update sender name to: UPSC Mock Test Platform"
Write-Host "3. Customize email templates with better subject lines"
Write-Host "4. Set reply-to address in Advanced settings"
Write-Host "5. Test by creating a new account"
Write-Host ""
Write-Host "📖 See QUICK_EMAIL_FIX.md for detailed instructions" -ForegroundColor Yellow
