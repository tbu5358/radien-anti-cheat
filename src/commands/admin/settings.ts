import { Client, SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import {
  validateCommandInteraction,
  createCommandResponse,
  logCommandInteraction,
} from '../commandUtils';
import { configManager } from '../../core/ConfigManager';

// Phase D: Configuration Centralization (Week 4)
// Migrated back to ConfigManager for consistency with other files
// Benefits: Centralized configuration, environment-specific settings
const config = configManager.getConfiguration();
import { getCaseStats } from '../../services/caseService';
import { getAuditStats } from '../../services/auditService';
import { getCircuitBreakerStats } from '../../services/apiClient';

/**
 * Handles the /settings anticheat command interaction.
 *
 * This command provides administrators with configuration options and system information
 * for the anti-cheat moderation bot. When executed, it:
 * 1. Validates the user has Administrator permission
 * 2. Processes the specific subcommand (anticheat)
 * 3. Displays configuration options or system status
 * 4. Logs all administrative actions for audit purposes
 *
 * Available subcommands:
 * - anticheat: Configure anti-cheat system settings and view status
 *
 * @param interaction The Discord command interaction
 */
export async function handleSettings(interaction: ChatInputCommandInteraction): Promise<void> {
  const startTime = Date.now();
  const subcommand = interaction.options.getSubcommand();

  try {
    console.log(`⚙️ Processing settings command:`, {
      userId: interaction.user.id,
      subcommand,
      command: interaction.commandName,
    });

    // Validate permissions - this requires Administrator permission
    const validation = await validateCommandInteraction(interaction);
    if (!validation.isValid) {
      console.warn(`🚫 Permission denied for settings:`, {
        userId: interaction.user.id,
        reason: validation.errorMessage,
      });

      await logCommandInteraction(
        interaction,
        `settings_${subcommand}`,
        false,
        { reason: validation.errorMessage, subcommand }
      );

      await interaction.reply(
        createCommandResponse(
          'error',
          'Administrator Required',
          'This command requires Administrator permissions in the server.'
        )
      );
      return;
    }

    // Handle different subcommands
    switch (subcommand) {
      case 'anticheat':
        await handleAnticheatSettings(interaction, startTime);
        break;

      default:
        await interaction.reply(
          createCommandResponse(
            'error',
            'Unknown Subcommand',
            `The subcommand "${subcommand}" is not recognized.`
          )
        );
    }

  } catch (error) {
    console.error(`❌ Failed to execute settings command:`, {
      userId: interaction.user.id,
      subcommand,
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime,
    });

    // Log the failure
    await logCommandInteraction(
      interaction,
      `settings_${subcommand}`,
      false,
      {
        error: error instanceof Error ? error.message : String(error),
        subcommand,
        processingTimeMs: Date.now() - startTime,
      }
    );

    // Determine if interaction was already deferred
    const wasDeferred = interaction.deferred || interaction.replied;

    const errorResponse = createCommandResponse(
      'error',
      'Settings Command Failed',
      'An error occurred while processing the settings command. Please try again.',
      true
    );

    if (wasDeferred) {
      await interaction.editReply(errorResponse);
    } else {
      await interaction.reply(errorResponse);
    }
  }
}

/**
 * Handle the anticheat subcommand - shows system status and configuration
 */
async function handleAnticheatSettings(
  interaction: ChatInputCommandInteraction,
  startTime: number
): Promise<void> {
  // Acknowledge the interaction
  await interaction.deferReply({ ephemeral: true });

  try {
    // Gather system information
    const [caseStats, auditStats] = await Promise.allSettled([
      getCaseStats(),
      getAuditStats(),
    ]);

    const circuitBreakerStats = getCircuitBreakerStats();

    // Create system status embed
    const statusEmbed = new EmbedBuilder()
      .setTitle('🔧 Anti-Cheat System Status')
      .setDescription('Current system configuration and statistics')
      .setColor(0x5865f2) // Discord blurple
      .setTimestamp()
      .setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    // Add configuration information
    statusEmbed.addFields(
      {
        name: '🔗 API Configuration',
        value: [
          `**Base URL:** ${config.api.baseUrl}`,
          `**Timeout:** ${config.api.baseUrl ? '30s' : 'N/A'}`,
          `**Circuit Breakers:** ${Object.keys(circuitBreakerStats as Record<string, any>).length} endpoints`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '📊 System Statistics',
        value: getSystemStatsText(caseStats, auditStats),
        inline: false,
      },
      {
        name: '🛡️ Circuit Breaker Status',
        value: getCircuitBreakerStatusText(circuitBreakerStats as Record<string, any>),
        inline: false,
      }
    );

    // Create configuration embed
    const configEmbed = new EmbedBuilder()
      .setTitle('⚙️ System Configuration')
      .setDescription('Current bot configuration settings')
      .setColor(0xffa500) // Orange
      .setTimestamp();

    configEmbed.addFields(
      {
        name: '🎯 Channel Configuration',
        value: [
          `**Anti-Cheat Pings:** <#${config.channels.antiCheatPings}>`,
          `**Mod Logs:** <#${config.channels.moderationLogs}>`,
          `**Case Records:** <#${config.channels.caseRecords}>`,
          `**Ban Reviews:** <#${config.channels.banReview}>`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '🔐 Security Settings',
        value: [
          '**Audit Logging:** Enabled',
          '**Permission Validation:** Enabled',
          '**Circuit Breakers:** Enabled',
          '**Request Retry:** Enabled (3 attempts)',
        ].join('\n'),
        inline: false,
      }
    );

    // Log successful settings access
    await logCommandInteraction(
      interaction,
      'settings_anticheat',
      true,
      {
        caseStatsRetrieved: caseStats.status === 'fulfilled',
        auditStatsRetrieved: auditStats.status === 'fulfilled',
        circuitBreakerCount: Object.keys(circuitBreakerStats as Record<string, any>).length,
        processingTimeMs: Date.now() - startTime,
      }
    );

    console.log(`✅ Settings command executed successfully:`, {
      userId: interaction.user.id,
      statsRetrieved: {
        cases: caseStats.status === 'fulfilled',
        audit: auditStats.status === 'fulfilled',
      },
    });

    // Send the response
    await interaction.editReply({
      embeds: [statusEmbed, configEmbed],
    });

  } catch (error) {
    console.error(`❌ Failed to retrieve anticheat settings:`, error);

    await logCommandInteraction(
      interaction,
      'settings_anticheat',
      false,
      {
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: Date.now() - startTime,
      }
    );

    await interaction.editReply(
      createCommandResponse(
        'error',
        'Settings Retrieval Failed',
        'Unable to retrieve system settings. Some services may be unavailable.',
        true
      )
    );
  }
}

/**
 * Format system statistics for display
 */
function getSystemStatsText(
  caseStats: PromiseSettledResult<any>,
  auditStats: PromiseSettledResult<any>
): string {
  const stats = [];

  if (caseStats.status === 'fulfilled' && caseStats.value.success) {
    const data = caseStats.value.data;
    stats.push(
      `**Cases:** ${data.totalCases || 0} total (${data.openCases || 0} open)`,
      `**Resolution:** ${data.averageResolutionTime ? `${Math.round(data.averageResolutionTime / (1000 * 60 * 60))}h avg` : 'N/A'}`
    );
  } else {
    stats.push('**Cases:** Service unavailable');
  }

  if (auditStats.status === 'fulfilled' && auditStats.value.success) {
    const data = auditStats.value.data;
    stats.push(
      `**Audit Events:** ${data.totalEntries || 0} total`,
      `**Health:** ${data.systemHealth?.uptime ? `${Math.round(data.systemHealth.uptime * 100) / 100}%` : 'N/A'}`
    );
  } else {
    stats.push('**Audit:** Service unavailable');
  }

  return stats.join('\n');
}

/**
 * Format circuit breaker status for display
 */
function getCircuitBreakerStatusText(circuitBreakerStats: Record<string, any>): string {
  const stats = Object.entries(circuitBreakerStats);

  if (stats.length === 0) {
    return 'No circuit breakers configured';
  }

  const statusSummary = stats.map(([endpoint, status]) => {
    const stateEmoji = status.state === 'closed' ? '✅' :
                      status.state === 'open' ? '❌' : '⚠️';
    return `${stateEmoji} ${endpoint.split('/').pop()}: ${status.state}`;
  });

  return statusSummary.join('\n');
}


/**
 * Command definition for the /settings slash command
 * Used for registering the command with Discord
 */
export const settingsData = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('Administrator configuration and system status')
  .addSubcommand(subcommand =>
    subcommand
      .setName('anticheat')
      .setDescription('View anti-cheat system status and configuration')
  );
