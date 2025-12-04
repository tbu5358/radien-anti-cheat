# Anti-Cheat Moderation Bot — Phased Implementation Plan

This document outlines a **full production plan** for the Raiden Games **Anti‑Cheat Moderation Bot**, using the Discord Bot (Buttons + Slash Commands) approach.

It mirrors the structure and detail level of the Player-Facing Bot plan, but tailored for moderation workflows, moderator UX, audit trails, and communication with the anti‑cheat backend.

---

# ✅ **Phase 0 — Architecture & Data Flow (Updated)**

## **How the system works (Option 1 Workflow — Updated User Flow)**

### **Finalised User Flow (Updated)**

### **Channel Destinations (New Requirements)**

* **Anti-Cheat Pings Channel:** `anti-cheat-pings` — **1445188473433882745**
* **Moderation Action Logs Channel:** `mod-logs` — **1445188091919990806**
* **Case Records Channel:** `mod-cases` — **1445188368882466827**

### **Updated Interaction Flow With Channels**

1. Anti-cheat backend → webhook → bot.

2. Bot generates an **Anti-Cheat Alert Embed** and posts it in:

   * 🟩 **#anti-cheat-pings (1445188473433882745)**

3. Moderators interact using action buttons.

4. Every button press generates a **Moderation Action Log Embed**, posted to:

   * 🟥 **#mod-logs (1445188091919990806)**

5. When a case reaches a final state (Flagged, Banned, or Resolved), the bot posts a **Case Summary Embed** to:

   * 📘 **#mod-cases (1445188368882466827)**

6. Case data is archived for future reference and investigation.

7. **Anti-cheat backend detects anomaly** → sends webhook to bot/backend.

8. The bot posts an **Anti-Cheat Alert Embed** in the **designated review channel** (e.g., `#mod-cases`).

9. Moderators interact with buttons:

   * 🟧 Flag Player
   * 🟦 Spectate
   * 🟨 Request Evidence
   * 🟥 Ban
   * 🟩 Resolve / Dismiss

10. When a moderator clicks an action:

    * The bot captures **which Discord moderator** performed the action.
    * Bot executes backend update (flag/ban/etc).
    * Bot creates a **Moderation Action Log Embed** and posts it in the separate **logger channel** (e.g., `#ac-logs`).

### **What the Log Embed Contains (New Requirement)**

* Moderator username + ID
* Action taken
* Player affected
* Case ID
* Original anti-cheat data snapshot
* Timestamp
* Optional moderator reason

This provides a **clean audit trail** for every moderation action.

1. **Anti‑Cheat System detects anomaly**

   * Sends webhook → `/webhooks/anticheat` on your internal backend
   * Backend validates & formats event
   * Backend sends message to Moderation Bot API route (or bot directly via WebSocket)

2. **Discord Bot posts an alert embed** to a private mod channel:

   * Player ID
   * GameType
   * Winrate spike (% change)
   * Movement anomalies (anti-cheat flags)
   * Logs (summaries)
   * Device ID mismatches
   * IP flags (VPN, proxy, multi-account)

3. Message includes **moderation action buttons**:

   * 🟧 **Flag Player**
   * 🟦 **Spectate (link)**
   * 🟨 **Request Evidence**
   * 🟥 **Ban Player**
   * 🟩 **Resolve / Dismiss**

4. Bot handles button interactions → sends result to backend → backend updates anti‑cheat/moderation database.

---

# ✅ **Phase 1 — Folder Structure**

```
/anti-cheat-bot
 ├── src
 │   ├── commands
 │   │   ├── moderation
 │   │   │   └── caseLookup.ts
 │   │   ├── admin
 │   │   │   └── settings.ts
 │   │   └── index.ts
 │   ├── components
 │   │   ├── buttons
 │   │   │   ├── flagPlayer.ts
 │   │   │   ├── spectatePlayer.ts
 │   │   │   ├── requestEvidence.ts
 │   │   │   ├── banPlayer.ts
 │   │   │   └── resolveCase.ts
 │   │   ├── embeds
 │   │   │   ├── antiCheatAlertEmbed.ts
 │   │   │   ├── caseEmbed.ts
 │   │   │   └── actionLogEmbed.ts
 │   │   └── utils
 │   │       └── formatters.ts
 │   ├── services
 │   │   ├── apiClient.ts
 │   │   ├── moderationService.ts
 │   │   ├── caseService.ts
 │   │   └── antiCheatService.ts
 │   ├── handlers
 │   │   ├── commandHandler.ts
 │   │   └── interactionHandler.ts
 │   ├── webhooks
 │   │   └── antiCheatWebhook.ts
 │   ├── config
 │   │   └── environment.ts
 │   ├── index.ts
 │   └── types
 │       ├── AntiCheatEvent.ts
 │       ├── ModerationCase.ts
 │       └── PlayerFlags.ts
 ├── .env
 ├── package.json
 └── tsconfig.json
```

---

# ✅ **Phase 2 — Type Definitions**

### `/src/types/AntiCheatEvent.ts`

