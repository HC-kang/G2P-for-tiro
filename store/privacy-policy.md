# G2P for Tiro: Privacy Policy

Last updated: 2026-09-20

G2P for Tiro ("the app") is an unofficial client that shows your Tiro meeting notes on Even Realities G2 glasses. The app is not made by, or affiliated with, Tiro or Even Realities.

## Summary

- The developer operates no server. The developer receives none of your data.
- The app has no analytics, no advertising, and no tracking.
- Your API keys and your notes stay on your phone, except for the requests described below.

## Data the app handles

### API keys (you provide them)

- You enter your own Tiro API key. You can also enter your own Groq API key (optional, for voice search).
- The app stores the keys in the Even Realities app's plugin storage on your phone.
- The app sends the Tiro key only to `https://mcp.tiro.ooo`. The app sends the Groq key only to `https://api.groq.com`.
- To delete the keys, press "key 모두 삭제" (delete all keys) in the app's phone screen, or uninstall the app.

### Tiro notes (network permission)

- The app reads your note list, note summaries, and transcripts from `https://mcp.tiro.ooo` with your Tiro key.
- The app keeps this content in memory only while it is shown. The app does not write notes to storage.
- The app does not change or delete your Tiro notes.

### Microphone (g2-microphone permission)

- The app opens the glasses microphone only after you select "[음성 검색]" (voice search).
- The microphone closes when you tap again, when you cancel, or after 15 seconds at the latest.
- The app sends the recorded audio to Groq (`https://api.groq.com`) to convert it to text. The app sends the resulting text to Tiro as a search keyword.
- The app does not store the audio. The app never records in the background.
- If you do not enter a Groq key, the app never opens the microphone.

## Third parties

| Service | What it receives | Their policy |
|---|---|---|
| Tiro (`mcp.tiro.ooo`) | Your Tiro API key, your search keywords, requests for your notes | https://tiro.ooo |
| Groq (`api.groq.com`) | Your Groq API key, short voice-search audio clips | https://groq.com/privacy-policy |

These services process the data under their own terms. The accounts and keys are yours.

## Children

The app is not directed at children under 13.

## Changes

The developer will publish changes to this policy at this URL and update the date above.

## Contact

Open an issue at https://github.com/HC-kang/G2P-for-tiro/issues
