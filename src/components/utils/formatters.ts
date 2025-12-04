// Utility functions for formatting data in embeds and messages

export function formatTimestamp(timestamp: string): string {
  return `<t:${Math.floor(new Date(timestamp).getTime() / 1000)}:R>`;
}

export function formatPlayerInfo(username: string, playerId: string): string {
  return `${username} (${playerId})`;
}

export function formatMovementFlags(flags: string[]): string {
  return flags.length > 0 ? flags.join(", ") : "None";
}

export function formatPercentage(value: number): string {
  return `${value}%`;
}
