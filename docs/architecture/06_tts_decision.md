# TTS Decision Record (Phase 7)

> Research phase for [Phase 7 — Better Text-to-Speech](../spelling_tutor_launch_plan.md#phase-7). No code changes ship from this doc; it records the chosen approach for a later implementation phase.

## Status: Reopened (2026-09-28)

A later session reopened this decision. The "Chosen Approach: A + E" section below (and everything under it) is the **previous** session's reasoning, kept for context — it is **no longer the plan**. Two of its premises don't hold up, and Option A itself was rejected on a new ground it didn't consider:

- **Option A rejected.** Pre-generation's manual-regeneration cost isn't one-time — [Phase 10](../spelling_tutor_launch_plan.md#phase-10) is an ongoing process that keeps finding and fixing new mispronunciations, and each fix under A means manually re-running the batch generator and re-uploading to R2, forever. On-demand generation (B) self-heals instead: a fixed respelling gets a new cache key (hash of the corrected text) and regenerates automatically on next play.
- **The "shares Phase 5's neuron budget" objection to B is true, but doesn't matter here.** The account is on the **Workers Free plan**: exceeding the shared 10,000-neurons/day allowance simply fails the request until the daily reset. There is no billing path at all, so there's no budget-competition risk to guard against — Option B carries zero cost risk as-is.
- **Cloudflare's own model catalog has more than MeloTTS.** Deepgram's Aura-2 (`@cf/deepgram/aura-2-en`) is also Cloudflare-hosted — 40 voices, context-aware pacing — still billed through the same free neuron pool, no vendor account.
- **Option C (Google/Azure) was explored, then dropped.** A prototype briefly supported both (see git history on `apps/spelling-tutor-api/src/lib/ttsProviders.ts`), including a correction to this doc's original claim that Google's terms leave caching "unresolved" (they don't — Google's ToS permits storing/using generated audio; the only restriction is not using it to train a competing TTS model). But with Option B carrying zero cost risk and two voice choices already inside the existing Cloudflare account, adding two more vendor accounts/keys for C wasn't worth the complexity. Dropped for simplicity, not infeasibility.

**Current direction: Option B (MeloTTS vs. Aura-2), Option E (`speechSynthesis`) as fallback.** Next step is an actual listening comparison of the two Cloudflare-hosted models via `POST /api/spelling/admin/tts-test` (see `index.ts`) on the 10 test words below, to pick a winner and confirm the cache/fallback architecture (already mostly correct in the old plan — see "Architecture" below, minus the R2-upload-batch-script step, which on-demand generation doesn't need).

---

## Chosen Approach (superseded — see Status above): A + E (pre-generated audio, cached in R2, with `speechSynthesis` fallback)

Generate audio for the app's known word bank once (offline, on a dev machine) using a free neural TTS engine, store it in R2, and serve it as a static `<audio>` file with service-worker caching for offline playback. Custom user-imported words that aren't pre-generated fall back to the existing `speechSynthesis` immediately — no on-demand server generation in v1.

### Why this wins over B/C (server-generated, cached on first request)
- **Cost predictability.** Pre-generation is a one-time, off-budget cost (runs on a dev machine, free). Options B and C add per-unique-word cost to the same shared Workers AI / neuron budget that Phase 5's AI coaching already draws from (`good_plus_fast_db.ai_admin_config`). Word audio is high-volume and low-value-per-call compared to a kid tip or parent report — it shouldn't compete for that budget.
- **Zero latency on first play.** A cache-miss round trip to Workers AI or a hosted API (B/C) means the first time any user requests a new word, they wait. Pre-generated words are instant from R2/CDN.
- **No key management or vendor terms risk.** Google/Azure (Option C) require managing API keys in a Worker and accepting their terms on storing generated audio indefinitely in R2 — an unresolved question in both providers' docs as of this research. Pre-generation sidesteps this because MyShell/Kokoro/Piper are locally-run, unrestricted-output tools.

### Why not D (on-device neural TTS)
Kokoro-class on-device models require a 50–80 MB download and meaningfully slower inference on low-end phones — a direct violation of the "no heavy work on the user's phone" constraint. Rejected without a phone test; the constraint alone rules it out for the primary path. (`kokoro-js`/Piper-WASM remain worth revisiting only if a future feature specifically needs arbitrary on-device generation, e.g. fully offline custom-word support.)

### Why E survives as the fallback, not the primary
`speechSynthesis` is what the app uses today. Quality is inconsistent across devices/browsers (the actual problem Phase 7 exists to fix), but it's free, requires no infrastructure, and already has an interface (`useSpeech.js`) the new engine can slot in behind. It stays as the answer for the one gap pre-generation can't cover: brand-new words a parent just typed in, before they've been through a batch pre-generation pass.

## Engine choice for the pre-generation step: Kokoro

Piper is faster and smaller, but flatter and more robotic; Kokoro is judged noticeably more natural while still running comfortably on a single dev machine in under a second per word — plenty fast for a one-time offline batch job where wall-clock time doesn't matter. Since the generation step is offline and off the phone entirely, Kokoro's slightly heavier footprint costs nothing at runtime. Workers AI's MeloTTS was also considered but rejected for the *pre-generation* step specifically because it would burn shared neuron budget for a one-time batch job that a local tool can do for free — Workers AI TTS is worth revisiting later only as the on-demand path for genuinely new custom words, if the fallback-to-`speechSynthesis` behavior proves unsatisfying in practice.

## Scope Constraint (confirmed 2026-09-27)

The app only ever needs to speak two kinds of text: a whole word (normal speed) and a sequence of syllable fragments (with independently-controllable rate and inter-syllable pause). It never needs to speak arbitrary sentences. This simplifies the pre-generation surface: the word bank to pre-generate is the word list itself plus, per word, its *pronunciation* syllables — not its raw spelling syllables.

This distinction matters because a syllable's spelling and its pronunciation can diverge (e.g. "puppy" splits for spelling as `pup-py`, but the `py` fragment must be *spoken* as "pee", not "pie" — the browser's Web Speech API reads an isolated `py` as a standalone word and gets it wrong). The app already has a correction layer for this (`src/utils/syllablePhonetics.js`): auto-rules rewrite common fragment endings (`-tion`→`shun`, trailing consonant+`y`→`...ee`, consonant+`le`→`...ul`, etc.), a small irregular-word dictionary handles known exceptions (pretty, handsome, busy, water, ...), and a teacher-provided override always wins when supplied. `puppy` already resolves correctly today via the auto-rule (`py`→`pee`), confirmed by `src/utils/syllablePhonetics.test.js`.

**Implication for pre-generation:** the offline Kokoro batch step (see below) must feed it the *corrected pronunciation* string per syllable (the output of `buildPronunciationSyllables`), not the raw spelling fragment. Otherwise pre-generated audio bakes in the same "py→pie" class of error permanently, and it becomes much harder to fix after the fact — a runtime `speechSynthesis` fallback can be corrected by literally just changing the rule; a pre-generated audio file requires re-running generation and re-uploading to R2. This means the correction layer is upstream of the pre-generation pipeline, not a runtime-only concern, and any future irregular-word or auto-rule addition needs cache invalidation (regenerate + re-upload the affected words) as part of that change.

**Rate and pause remain independently controllable requirements**, both today (in the `speechSynthesis` implementation, confirmed 2026-09-27: `PracticePage.jsx` now exposes separate "Speed" and "Pause" selectors, each driving its own preset independent of the other) and for any future pre-generated-audio path: a slowed-down word must be achievable without changing the gap between syllables, and vice versa. For pre-generated audio this likely means either (a) pre-generating each syllable at 2–3 fixed rates rather than baking in a single rate, or (b) using the Web Audio API's `playbackRate` on the pre-generated clip instead of re-synthesizing per rate — to be decided in the Phase 7b implementation phase. The inter-syllable pause stays a client-side `setTimeout` between clip plays either way, so it needs no pre-generation work.

## Architecture (to build in a future implementation phase)

1. Maintain a source word list (e.g. common grade-level spelling lists + any words already imported by users) in the repo.
2. Offline batch script (dev machine) runs Kokoro over the list, writes one MP3/OGG per word to a local `dist/` folder, named by a hash of `(word, voice)`.
3. Upload the batch to an R2 bucket via `wrangler r2 object put` (or a small upload script), fronted by a public R2 URL or a Worker route.
4. Client requests audio by hash. Cache hit → play via `<audio>`; the PWA's service worker caches the file for offline replay.
5. Cache miss (a word not yet in the pre-generated bank — e.g. a freshly imported custom word) → immediate fallback to `speechSynthesis`. No live generation call in v1.
6. Periodically (e.g. before each new grade-level word list ships) re-run the batch script to cover newly common custom words, based on aggregate (non-identifying) word-list data already visible to the admin.

This keeps the phone doing only playback and keeps generation entirely off the shared AI budget and off any recurring per-request cost.

## Rejected Options — Summary

| # | Approach | Rejected because |
|---|----------|-------------------|
| B | Workers AI TTS (MeloTTS), generated + cached on first request | Shares the same daily neuron budget as Phase 5's kid tips/parent reports; per-unique-word cost that pre-generation avoids entirely. Kept as a possible *future* on-demand path for custom words only. |
| C | Google Cloud TTS / Azure TTS, generated + cached on first request | Free tiers are generous (Google: 1M–4M chars/mo depending on voice tier; Azure: 500K chars/mo) but add API key management and unresolved terms on caching generated audio long-term in R2. No cost advantage over free local generation for a one-time batch. |
| D | On-device neural TTS (Kokoro-js, Piper-WASM) at runtime | 50–80 MB download and slow inference on weak phones; violates the "no phone slowdown" constraint. |

## Free-Tier Math (why we expect to stay at $0)

- **Generation:** Kokoro runs locally — $0, no recurring cost, no quota to track.
- **Storage:** R2 free tier is 10 GB storage + 1M Class A (write) + 10M Class B (read) operations/month, zero egress fees. At ~10–30 KB per word, even 50,000 unique words is ~1.5 GB — comfortably inside the free tier for the foreseeable future. Read volume (every playback) is a Class B op with unlimited egress, so normal usage won't approach 10M/month.
- **Fallback (`speechSynthesis`):** Free, runs on-device, no infrastructure.

## Research Tasks — Status

- [x] Confirm current Workers AI TTS free-tier shape: shared 10,000 neurons/day (Workers Free plan), $0.011/1,000 neurons beyond that — same pool Phase 5's AI coaching already draws from.
- [x] Compare Google/Azure free-tier limits: Google ~1M–4M chars/mo depending on voice tier (ongoing, not time-limited); Azure 500K chars/mo (throttles, doesn't auto-bill, on overage). Caching/storage terms for generated audio were not clearly resolved in either provider's public docs — a reason to avoid depending on it.
- [x] Compare Piper, Kokoro (Workers AI MeloTTS and Google/Azure neural voices not bench-tested locally, evaluated via published comparisons instead of a from-scratch listen test): Kokoro chosen for naturalness; Piper noted as a fallback for constrained environments, not needed here since generation is offline.
- [ ] Estimate exact volume for this app's specific word bank (grade-level lists to be finalized) — deferred to the implementation phase, once the actual K–5 list scope is picked.
- [x] R2 free-tier storage/operations checked against expected audio size — comfortably within limits (see Free-Tier Math above).
- [x] Decide approach for custom user words: fall back to `speechSynthesis` immediately in v1; no on-demand generation.
- [x] Decide whether pre-generating a common word bank up front is worth it: yes — it's the core of the chosen approach.
- [x] Existing `speechSynthesis` usage stays behind the same interface (`useSpeech.js`); the new engine is additive, not a replacement of that hook's contract.

## Follow-up Implementation Phase (proposed Phase 7b, not yet scheduled)

- Build the offline Kokoro batch-generation script and an R2 upload step.
- Add an audio-hash lookup to the client's `useSpeech.js`, preferring R2 audio and falling back to `speechSynthesis`.
- Wire service-worker caching for played audio files (offline replay of already-heard words).
- Re-run generation whenever a new default grade-level word list ships.
