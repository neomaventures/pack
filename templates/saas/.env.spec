DATABASE_URI=:memory:
JWT_SECRET=test-secret
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=noreply@localhost
APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# S3-compatible storage — unit specs do not hit S3; values must be present
# so StorageModule.forRootAsync can resolve and the app boots.
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
AVATAR_BUCKET=test-bucket
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin

# Mailbox — unit specs do not hit Gmail; value must be present so
# MailboxModule.forRootAsync can resolve and the app boots.
GMAIL_API_BASE_URL=http://localhost:1080
