#!/bin/bash

# Deploy Email Templates to Firebase
# This script helps you deploy the custom email functions

echo "🚀 Deploying Email Templates to Firebase"
echo "=========================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"
echo ""

# Check if logged in
echo "Checking Firebase authentication..."
firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Firebase"
    echo "Run: firebase login"
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Navigate to functions directory
cd functions || exit 1

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in functions directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Go back to root
cd ..

# Deploy functions
echo "🚀 Deploying functions to Firebase..."
firebase deploy --only functions
if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to Firebase Console → Authentication → Templates"
echo "2. Update sender name to: UPSC Mock Test Platform"
echo "3. Customize email templates with better subject lines"
echo "4. Set reply-to address in Advanced settings"
echo "5. Test by creating a new account"
echo ""
echo "📖 See QUICK_EMAIL_FIX.md for detailed instructions"
