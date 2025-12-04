/**
 * Represents an anti-cheat detection event from the backend anti-cheat system.
 * This event is triggered when suspicious player behavior is detected and requires
 * moderator review through the Discord bot interface.
 *
 * @interface AntiCheatEvent
 */
export interface AntiCheatEvent {
  /**
   * The type of game where the suspicious activity was detected
   * Examples: "chess", "poker", "slots", etc.
   */
  gameType: string;

  /**
   * Number of previous anti-cheat alerts/pings for this player
   * Used to determine if this is a repeat offender
   */
  previousPings: number;

  /**
   * Unique identifier for the player in the game's system
   * This should match the player ID used in game sessions
   */
  playerId: string;

  /**
   * The player's display name/username in the game
   * Used for identification in Discord embeds and moderator communication
   */
  username: string;

  /**
   * The detected winrate spike as a percentage
   * Represents how much the player's winrate increased suspiciously
   * Example: 45.5 for a 45.5% increase
   */
  winrateSpike: number;

  /**
   * Array of detected movement/cheating flags
   * Examples: ["speed_hack", "teleport", "aimbot_detected", "wallhack"]
   * Empty array means no movement flags detected
   */
  movementFlags: string[];

  /**
   * Device identifier for tracking multi-account behavior
   * Can be null if device fingerprinting is disabled or unavailable
   */
  deviceId: string | null;

  /**
   * IP-based risk assessment result
   * Examples: "VPN_DETECTED", "PROXY_SUSPECTED", "MULTI_ACCOUNT", null
   * Null means no IP-based risks detected
   */
  ipRisk: string | null;

  /**
   * ISO 8601 timestamp when the anti-cheat event was detected
   * Used for sorting, filtering, and display in Discord
   */
  timestamp: string;
}
