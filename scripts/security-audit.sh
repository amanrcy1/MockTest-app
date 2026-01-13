#!/bin/bash

# Security Audit Script
# Runs comprehensive security checks on the codebase

set -e

echo "🔒 Security Audit"
echo "================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# 1. Check for secrets in code
echo "1️⃣  Checking for exposed secrets..."
if grep -r -i -E "(api[_-]?key|password|secret|token|private[_-]?key)" src/ --exclude-dir=node_modules --exclude="*.test.js" | grep -v "REACT_APP_" | grep -v "process.env" | grep -v "// " | grep -v "/\*"; then
    echo -e "${RED}❌ Potential secrets found in code!${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ No exposed secrets found${NC}"
fi
echo ""

# 2. Check for .env in git
echo "2️⃣  Checking .env files..."
if git ls-files | grep -E "^\.env$"; then
    echo -e "${RED}❌ .env file is tracked in git!${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ .env file not tracked${NC}"
fi
echo ""

# 3. NPM audit
echo "3️⃣  Running npm audit..."
if npm audit --audit-level=moderate; then
    echo -e "${GREEN}✅ No moderate or higher vulnerabilities${NC}"
else
    echo -e "${YELLOW}⚠️  Vulnerabilities found - review above${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# 4. Check for console.log in production code
echo "4️⃣  Checking for console.log statements..."
CONSOLE_LOGS=$(grep -r "console\.log" src/ --exclude-dir=node_modules --exclude="*.test.js" --exclude="logger.js" --exclude="errorTracking.js" | wc -l)
if [ $CONSOLE_LOGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $CONSOLE_LOGS console.log statements${NC}"
    echo "   Consider using logger utility instead"
else
    echo -e "${GREEN}✅ No console.log statements found${NC}"
fi
echo ""

# 5. Check for eval() usage
echo "5️⃣  Checking for dangerous eval() usage..."
if grep -r "eval(" src/ --exclude-dir=node_modules --exclude="*.test.js"; then
    echo -e "${RED}❌ eval() usage found - security risk!${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ No eval() usage found${NC}"
fi
echo ""

# 6. Check for innerHTML usage
echo "6️⃣  Checking for innerHTML usage..."
INNERHTML_COUNT=$(grep -r "innerHTML" src/ --exclude-dir=node_modules --exclude="*.test.js" | wc -l)
if [ $INNERHTML_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $INNERHTML_COUNT innerHTML usages${NC}"
    echo "   Ensure content is sanitized"
else
    echo -e "${GREEN}✅ No innerHTML usage found${NC}"
fi
echo ""

# 7. Check Firebase security rules
echo "7️⃣  Checking Firebase security rules..."
if [ -f "firestore.rules" ]; then
    if grep -q "allow read, write: if true" firestore.rules; then
        echo -e "${RED}❌ Insecure Firebase rules found!${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ Firebase rules look secure${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  firestore.rules not found${NC}"
fi
echo ""

# 8. Check for hardcoded URLs
echo "8️⃣  Checking for hardcoded URLs..."
HARDCODED_URLS=$(grep -r -E "https?://[a-zA-Z0-9]" src/ --exclude-dir=node_modules --exclude="*.test.js" --exclude="*.md" | grep -v "process.env" | grep -v "// " | wc -l)
if [ $HARDCODED_URLS -gt 5 ]; then
    echo -e "${YELLOW}⚠️  Found $HARDCODED_URLS hardcoded URLs${NC}"
    echo "   Consider using environment variables"
else
    echo -e "${GREEN}✅ Minimal hardcoded URLs${NC}"
fi
echo ""

# 9. Check dependencies for known vulnerabilities
echo "9️⃣  Checking dependency versions..."
if npm outdated | grep -E "(firebase|react|react-dom)"; then
    echo -e "${YELLOW}⚠️  Core dependencies are outdated${NC}"
else
    echo -e "${GREEN}✅ Core dependencies are up to date${NC}"
fi
echo ""

# 10. Check for TODO/FIXME security notes
echo "🔟 Checking for security TODOs..."
SECURITY_TODOS=$(grep -r -i -E "(TODO|FIXME).*security" src/ --exclude-dir=node_modules | wc -l)
if [ $SECURITY_TODOS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $SECURITY_TODOS security-related TODOs${NC}"
    grep -r -i -E "(TODO|FIXME).*security" src/ --exclude-dir=node_modules
else
    echo -e "${GREEN}✅ No security TODOs found${NC}"
fi
echo ""

# Summary
echo "================="
echo "📊 Audit Summary"
echo "================="
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No critical issues found!${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES_FOUND critical issue(s)${NC}"
    echo "Please review and fix the issues above"
    exit 1
fi
