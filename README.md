# VNA PTFS Bot

Discord bot for the Vietnam Airlines PTFS community: flight booking, the
Lotusmiles loyalty program, and an automated exit survey for members who
leave the server.

## Commands

| Command | Description | Permission |
|---|---|---|
| `/ping` | Health check | Everyone |
| `/book flight fareclass` | Book a seat on a scheduled flight | Everyone |
| `/mybookings` | List your confirmed bookings | Everyone |
| `/cancelbooking pnr` | Cancel a booking by PNR | Everyone |
| `/miles` | Check your Lotusmiles balance, tier, and progress | Everyone |
| `/flight-create ...` | Schedule a new bookable flight (also creates a Discord Scheduled Event) | Staff role |
| `/flight-list` | List upcoming scheduled flights with live seat counts | Staff role |
| `/flight-cancel flightnumber` | Cancel a flight — refunds every booking and claws back the miles they earned | Staff role |
| `/miles-adjust user amount reason` | Manually add/remove Lotusmiles (comps, corrections, penalties) | Staff role |

## How the pieces fit together

- **Booking ↔ Lotusmiles**: booking a flight automatically credits Lotusmiles
  miles (`distance × fare-class multiplier × your tier's earn bonus`),
  computed in `modules/lotusmiles/calculateEarnedMiles.js`. Cancelling a
  booking claws those miles back. Tier thresholds and names live in
  `modules/lotusmiles/tiers.js` — **these are a placeholder design, not
  pulled from an official Lotusmiles rate card**, since I couldn't verify
  Vietnam Airlines' actual tier structure/bonuses. Edit that file to match
  whatever numbers your community's Lotusmiles page/handbook actually uses.
- **Exit survey**: fires on the native `guildMemberRemove` event (not by
  reading Dyno's leave-alert message — that stays exactly as Dyno already
  handles it in <#1529710215967019088>). The bot DMs the leaving member,
  logs `Failed to send DM to [User] (DMs blocked)` to
  `EXIT_SURVEY_LOG_CHANNEL_ID` if the DM can't be delivered, and — when they
  do reply — records the response, thanks them, and forwards it as an embed
  to `EXIT_FEEDBACK_CHANNEL_ID`. See "Exit survey details" below.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in every value:
   - Discord token, client ID, guild ID, staff role ID
   - `EXIT_FEEDBACK_CHANNEL_ID` — your `#exit-feedback` channel
   - `EXIT_SURVEY_LOG_CHANNEL_ID` — where "DM failed" notices get logged
   - Firebase service account fields (Firestore)
3. In the Discord Developer Portal → **Bot** tab, enable the **Server
   Members Intent** and **Message Content Intent** (both privileged) — the
   exit survey needs both. See "Discord setup" below for exactly why.
4. Register slash commands: `npm run deploy-commands`
5. Run it: `npm start` (or `npm run dev` for auto-restart during development)
6. Invite the bot with the `bot` + `applications.commands` scopes and, at
   minimum: Send Messages, Embed Links, Manage Events (for the scheduled
   flight events).

## Discord setup — intents this bot needs

`index.js` requests:
- `Guilds` — slash commands, scheduled events
- `GuildMembers` (privileged — **Server Members Intent**) — required to
  receive `guildMemberRemove` at all
- `DirectMessages` — required to receive the ex-member's DM reply
- `MessageContent` (privileged — **Message Content Intent**) — required to
  read the *text* of that DM reply, not just that a message arrived

Both privileged intents must be toggled on in the Developer Portal's **Bot**
tab, or the bot will fail to connect once it requests them.

## Exit survey details

- **Trigger**: native `guildMemberRemove` — the bot does not parse Dyno's
  message. Dyno keeps posting its own leave alert to the staff channel
  exactly as it does today; this is a fully separate, independent listener.
- **DM privacy failures are expected and handled**: if the user has DMs
  closed or shares no other server with the bot, `member.send()` rejects.
  That's caught, logged to `EXIT_SURVEY_LOG_CHANNEL_ID`, and the survey
  record is marked `dm_failed` — nothing throws or crashes.
- **Response matching survives a restart**: rather than an in-memory
  "waiting for a reply" collector (which would be lost if the bot restarts
  before they reply), every DM the bot receives is checked against Firestore
  for a `pending` survey from that user (`modules/exitSurvey/handleDmResponse.js`).
  This is more robust for a survey that might sit unanswered for hours.
- **First reply wins**: once a response is recorded the survey's status
  flips to `responded`, so a second DM from the same person afterward is
  just treated as a normal DM (not appended to the survey).
- **Firestore collection**: `exitSurveys/{autoId}` — `userId`, `userTag`,
  `guildId`, `leftAt`, `dmSent`, `dmFailed`, `response`, `respondedAt`,
  `status` (`pending` / `dm_failed` / `responded`), `forwardedMessageId`.

## Project structure

- `commands/` — one file per slash command, grouped by permission tier
  (`general/`, `passenger/`, `staff/`)
- `events/` — Discord.js event listeners (`ready`, `interactionCreate`,
  `guildMemberRemove`, `messageCreate`)
- `modules/` — feature logic: `booking/`, `lotusmiles/`, `exitSurvey/`
- `config/firebase.js` — Firestore connection
- `utils/` — shared helpers (command/event loading, embeds, permission
  checks, channel logging)

## Firestore collections

- `flights/{flightId}` — flightNumber, origin, destination, aircraft,
  departureTime, distanceNm, capacity `{economy, business}`, booked
  `{economy, business}`, status, scheduledEventId
- `bookings/{flightId_userId}` — userId, userTag, flightId, flightNumber,
  fareClass, pnr, status, milesEarned, bookedAt, cancelledAt
- `lotusmilesAccounts/{userId}` — balance, lifetimeMiles, tier, memberSince,
  lastActivityAt
- `exitSurveys/{autoId}` — see "Exit survey details" above

## Deployment

See the bot-builder skill's `references/deployment.md` for hosting options
(Railway/Render, VPS + PM2, Docker).
