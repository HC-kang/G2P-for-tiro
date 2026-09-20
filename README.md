# G2P for Tiro

Unofficial [Tiro](https://tiro.ooo) client for Even Realities G2 glasses. Not made by, or affiliated with, Tiro or Even Realities.

- Browse recent Tiro notes and read the one-page summary on the glasses.
- Voice search (optional): glasses microphone → Groq Whisper → Tiro search.
- Live view: follow a note that Tiro is still recording.

Bring your own keys. The app runs in the Even app's WebView and calls `mcp.tiro.ooo` and `api.groq.com` directly. There is no server.

[Privacy policy](store/privacy-policy.md)

## Develop

```bash
npm install
npm run dev                                  # dev server on :5173
npx evenhub qr --url "http://<LAN IP>:5173"  # scan with the Even app (Even Hub tab → Scan QR)
npm test                                     # text and audio helpers
npm run pack                                 # out.ehpk for the Even Hub portal
```

- Enter your Tiro API key (and optionally a Groq key) on the phone screen. A read-only Tiro key is enough: `note:read`, `note_summary:read`.
- In dev mode the glasses-side WebView posts logs to the dev server (`[device] ...`).
- `http://localhost:5173/#demo` in `evenhub-simulator` shows canned data (used for the store screenshots).

## G2 limits measured on a real device

- `rebuildPageContainer` rejects text over ~1000 UTF-8 bytes (not chars). `textContainerUpgrade` accepts more.
- A list item must stay under 64 UTF-8 bytes. Hangul is 3 bytes per char.
- The glasses font renders Hangul.
- Microphone audio is 16 kHz mono S16LE PCM in 1600-byte frames.
