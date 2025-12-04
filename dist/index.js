"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const environment_1 = require("./config/environment");
const commands_1 = require("./commands");
const handlers_1 = require("./handlers");
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
client.once('ready', () => {
    console.log(`🤖 Anti-Cheat Moderation Bot is online as ${client.user?.tag}!`);
});
// Register commands and handlers
(0, commands_1.registerCommands)(client);
(0, handlers_1.registerHandlers)(client);
client.login(environment_1.environment.DISCORD_TOKEN);
//# sourceMappingURL=index.js.map