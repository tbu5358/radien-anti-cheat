#!/usr/bin/env ts-node

/**
 * Command Registration Script
 *
 * This script registers slash commands with the Discord API.
 * It can register commands globally or to a specific guild for testing.
 *
 * Usage:
 *   npm run register-commands
 *
 * Environment variables:
 *   DISCORD_TOKEN - Bot token
 *   DISCORD_CLIENT_ID - Application ID
 *   DISCORD_GUILD_ID - Guild ID (optional, for guild-specific registration)
 *   REGISTER_GLOBAL - Set to 'true' to register globally (default: false)
 */

import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { getCommandData } from '../src/commands';

// Load environment variables
config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const registerGlobal = process.env.REGISTER_GLOBAL === 'true';

if (!token) {
  console.error('❌ DISCORD_TOKEN environment variable is required');
  process.exit(1);
}

if (!clientId) {
  console.error('❌ DISCORD_CLIENT_ID environment variable is required');
  process.exit(1);
}

async function registerCommands(): Promise<void> {
  try {
    const rest = new REST({ version: '10' }).setToken(token!);
    const commands = getCommandData();

    console.log(`📋 Preparing to register ${commands.length} slash commands...`);
    console.log('Commands:', commands.map(cmd => cmd.name));

    if (registerGlobal) {
      console.log('🌍 Registering commands globally...');
      console.log('⚠️  Warning: Global command registration can take up to 1 hour to update');

      const data = await rest.put(
        Routes.applicationCommands(clientId!),
        { body: commands }
      ) as any[];

      console.log(`✅ Successfully registered ${data.length} global commands`);
    } else if (guildId) {
      console.log(`🏠 Registering commands to guild: ${guildId}`);

      const data = await rest.put(
        Routes.applicationGuildCommands(clientId!, guildId),
        { body: commands }
      ) as any[];

      console.log(`✅ Successfully registered ${data.length} guild commands`);
    } else {
      console.error('❌ Neither REGISTER_GLOBAL=true nor DISCORD_GUILD_ID is set');
      console.error('💡 For development, set DISCORD_GUILD_ID in your .env file');
      console.error('💡 For production, set REGISTER_GLOBAL=true');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  }
}

// Run the registration
registerCommands()
  .then(() => {
    console.log('🎉 Command registration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Command registration failed:', error);
    process.exit(1);
  });
