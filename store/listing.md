# Store listing draft: G2P for Tiro

## Name
G2P for Tiro

## Short description
Read your Tiro meeting notes on G2. Browse, voice-search, and follow a live recording. Unofficial client, bring your own keys.

## Description
G2P for Tiro puts your Tiro meeting notes in front of your eyes.

- Browse your recent notes and read the one-page summary of any meeting.
- Long summaries scroll in chunks, and each chunk repeats the last line of the previous one, so you keep the thread.
- Voice search: say a keyword, and the matching notes appear (optional, needs a Groq API key).
- Live view: open a note that Tiro is still recording, and new transcript paragraphs appear as Tiro publishes them (typically every 40 to 90 seconds).

Bring your own keys. You enter your own Tiro API key (and optionally a Groq API key) once on the phone screen. The keys stay on your phone. The app talks directly to Tiro and Groq. There is no developer server, no account, no analytics.

Tip: create a read-only Tiro key (scopes `note:read`, `note_summary:read`) at platform.tiro.ooo/me/api-keys.

This is an unofficial client. It is not made by, or affiliated with, Tiro or Even Realities.

## Controls
- Scroll: move the selection / scroll text
- Tap: open the selected note, or finish voice input
- Double-tap: go back. On the first note list, double-tap exits the app.

## Permissions
- network: reads your Tiro notes (mcp.tiro.ooo) and transcribes voice-search audio (api.groq.com) with your own API keys.
- g2-microphone: records a short spoken query for voice search, only while you search (15 seconds maximum).

## Release notes (0.1.0)
Browse and read Tiro meeting summaries on G2. Voice search with your own Groq key. Live view of a meeting that Tiro is still recording.

## Privacy policy URL
https://github.com/HC-kang/G2P-for-tiro/blob/main/store/privacy-policy.md

## Assets in this folder
- icon-foreground.png (512x512, white glyph on transparent), icon-background.png (512x512, solid black), icon-preview.png (combined, for reference)
- 01-list, 02-summary, 03-listening, 04-live: simulator captures at 576x288. `*-black.png` has a black background (what the wearer sees); the plain files are the raw simulator output with a transparent background.
