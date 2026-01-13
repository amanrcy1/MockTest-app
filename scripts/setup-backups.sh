#!/bin/bash

# Firebase Backup Setup Script
# This script configures automated backups for Firestore

set -e

echo "🔧 Firebase Backup Setup"
echo "========================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI is not installed"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

# Get project ID
echo ""
echo "📋 Getting Firebase project ID..."
PROJECT_ID=$(firebase use | grep "active project" | awk '{print $NF}' | tr -d '()')

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: Could not determine Firebase project ID"
    echo "Run 'firebase use <project-id>' first"
    exit 1
fi

echo "✅ Project ID: $PROJECT_ID"

# Create backup bucket
BACKUP_BUCKET="${PROJECT_ID}-firestore-backups"
echo ""
echo "📦 Creating backup bucket: gs://$BACKUP_BUCKET"

if gsutil ls -b gs://$BACKUP_BUCKET &> /dev/null; then
    echo "✅ Bucket already exists"
else
    gsutil mb -p $PROJECT_ID -l us-central1 gs://$BACKUP_BUCKET
    echo "✅ Bucket created"
fi

# Set lifecycle policy for backups (delete after 30 days)
echo ""
echo "⏰ Setting lifecycle policy (30-day retention)..."

cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle.json gs://$BACKUP_BUCKET
rm /tmp/lifecycle.json
echo "✅ Lifecycle policy set"

# Grant permissions
echo ""
echo "🔐 Granting permissions..."

SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:objectAdmin gs://$BACKUP_BUCKET
echo "✅ Permissions granted"

# Create backup schedule using Cloud Scheduler
echo ""
echo "📅 Setting up backup schedule..."

# Enable required APIs
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID
gcloud services enable firestore.googleapis.com --project=$PROJECT_ID

# Create backup job (daily at 2 AM)
BACKUP_JOB_NAME="daily-firestore-backup"

if gcloud scheduler jobs describe $BACKUP_JOB_NAME --project=$PROJECT_ID &> /dev/null; then
    echo "✅ Backup job already exists"
else
    gcloud scheduler jobs create http $BACKUP_JOB_NAME \
        --schedule="0 2 * * *" \
        --uri="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default):exportDocuments" \
        --message-body="{\"outputUriPrefix\":\"gs://${BACKUP_BUCKET}/$(date +%Y-%m-%d)\"}" \
        --time-zone="Asia/Kolkata" \
        --project=$PROJECT_ID \
        --oauth-service-account-email="${SERVICE_ACCOUNT}"
    
    echo "✅ Backup job created"
fi

# Test backup (optional)
echo ""
read -p "🧪 Do you want to run a test backup now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Running test backup..."
    
    gcloud firestore export gs://$BACKUP_BUCKET/test-backup-$(date +%Y%m%d-%H%M%S) \
        --project=$PROJECT_ID
    
    echo "✅ Test backup completed"
fi

# Summary
echo ""
echo "✅ Backup Setup Complete!"
echo "========================"
echo ""
echo "📋 Summary:"
echo "  - Backup Bucket: gs://$BACKUP_BUCKET"
echo "  - Schedule: Daily at 2:00 AM IST"
echo "  - Retention: 30 days"
echo "  - Job Name: $BACKUP_JOB_NAME"
echo ""
echo "📖 Next Steps:"
echo "  1. Verify backup job: gcloud scheduler jobs describe $BACKUP_JOB_NAME --project=$PROJECT_ID"
echo "  2. List backups: gsutil ls gs://$BACKUP_BUCKET"
echo "  3. Test restoration: See BACKUP_RESTORE.md"
echo ""
echo "⚠️  Important:"
echo "  - Monitor backup logs in Cloud Console"
echo "  - Test restoration monthly"
echo "  - Keep this script for future reference"
echo ""
