# Deployment Guide

This guide covers the production deployment of the Anti-Cheat Moderation Bot.

## Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **TypeScript**: 5.0.0 or higher
- **Memory**: Minimum 512MB RAM, recommended 1GB+
- **Storage**: 100MB free space
- **Network**: Stable internet connection

### Discord Requirements

- **Bot Token**: From Discord Developer Portal
- **Application ID**: From Discord Developer Portal
- **Server Permissions**: Administrator or appropriate role permissions
- **Channels**: Required channels created in target server

### Backend Requirements

- **API Endpoint**: Accessible backend API for anti-cheat integration
- **Authentication**: API key for backend communication
- **Database**: For audit log storage (if not using backend)
- **Webhook URL**: Publicly accessible URL for webhooks

## Environment Setup

### 1. Create Environment File

```bash
cp env.example .env
```

### 2. Configure Environment Variables

```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here

# Channel Configuration
ANTI_CHEAT_PINGS_CHANNEL=123456789012345678
MODERATION_LOGS_CHANNEL=123456789012345679
CASE_RECORDS_CHANNEL=123456789012345680
BAN_REVIEW_CHANNEL=123456789012345681

# Backend API
BACKEND_API_URL=https://api.yourgame.com
BACKEND_API_KEY=your_api_key_here

# Webhook Security
WEBHOOK_SECRET=your_webhook_secret_here

# Bot Configuration
NODE_ENV=production
REGISTER_GLOBAL=false
WEBHOOK_PORT=3000
```

### 3. Discord Server Setup

Create these channels in your Discord server:

1. **#anti-cheat-pings** - For incoming anti-cheat alerts
2. **#mod-logs** - For moderation action logs
3. **#mod-cases** - For case records and archives
4. **#ban-review** - For senior moderator ban reviews

Get the channel IDs and update `.env`.

### 4. Bot Permissions

Invite the bot with these permissions:
- Send Messages
- Use Slash Commands
- Embed Links
- Read Message History
- Use External Emojis
- Administrator (recommended for full functionality)

Invite URL format:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268435456&scope=bot%20applications.commands
```

## Installation

### Option 1: Direct Installation

```bash
# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Register commands (one-time)
npm run register-commands

# Start the bot
npm start
```

### Option 2: Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t anticheat-bot .
docker run -p 3000:3000 --env-file .env anticheat-bot
```

### Option 3: PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'anticheat-bot',
    script: 'dist/bot.js',
    env: {
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log'
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Verification

### 1. Bot Online Check

Check Discord presence:
- Bot shows as "🟢 Online"
- Status shows "Monitoring anti-cheat alerts"

### 2. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 3600000,
  "startupTime": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "systems": {
    "discord": true,
    "interactionHandler": true,
    "circuitBreakers": true,
    "commandsRegistered": true,
    "auditService": true
  }
}
```

### 3. Command Registration

Run a test command:
```bash
/settings anticheat
```

Should respond with system status.

### 4. Webhook Test

Send a test webhook:
```bash
curl -X POST http://localhost:3000/webhooks/anticheat \
  -H "Content-Type: application/json" \
  -d '{
    "gameType": "test",
    "playerId": "test_player",
    "username": "TestPlayer",
    "winrateSpike": 10,
    "movementFlags": [],
    "deviceId": null,
    "ipRisk": null,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }'
```

Should create a case in Discord.

## Monitoring

### Application Metrics

Access metrics at: `http://localhost:3000/metrics`

### Log Files

Monitor these log locations:
- Application logs: `logs/`
- PM2 logs: `~/.pm2/logs/`
- System logs: `/var/log/`

### Health Monitoring

Set up monitoring for:
- HTTP health endpoint
- Discord bot presence
- Error rates in logs
- Memory usage
- Response times

## Security

### Webhook Security

1. **HTTPS Only**: Ensure webhook endpoint uses HTTPS
2. **Firewall**: Restrict webhook access to known IPs
3. **Rate Limiting**: Implement rate limiting on webhook endpoint
4. **Payload Validation**: Validate all incoming webhook data

### Bot Security

1. **Token Protection**: Never expose bot token in logs
2. **Permission Least Privilege**: Grant minimum required permissions
3. **Audit Logging**: All actions are logged for review
4. **Regular Updates**: Keep dependencies updated

### Network Security

1. **API Encryption**: Use HTTPS for all API calls
2. **Certificate Validation**: Validate SSL certificates
3. **IP Whitelisting**: Restrict API access to known servers
4. **VPN Consideration**: Consider VPN for sensitive deployments

## Backup and Recovery

### Configuration Backup

```bash
# Backup environment and configuration
tar -czf backup-$(date +%Y%m%d).tar.gz \
  .env \
  ecosystem.config.js \
  logs/
```

### Database Backup

If using local database for audit logs:
```bash
# Backup database (adjust for your database type)
mysqldump anticheat_audit > audit_backup.sql
```

### Recovery Procedure

1. **Stop the bot**: `pm2 stop anticheat-bot`
2. **Restore configuration**: Extract backup files
3. **Restore database**: Import backup data
4. **Restart bot**: `pm2 start anticheat-bot`
5. **Verify functionality**: Run health checks

## Scaling

### Horizontal Scaling

For multiple bot instances:

1. **Shared Database**: Ensure audit logs share database
2. **Load Balancer**: Distribute webhook requests
3. **Redis Pub/Sub**: Coordinate between instances
4. **Shared Configuration**: Use environment variables

### Vertical Scaling

Increase resources:
- **Memory**: 2GB+ for high-traffic servers
- **CPU**: Multi-core for concurrent processing
- **Storage**: SSD storage for log files
- **Network**: High-bandwidth connection

## Troubleshooting

### Bot Not Responding

```bash
# Check bot status
pm2 status

# Check logs
pm2 logs anticheat-bot

# Restart bot
pm2 restart anticheat-bot
```

### Webhook Issues

```bash
# Test webhook endpoint
curl -v http://localhost:3000/health

# Check webhook logs
tail -f logs/out.log | grep webhook
```

### High Memory Usage

```bash
# Monitor memory
pm2 monit

# Restart if memory high
pm2 restart anticheat-bot
```

### Discord API Issues

```bash
# Check Discord status
curl https://discordstatus.com/api/v2/status.json

# Re-register commands if needed
npm run register-commands
```

## Maintenance

### Regular Tasks

- **Daily**: Check health endpoint and logs
- **Weekly**: Review audit logs for anomalies
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and optimize performance

### Updates

1. **Backup current deployment**
2. **Test updates in staging environment**
3. **Deploy updates during low-traffic periods**
4. **Monitor for issues post-deployment**
5. **Rollback plan ready if needed**

## Support

### Getting Help

1. **Check logs**: Review application and system logs
2. **Health checks**: Verify all systems are healthy
3. **Documentation**: Review this deployment guide
4. **Community**: Check community forums/issues
5. **Professional**: Contact support team for critical issues

### Emergency Contacts

- **Development Team**: [contact information]
- **System Administrator**: [contact information]
- **Discord Support**: [server invite]

---

**Remember**: Always test deployments in a staging environment before production deployment.
