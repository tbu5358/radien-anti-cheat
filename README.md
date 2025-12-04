# Anti-Cheat Moderation Bot

A comprehensive Discord bot for managing anti-cheat moderation workflows in gaming communities. Built with TypeScript, Discord.js v14, and enterprise-grade reliability features.

## Features

### 🎯 Core Functionality

- **Anti-Cheat Integration**: Receives and processes anti-cheat alerts from backend systems
- **Case Management**: Automated case creation with comprehensive tracking
- **Moderator Tools**: Rich Discord interface for case investigation and resolution
- **Audit Compliance**: Complete audit trails for all moderation actions
- **Permission System**: Hierarchical role-based access control

### 🛡️ Reliability & Security

- **Circuit Breaker Pattern**: Automatic failure protection and recovery
- **Rate Limiting**: Built-in Discord rate limit compliance
- **Audit Logging**: Enterprise-grade audit trails
- **Permission Validation**: Multi-layer access control
- **Error Resilience**: Comprehensive error handling and recovery

### 📊 Monitoring & Health

- **Health Checks**: Real-time system health monitoring
- **Performance Metrics**: Interaction timing and throughput tracking
- **Circuit Breaker Status**: Automatic failure detection and recovery
- **Audit Statistics**: Moderation activity analytics

## Quick Start

### Prerequisites

- Node.js 18+ with TypeScript
- Discord Bot Token
- Backend API access (for anti-cheat integration)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd radien-anticheat-bot

# Install dependencies
npm install

# Copy environment configuration
cp env.example .env
# Edit .env with your configuration
```

### Configuration

Edit `.env` with your bot configuration:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here

# Channel IDs (create these channels in your Discord server)
ANTI_CHEAT_PINGS_CHANNEL=your_pings_channel_id
MODERATION_LOGS_CHANNEL=your_logs_channel_id
CASE_RECORDS_CHANNEL=your_cases_channel_id
BAN_REVIEW_CHANNEL=your_ban_review_channel_id

# Backend API Configuration
BACKEND_API_URL=https://your-backend-api.com
BACKEND_API_KEY=your_api_key_here

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret_here

# Development Helpers
MOCK_MODE=false
```

### Running the Bot

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Offline Mock Mode

Want to exercise the Discord flows without wiring up the real backend or webhook infrastructure?
Set `MOCK_MODE=true` to swap the API client for an in-memory mock backend while keeping full Discord connectivity.

```bash
# 1. Start the bot with the mock backend (uses port 3000 by default)
npm run dev:mock

# 2. In another terminal, replay the provided CSV through the webhook
npm run simulate:events

#    Optionally provide a custom CSV path:
# npm run simulate:events -- ./path/to/my-events.csv
```

Requirements:

- **Real Discord credentials required**: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` must be valid (the bot connects to real Discord)
- **Mock backend data**: `BACKEND_API_URL` / `BACKEND_API_KEY` can use placeholder values (validated but not used)
- **Webhook signing**: `WEBHOOK_SECRET` must be set (the replay script signs each payload)
- **Channel IDs**: All Discord channel IDs must be configured for the bot to function
- **Data persistence**: Mock data is stored in-memory, so restart the bot to reset

This flow keeps the bot online in Discord, lets you click every button, and drives embeds from `tests/load/payloads/anti-cheat-events.csv` without needing any external API or webhook services.

### Discord Setup

1. **Register Slash Commands**:
   ```bash
   npm run register-commands
   ```

2. **Invite Bot to Server**:
   Use this URL with your `DISCORD_CLIENT_ID`:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268435456&scope=bot%20applications.commands
   ```

3. **Configure Channels**:
   Create the required channels and update their IDs in `.env`

## Architecture

### System Components

```
├── bot.ts                 # Main entry point with full lifecycle
├── handlers/              # Discord interaction handlers
│   ├── interactionHandler.ts  # Unified interaction router
│   └── auditMiddleware.ts     # Audit logging middleware
├── commands/              # Slash command implementations
│   ├── moderation/        # Moderator commands
│   └── admin/            # Administrator commands
├── components/            # Discord UI components
│   ├── buttons/          # Interactive button handlers
│   └── embeds/           # Rich embed builders
├── services/              # Business logic and API clients
│   ├── apiClient.ts      # HTTP client with resilience
│   ├── auditService.ts   # General audit logging
│   └── moderationAuditService.ts # Moderation-specific audit
├── types/                 # TypeScript type definitions
└── webhooks/              # Anti-cheat webhook handlers
```

### Data Flow

