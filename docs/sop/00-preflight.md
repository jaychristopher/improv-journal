# SOP 00 · Preflight

## Purpose

Verify every tool, key, and MCP server the pipeline needs is wired up before starting a cycle. Catches the "stuck for 20 min on a missing env var" failure mode.

## Inputs

- A clean shell session
- `.env` file in the project root
- `videos/` directory with `node_modules/` installed (`npm install` already run)

## Outputs

A green checklist (or a list of fixes to apply before starting a cycle). Nothing written to disk — this is a pre-cycle gate.

## Tools

`bash`, `node`, `ffmpeg`, `npm`, the Figma MCP server, ElevenLabs API.

## Steps

1. **API keys present.** Check `.env`:
   ```bash
   grep -E "^(ELEVENLABS_API_KEY|ELEVENLABS_VOICE_ID)" .env
   ```
   Both must be set. The same key is used for TTS (SOP 08) and Scribe STT (SOP 10).
2. **Quota.** Confirm ElevenLabs Pro quota will cover the cycle (~5K chars per video):
   ```bash
   node scripts/generate-episode.mjs --quota
   ```
   If <50K chars left, defer the cycle to next billing day.
3. **ffmpeg on PATH.**
   ```bash
   ffmpeg -version | head -1
   ```
   Must print version line. If not, install ffmpeg system-wide.
4. **Node + Remotion deps.**
   ```bash
   cd videos && npm ls remotion
   ```
   Should print `remotion@4.0.x`. If "missing," run `npm install` in `videos/`.
5. **Figma MCP server connected.** Open the Claude Code session and confirm `mcp__figma__*` tools are listed under available tools. If not, follow the channel design system Figma file's MCP setup link.
6. **GitHub CLI identity (if planning to push).**
   ```bash
   gh auth status
   ```
   Confirm the active user matches the repo's expected identity (this project: `jaychristopher`). Switch with `gh auth switch --user jaychristopher` if not.
7. **Disk space.** Need ~5GB free for Remotion frame cache during render (SOP 13).
   ```bash
   df -h .
   ```

## Quality bar

- All 7 checks pass before any cycle work begins
- If any fail, fix before starting — don't run the pipeline with a known-broken dependency

## Common pitfalls

- **Skipping preflight "because last cycle worked."** API keys rotate, MCP servers disconnect on session restart, dependencies drift after `npm install` elsewhere. Run preflight every cycle.
- **Treating the Scribe key as separate from ElevenLabs.** It's the same `ELEVENLABS_API_KEY`. If TTS works, Scribe will work — but verify the key has Scribe enabled (Pro plan does by default).
- **Using a stale Figma MCP token.** The MCP server's auth expires. If `mcp__figma__whoami` returns an error, re-auth via the prompt the server provides.

## Estimated time

3-5 minutes.

## Lessons from prior production

- L1 cycle stalled 25 min on a Remotion `npm install` step that hadn't been run yet — preflight would have caught it.
- L23 thumbnail step required Figma MCP re-auth mid-cycle because the session had been idle 12+ hours.
- ElevenLabs quota hit near zero on L31 (~3K chars left at start of cycle). Preflight would have surfaced it; would have deferred to next billing.