```ts
export interface AntiCheatEvent {
  gameType: string;
  previousPings: number;
  playerId: string;
  username: string;
  winrateSpike: number;
  movementFlags: string[];
  deviceId: string | null;
  ipRisk: string | null;
  timestamp: string;
}
```

### `/src/types/ModerationCase.ts`

```ts
export interface ModerationCase {
  caseId: string;
  playerId: string;
  moderatorId: string;
  action: "FLAG" | "BAN" | "REQUEST_EVIDENCE" | "RESOLVE";
  reason?: string;
  createdAt: string;
}
```

---

# ✅ **Phase 3 — Services**

These handle communication with your backend moderation APIs.

### `/src/services/antiCheatService.ts`

```ts
export async function submitAntiCheatEvent(event: AntiCheatEvent) {
  return api.post("/moderation/anticheat", event);
}
```

### `/src/services/moderationService.ts`

```ts
export async function takeAction(caseId: string, payload: any) {
  return api.post(`/moderation/action/${caseId}`, payload);
}
```

### `/src/services/caseService.ts`

```ts
export async function createCase(event: AntiCheatEvent) {
  const { data } = await api.post(`/moderation/cases`, event);
  return data;
}
```

---

# ✅ **Phase 4 — Webhook Listener**

### `/src/webhooks/antiCheatWebhook.ts`

* Backend posts anti-cheat events here
* Bot receives them
* Bot formats and posts an embed to the mod channel

Logic:

1. Receive event
2. Validate payload
3. Call `caseService.createCase(event)`
4. Send embed to moderator Discord channel
5. Attach action buttons

---

# ✅ **Phase 5 — Embeds**

### Anti‑Cheat Alert Embed (Updated With Game Type & Previous Pings)

`/src/components/embeds/antiCheatAlertEmbed.ts`

```ts
export function buildAntiCheatAlertEmbed(event: AntiCheatEvent, caseId: string) {
  return new EmbedBuilder()
    .setTitle(`🚨 Anti-Cheat Alert — Case #${caseId}`)
    .addFields(
      { name: "Game Type", value: event.gameType || "Unknown" },
      { name: "Previous Anti‑Cheat Pings", value: event.previousPings?.toString() || "0" },
      { name: "Player", value: `${event.username} (${event.playerId})` },
      { name: "Winrate Spike", value: `${event.winrateSpike}%` },
      { name: "Movement Flags", value: event.movementFlags.join(", ") || "None" },
      { name: "Device ID", value: event.deviceId || "Unknown" },
      { name: "IP Risk", value: event.ipRisk || "None" },
      { name: "Time", value: `<t:${Math.floor(new Date(event.timestamp).getTime() / 1000)}:R>` }
    );
}
```

---

# ✅ **Phase 6 — Buttons (Updated With Permissions & Ban Review System)**

Each button file handles a specific interaction and now includes **role + permission validation**.

## Permission Levels

* **Moderator**

  * Flag Player
  * Request Evidence
  * Submit for Ban Review
  * Resolve Case
* **Senior Moderator**

  * Approve Ban
  * Reject Ban
  * Close Ban Review Cases

## Buttons**

Each button file handles a specific interaction.

### 🟧 Flag Player

* Marks case as "FLAGGED"
* Adds to monitoring queue

### 🟦 Spectate

* Opens dashboard link to live game
* `/spectate/{playerId}` on internal tools

### 🟨 Request Evidence

* Prompts mod to input required evidence
* Backend logs request

### 🟥 Submit for Ban Review

* Mod clicks **Submit for Ban Review** instead of an instant ban.
* Bot opens a modal requesting:

  * **Reason for suspected cheating**
  * **Evidence links or attachments**
* Bot sends the full packet to the **ban-review** channel (1445188267006890076)
* Sr. Mod reviews the submitted case.
* Sr. Mod can choose:

  * ✅ **Approve Ban**
  * ❌ **Reject Ban**
* All actions logged to **mod-logs**.

### 🟩 Resolve / Dismiss

* Closes case
* Marks as resolved in DB

Each button stored inside:

```
/src/components/buttons/
```

---

# ✅ **Phase 7 — Slash Commands**

Moderation-only commands.

## `/case <caseId>`

View any case embed again.

## `/mod tools`

Show internal tool links.

## `/settings anticheat`

Admin-only configuration.

---

# ✅ **Phase 8 — Interaction Handler**

`/src/handlers/interactionHandler.ts`

* Maps button IDs to handlers
* Logs all moderator actions
* Sends audit event to backend

---

# ✅ **Phase 9 — Moderation Audit Logging**

Every mod button interaction generates:

* Case ID
* Moderator Discord ID
* Action
* Timestamp
* Optional reason

Sent to:
`POST /moderation/audit`

---

# ✅ **Phase 10 — Final Assembly & Deployment**

* Register slash commands
* Load button handler registry
* Load webhook listener
* Deploy bot to server
* Assign bot to mod-only channels
* Add rate limiting & permission checks

---