1. **Anti-Cheat Alert** → Webhook → Bot receives event
2. **Case Creation** → Bot creates Discord case embed with action buttons
3. **Moderator Interaction** → Buttons trigger backend API calls
4. **Audit Logging** → All actions logged to audit service
5. **Resolution** → Case closed with final audit entry

## Commands

### Moderation Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/case <caseId>` | View case details | Moderator |
| `/mod tools` | Access internal tools | Moderator |

### Administrator Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/settings anticheat` | System status & config | Administrator |

## API Integration

### Webhook Endpoints

- `POST /webhooks/anticheat` - Receive anti-cheat alerts
- `GET /health` - Health check endpoint
- `GET /metrics` - System metrics

### Backend API Requirements

The bot expects these API endpoints:

- `POST /moderation/anticheat` - Submit anti-cheat events
- `GET /moderation/cases/{id}` - Get case details
- `POST /moderation/action/{caseId}` - Take moderation actions
- `POST /moderation/audit` - Submit audit entries
- `GET /audit/stats` - Get audit statistics

## Security

### Authentication

- **Discord OAuth2**: Bot authentication via Discord
- **API Keys**: Backend API authentication
- **Webhook Secrets**: Webhook payload validation

### Authorization

- **Role-Based Access**: Discord role hierarchy
- **Permission Levels**: Moderator → Senior Moderator → Administrator
- **Channel Restrictions**: Commands only work in appropriate channels

### Audit & Compliance

- **Complete Audit Trail**: Every action is logged
- **Tamper Detection**: Cryptographic audit entry validation
- **Retention Policies**: Configurable audit log retention
- **Export Capabilities**: Audit data export for compliance

## Monitoring

### Health Endpoints

- **Bot Health**: `GET /health` - Overall system status
- **Metrics**: `GET /metrics` - Detailed performance metrics
- **Circuit Breakers**: Automatic failure detection and recovery

### Discord Presence

The bot's Discord presence indicates system health:
- 🟢 **Online**: System healthy
- 🟡 **Idle**: Some systems degraded
- 🔴 **Do Not Disturb**: System issues detected

## Development

### Project Structure

```
src/
├── bot.ts                 # Main application entry
├── handlers/              # Discord event handlers
├── commands/              # Slash command definitions
├── components/            # UI components and interactions
├── services/              # Business logic and API clients
├── types/                 # TypeScript definitions
├── webhooks/              # Webhook handlers
└── config/               # Configuration management
```

### Development Commands

```bash
# Install dependencies
npm install

# Development with auto-reload
npm run dev

# Build for production
npm run build

# Register commands (development)
npm run register-commands

# Type checking
npm run build

# Linting (if configured)
npm run lint
```

### Adding New Features

1. **Commands**: Add to `commands/` directory with proper permissions
2. **Buttons**: Add to `components/buttons/` with audit logging
3. **Services**: Add to `services/` with error handling
4. **Types**: Define in `types/` with comprehensive JSDoc

## Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Discord channels created and IDs updated
- [ ] Backend API accessible and configured
- [ ] SSL certificates for webhook endpoint
- [ ] Database configured for audit logs
- [ ] Monitoring and alerting set up
- [ ] Backup procedures established

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token | Yes |
| `DISCORD_CLIENT_ID` | Discord application ID | Yes |
| `DISCORD_GUILD_ID` | Guild ID for command registration | No* |
| `BACKEND_API_URL` | Backend API base URL | Yes |
| `BACKEND_API_KEY` | Backend API authentication key | Yes |
| `WEBHOOK_SECRET` | Webhook signature secret | Yes |

*Required for guild-specific command registration in development

## Troubleshooting

### Common Issues

**Bot doesn't respond to commands**
- Check command registration: `npm run register-commands`
- Verify bot permissions in Discord server
- Check bot is online: Discord presence status

**Webhook events not processing**
- Verify webhook URL is accessible
- Check webhook secret configuration
- Review webhook payload format

**Audit logs not appearing**
- Check backend API connectivity
- Verify audit service configuration
- Review error logs for API failures

### Debug Mode

Enable verbose logging:

```bash
DEBUG=* npm run dev
```

Or set specific debug flags:

```env
DEBUG_INTERACTIONS=true
DEBUG_AUDIT=true
DEBUG_API=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with comprehensive tests
4. Update documentation
5. Submit a pull request

### Code Standards

- **TypeScript**: Strict type checking enabled
- **Documentation**: JSDoc comments on all exports
- **Error Handling**: Comprehensive try/catch blocks
- **Audit Logging**: Every user action logged
- **Security**: Input validation and permission checks

## License

[Your License Here]

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting guide
- Contact the development team

---

**Built with ❤️ for the gaming community**