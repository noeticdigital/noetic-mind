> **SUPERSEDED (August 2026).** This spec did its job: the app is built and has moved beyond it.
> The implementation at `~/Downloads/Noetic/NoeticCopilot` and its build chat ("Noetic JTBD Interview
> Copilot macOS app") are canonical. Since this document was written the app gained autosave-per-turn,
> a Recordings browser, auto-debrief on End (with an anchored-evidence count), consent-sheet context
> inputs (screener background + transcriber vocabulary), Ed25519 device licensing, and a designed
> backend ("Sign in with Noetic", Lambda: probe / analyze / interviews). Read this file as history only.

# Noetic JTBD Interview Copilot — Build Spec (for Claude Code)

> Paste this whole document into a fresh Claude Code session as the kickoff brief.
> It is the authoritative spec for building the **real** native macOS app. A working
> visual/behaviour reference already exists as a single-file HTML mock: `copilot.html`
> in the `noeticdigital/noetic-mind` repo — open it and treat it as the UI source of truth.

---

## 0. Kickoff prompt (read first)

You are building **Noetic Copilot**, a lightweight, on-device **native macOS app** that sits
beside a video call and turns a live **Jobs-to-be-Done (JTBD) interview** into structured
discovery in real time. It is the "live face" of the Noetic Mind Continuous Discovery system.

**Hard constraints / north stars**
- **Native macOS**, Swift + SwiftUI. Not Electron, not a Chrome extension. (Rationale below — do not relitigate.)
- **Local capture, no bot.** Nothing joins the call. We capture system audio + mic on-device.
- **On-device speech-to-text** by default. Audio never leaves the machine. Only transcript *text* is sent to the LLM, and only with explicit consent.
- **Two surfaces in one window**: a **Full** working view and a **Focus** glanceable HUD. Build both.
- **Trust first.** A JTBD interview needs the participant relaxed. Visible consent, no security flags, no bot in the call.
- **Ship a notarized DMG** (direct distribution), not Mac App Store (sandbox fights audio capture).

**How to work**
- Start by reading `copilot.html` (the HTML mock) end to end. It defines the layout, the panels, the Full/Focus modes, the design tokens, the colours, the copy tone, and the exact interaction model. Match it.
- Build in the phases in §13. Get the capture→transcribe→display pipeline working before the LLM brain.
- Verify each phase on a real call (you, video off, talking to a second device) before moving on.
- Confirm every macOS API against the **current SDK for the target OS** before relying on it — the audio/STT APIs below moved fast across macOS 13→15. If an API isn't available, fall back per §5/§6.

---

## 1. Why this architecture (decided — context, not up for debate)

- **Bot-in-the-call is dead for JTBD.** Since March 2026, Google Meet flags third-party notetaker bots as "potential risk" and defaults to deny. A security warning at minute zero poisons the trust a JTBD interview needs.
- **A Chrome extension can't do it on macOS.** `getDisplayMedia({audio:true})` on macOS only exposes *tab* audio, not full system audio. So an extension only works if the call runs in a Chrome tab — which re-couples us to the exact platform risk we're escaping, and dies the moment the interviewer uses native Zoom/Teams.
- **Native is the only surface that captures system audio from any call app** (ScreenCaptureKit / Core Audio process taps). This is the Granola model. Platform-agnostic local capture is *only* achievable native on Mac.
- **Tiering:** native live copilot now → post-call synthesis as the non-Mac fallback (pull a Meet/Gemini transcript or an uploaded recording) → Meet Media API later as an enterprise checkbox. The Media API is never the foundation.

---

## 2. What it does (product loop)

1. Interviewer starts a call (Google Meet / Zoom / Teams), **video off** (JTBD norm), launches Noetic Copilot.
2. App confirms consent, starts **on-device capture** of mic (interviewer) + system audio (participant) — no bot joins.
3. Live **transcript** streams, speaker-attributed (mic = "You", system = participant).
4. The **copilot brain** (LLM) reads the rolling transcript and continuously updates:
   - **Ask this next** — a short reason + the *verbatim next question* to read aloud.
   - **JTBD timeline** — detects which of 5 stages the story has reached and pins the supporting quote.
   - **Four forces** — classifies push / pull / anxiety / habit as they surface, with snippets.
   - **The Job** — synthesises the Job-to-be-Done statement and advances its **evidence state**.
5. Interviewer can flip to **Focus** mode: a calm HUD with just the next question (minimal cognitive load while talking).
6. On **End**, the app produces a **synthesis** (interview snapshot) and posts it to Noetic Mind's Progress loop.

---

## 3. The JTBD methodology it encodes (v4 — aligned to the jobstobedone.org field guide)

> **Superseded in place (2026-07):** this section was rewritten to v4 after transcribing the
> primary source — the printed #JTBD interview guide booklet (jobstobedone.org / Rewired).
> The canonical machine-readable version lives in `server/copilot-api.ts` (METHODOLOGY) with
> a dev copy in `NoeticCopilot/Brain/DirectBrain.swift`.

This is not a generic notetaker. It encodes the switch-interview method: reconstruct one
real, recent purchase as a story, **hunting the energy** — the why behind the switch. The
energy lives in the *situation*, never the product. An anchor is a specific scene (what
they were doing, where, who was there — get the characters' names) plus a verbatim
participant quote; story-time ("two years ago", "about two weeks") is captured per point
because the timeline's shape is diagnostic.

**The Timeline — 8 ordered points:**
1. `firstThought` — the idea planted ("I might need to make progress"). Tentative,
   low-energy, **provisional** — the first thought offered usually isn't the real one;
   probe backwards and forwards, listen for the late unlock.
2. `passiveLooking` — noticing options with **zero energy invested** (the passive/active
   discriminator), and why they didn't act yet.
3. `event1` — **"I've had enough."** The boil-over that flips them into active looking —
   *this is the struggling moment*. Anchor onset (sudden vs gradual), frequency, intensity.
4. `activeLooking` — investing real energy/time; what they compared, how long.
5. `event2` — **"The clock is ticking."** The deadline that forces the decision.
6. `deciding` — narrowed to 2–3 with criteria understood; anchored requires the
   **consideration set** (name the finalists) + what mattered most + what they gave up.
7. `buying` — committed, paid, no going back: what exactly (brand/model), where/when,
   what nearly stopped them, what it felt like.
8. `firstUse` — consuming: expectations beforehand, the purchase→use gap, how they decided
   when/how to use it, whether the behaviour held.

**Story events** (no fixed position): `firing` — *everything* the hire replaced, full vs
**partial** ("fired in every situation, or just some?"); `resolution` — satisfaction: did
it help them make progress or not (a switch that failed to do the job is a finding).

**The Four Forces** (booklet definitions): `push` — energy of the current situation;
`pull` — energy of a *possible solution* ("can this help me make progress?"); `anxiety` —
of the new: "will it work?" + "can I figure it out?"; `habit` — of the present.

**The Job — 3 dimensions**, in their words: `functional` (task/progress), `emotional`
(the feeling hired for), `social` (who they want to be). The Job must trace back to the
struggling moment (`event1`).

**The arc — bracket the story:** open at the **buy** (right bracket — concrete, easy,
licenses the detail torrent), then hunt the **first thought** (left bracket, trickier),
then fill the energy between the brackets; land job dimensions + resolution last.
Exceptions that beat phase order: an energy marker surfacing (pull the thread now) and
participant fatigue (jump topics before "I really just can't remember").

**Technique toolkit** (encoded as nudge tactics + evidence flags): documentary-metaphor
detail probes; probe-around-the-memory; calendar anchors; wrong-dots recap (with the
carve-out: corrections are strong evidence, only agreement contaminates); dummy up (never
connect dots you can ask about — for interviewer *and* model); stay-in-the-moment; flags
for leading/hypothetical/stacked/contradiction plus `noStory` (bad-recruit symptom:
timeline won't anchor, no forces — gift / non-decision-maker / too long ago),
`criteriaInjection`, and the `productOpinion` wormhole; never correct their language
(it's marketing gold); no psychological evaluation beyond this purchase.

**Evidence ladder** (the spine of the whole Noetic system):
`assumption → emerging → validated → disproven`.
Discipline: **one interview can only reach `emerging`.** The validated Job is synthesised
across a **round of 12**, clustered by candidate job first (≥8 consistent interviews per
cluster), with energy-profile segmentation (onset/intensity ↔ speed-to-buy and price
sensitivity), cross-interview "necessary details" (channel / price paid / referral), and
next-round recruiting recommendations (canon screener bar; Groups A/B/C — buyers, leavers,
competitor buyers; B2B landscape mapping in the first ~10).

---
## 4. System architecture

```
┌──────────────────────────── Noetic Copilot (macOS app) ────────────────────────────┐
│                                                                                     │
│  Capture            Transcription          Copilot Brain            UI (SwiftUI)    │
│  ┌─────────┐        ┌────────────┐         ┌──────────────┐         ┌────────────┐  │
│  │ Mic     │──pcm──▶│            │         │  Analyzer     │        │  Full view  │  │
│  │ (You)   │        │  STT       │──utter─▶│  (LLM, async, │──state▶│  Focus HUD  │  │
│  │ System  │──pcm──▶│ on-device  │         │  debounced)   │        │  Consent    │  │
│  │ (Them)  │        │            │         │  + final      │        │  Controls   │  │
│  └─────────┘        └────────────┘         │  synthesis    │        └────────────┘  │
│       ▲                                    └──────┬───────┘                ▲        │
│   TCC: mic +                                      │                        │        │
│   audio tap                              Anthropic API (text only)   InterviewSession│
│                                                                       (@Observable)  │
└──────────────────────────────────────────────────┼─────────────────────────────────┘
                                                    │ on End: POST synthesis
                                                    ▼
                                        Noetic Mind / noeticapp (Progress loop)
```

**Modules**
- `AudioCapture` — two PCM streams (mic + system), 16 kHz mono, ring-buffered.
- `Transcriber` (protocol) — concrete impls: `SpeechAnalyzerTranscriber` (macOS 15+), `WhisperTranscriber` (whisper.cpp, fallback/cross-version). Emits `Utterance` with speaker + isFinal.
- `CopilotBrain` — debounced async analysis calling Anthropic with structured output; plus a `synthesize()` at end.
- `InterviewSession` — `@Observable` state object (single source of truth for the UI).
- `Persistence` — local store of the interview record (SQLite via GRDB, or Core Data).
- `NoeticClient` — posts the final synthesis to the backend.
- UI layer — `FullView`, `FocusView`, `ConsentBar`, `Controls`, windowing.

---

## 5. Audio capture (the hard part — be precise)

Capture **two separate streams** so speaker attribution is free (no diarization needed):
- **Mic** = the interviewer ("You").
- **System output** = the participant (and anything else the Mac plays).

**System audio options (pick by target OS; prefer the first that's available):**
1. **Core Audio process taps** (`CATapDescription` + `AudioHardwareCreateProcessTap` + aggregate device), macOS **14.4+**. Audio-only, lighter, **does not require Screen Recording permission**. Preferred.
2. **ScreenCaptureKit** `SCStream` with `SCStreamConfiguration.capturesAudio = true` (filter to audio), macOS **13+**. Requires the **Screen Recording** TCC permission (heavier UX). Fallback for < 14.4.
3. **Virtual audio device** (e.g., bundle/install a loopback) — avoid; adds install friction.

**Mic:** `AVAudioEngine` input node, or `AVCaptureSession` with audio. Tap the input, convert to 16 kHz mono Float32/Int16.

**Pipeline:** each stream → format-convert (`AVAudioConverter`) → 16 kHz mono → ring buffer → feed both the transcriber and (optionally) a local recording file (`.caf`/`.wav`) for the record.

**Permissions / entitlements:**
- `NSMicrophoneUsageDescription` (Info.plist).
- Microphone TCC prompt on first capture.
- If using ScreenCaptureKit: Screen Recording TCC (System Settings → Privacy).
- App entitlements: `com.apple.security.device.audio-input`. Hardened Runtime on (required for notarization). If sandboxed, audio capture is constrained — **plan for non-sandboxed, notarized direct distribution**.

**Acceptance:** with a real Google Meet call (video off) running in the **native** Meet/Zoom/Teams app, the app captures *both* the interviewer mic and the far-end participant audio, attributed correctly, with < ~300 ms added latency.

---

## 6. Transcription (on-device, real-time)

- **Default:** Apple **SpeechAnalyzer / SpeechTranscriber** (macOS 15+/"26"): on-device, streaming, fast, good for long-form. Use volatile (partial) + finalized results.
- **Fallback / cross-version:** **whisper.cpp** (Metal), `base.en`/`small.en` for latency, streaming with a sliding window. Bundle the model or download on first run.
- Wrap both behind a `Transcriber` protocol:

```swift
protocol Transcriber {
    /// Streams partial + final utterances for one audio source.
    func start(source: Speaker, audio: AsyncStream<AudioBuffer>) -> AsyncStream<Utterance>
    func stop()
}
enum Speaker { case interviewer, participant }
struct Utterance { let speaker: Speaker; let text: String; let isFinal: Bool; let t: TimeInterval }
```

- **Speaker attribution = capture source** (mic → interviewer, system → participant). Don't attempt acoustic diarization.
- Emit **partials** for the live "…typing" feel; commit **finals** to the transcript and to the brain.
- Handle overlapping speech by keeping the two source streams independent.

**Acceptance:** transcript appears within ~1–2 s of speech, partials update live, finals are stable, speaker labels correct.

---

## 7. The Copilot Brain (LLM analysis)

The brain turns the rolling transcript + current state into the four live outputs. Use **Anthropic Claude** (default `claude-sonnet` for cadence; `claude-opus` for the final synthesis). **Privacy: only transcript text is sent, never audio, and only after consent.**

**Cadence**
- Run an analysis pass **debounced**: trigger on participant turn-end (a final utterance from the participant followed by ~1.2 s silence) OR every N seconds, whichever first. Coalesce; never run two passes concurrently — cancel the in-flight one if new finals arrive.
- Keep a rolling window of the transcript (full transcript is fine for a 30–60 min interview; summarise older turns if the context gets large).

**Structured output** (force a tool/JSON schema; validate; retry on mismatch):

```jsonc
{
  "askNext":   { "reason": "string (≤6 words, why)", "question": "string (verbatim, read-aloud)" },
  "timeline":  { "stage": "firstThought|passiveLooking|activeLooking|deciding|firstUse|null",
                 "quote": "string (participant's words) | null" },
  "forces":    [ { "force": "push|pull|anxiety|habit", "snippet": "string" } ],
  "job":       { "statement": "string (in their words) | null",
                 "evidence": "assumption|emerging" },   // never 'validated' from one interview
  "notes":     "string (optional coaching, not shown big)"
}
```

**Prompt design (system prompt for the brain)** — encode the methodology:
- Role: an expert JTBD interviewer's copilot. You see a live transcript; you do NOT talk to the participant.
- Teach it the Timeline (5 stages), the Four Forces, the Job format, and the evidence rule (max `emerging` per interview).
- Rules: prefer a **verbatim next question** the interviewer can read aloud; keep `reason` to a few words; reconstruct a **real past switch** (push toward specifics/moments, away from hypotheticals); extract quotes in the **participant's words**; land the Job in their language, then suggest closing.
- Determinism: low temperature; the question should advance the timeline to the next un-covered stage when appropriate.

**Final synthesis** (`synthesize()` on End): one richer Opus call → the interview snapshot (see §8/§11): Job statement + evidence (`emerging`), the completed timeline with quotes, the forces with evidence, key verbatim quotes, and a 2–3 sentence summary.

**Streaming:** stream the model output so the "Ask this next" updates feel live; apply partial updates to the UI as fields complete.

**Offline / no-key:** if no API key or offline, degrade gracefully — keep transcribing and recording; show "copilot paused (no connection)"; still allow a post-call synthesis when back online.

---

## 8. Data model (Swift)

```swift
@Observable final class InterviewSession {
    var id = UUID()
    var project: ProjectRef            // which Noetic project this interview belongs to
    var participant: Participant       // name, role (e.g. "Ian Turvue · Operations manager")
    var startedAt: Date
    var consent: ConsentState          // .confirmed(at:), method (in-script)
    var utterances: [Utterance] = []   // the transcript
    var timeline: [Stage: StageHit] = [:]   // stage → captured quote
    var forces: [Force: ForceHit] = [:]
    var job: JobStatement              // text + EvidenceState
    var nextPrompt: Prompt             // reason + question
    var mode: CopilotMode              // .full / .focus
    var sound: Bool                    // (in the app: live; the mock plays clips)
    var recordingURL: URL?             // local audio record
}

enum Stage: String, CaseIterable { case firstThought, passiveLooking, activeLooking, deciding, firstUse }
enum Force: String, CaseIterable { case push, pull, anxiety, habit }
enum EvidenceState: String { case assumption, emerging, validated, disproven }   // app caps at emerging
struct StageHit { let quote: String; let at: TimeInterval }
struct ForceHit { let snippet: String }
struct JobStatement { var text: String; var evidence: EvidenceState }
struct Prompt { var reason: String; var question: String }
enum CopilotMode { case full, focus }
```

Persist the session locally (GRDB/SQLite or Core Data). One interview = one record + optional audio file + the synthesis JSON.

---

## 9. UI spec (match the HTML mock exactly)

**Source of truth: `copilot.html`.** Re-create its layout natively. Specifics:

**Window / shell**
- A macOS window that tiles **side-by-side** with the call (macOS **Split View** feel) OR a draggable floating window — support both; default to a tall right/left pane. The mock shows a 40% copilot / 60% call split with the copilot on the **left**.
- The mock fakes the call (Google Meet, video off) on the other side; in the real app the *actual* call app is the other half — so the app just needs to be a well-behaved tile/floating window. Don't render a fake Meet.
- Faux macOS chrome in the mock (menu bar, traffic lights) is just the mock's framing; the real app is a real window.

**Full view (the working dashboard)** — two columns:
- **Left:** live transcript. Speaker-labelled ("Interviewer" in accent, participant in serif). Streaming with a typing indicator. Auto-scroll.
- **Right (the scaffold):**
  1. **Ask this next** card — small amber **reason** line on top, then the **big serif verbatim question** beneath (the thing you read aloud). This ordering matters; it minimises reading load.
  2. **Job to be done** card — the serif Job statement + the **certainty meter** (4-segment) + state label ("assumption" / "emerging").
  3. **Timeline** — 5 vertical steps; each lights up when reached and shows the captured quote.
  4. **Forces** — push / pull / anxiety / habit, each filling with a snippet; colour-coded (push=red, pull=green, anxiety=amber, habit=blue).
- **Footer:** participant (avatar + name + "interview N"), question count, **Full / Focus** segmented toggle, Pause/Replay (in the app: Pause/Resume capture), **End → synthesize**.

**Focus view (glanceable HUD)** — collapses to: the "ASK THIS NEXT" kicker + timeline progress dots, the small **reason**, the **big verbatim question**, and a subtle "Job so far · [meter] · emerging" footer. Nothing else. This is what you watch while talking.

**Consent bar** (top): "Recording on-device · consent confirmed · no bot joined the call" with a lock. Must be visible whenever capturing.

**Voice:** the mock has a "Play with sound" toggle because it's a scripted playback (ElevenLabs clips / Web Speech). The **real app has no TTS** — the audio is the real call. Drop the sound toggle; keep everything else.

**Design tokens (from the mock / Noetic system):**
- Type: **Fraunces** (serif — Job, questions, headlines), **Inter** (UI/labels/body), **JetBrains Mono** (numbers, timers, meta). On macOS, bundle these or use SF Pro + New York as close substitutes; prefer bundling Fraunces/Inter for brand fidelity.
- Default **dark**. Tokens (dark): bg `#10141b`, surface `#171c25`, ink `#e7eaf0`, accent `#5e95d8`, line `#262d39`.
- Evidence colours: assumption slate `#8d8779`, emerging amber `#cf9c44`, validated green `#62a87d`, disproven grey.
- The **certainty meter**: 4 segments; `assumption` = 1 dashed seg, `emerging` = 2 amber segs, `validated` = all green (not reachable in-app), `disproven` = struck-through.
- Logo/favicon: `noetic-logo.svg` (square navy bar mark) — bundle it; use as app icon base.
- Motion: slow, deliberate (150–250 ms), respect Reduce Motion.

**Acceptance:** a screenshot of the running app's Full and Focus views is visually indistinguishable in layout/branding from `copilot.html`.

---

## 10. Consent & privacy (must-have, esp. Japan)

- **In-script consent**: the interviewer asks for recording consent verbally; the app requires the interviewer to tick "consent confirmed" before capture starts. Record consent state + timestamp on the session.
- **On-device by default**: audio is transcribed locally; **audio never leaves the Mac**. The consent copy must say so.
- **LLM disclosure**: transcript *text* is sent to the LLM (Anthropic) to power the copilot. Disclose this; allow the user to **disable the brain** (transcribe + record only) if the participant prefers no third-party processing. Offer a "local-only" mode roadmap (local LLM) for sensitive segments.
- **Data retention**: interviews stored locally; user controls upload/delete. No telemetry on transcript content.
- **Japan norm**: explicit recording consent in the interview script regardless of architecture; surface it prominently.

---

## 11. Noetic Mind integration

On **End → synthesize**, POST the snapshot to the backend (`noeticapp`) so it lands in the **Progress loop** as an interview snapshot and feeds the Job's evidence (across many interviews → validation).

**Contract (proposed; confirm with backend):**
```
POST /api/interviews
Authorization: Bearer <token>
{
  "projectId": "string",
  "participant": { "name": "string", "role": "string" },
  "startedAt": "iso8601", "endedAt": "iso8601",
  "consent": { "confirmed": true, "at": "iso8601", "method": "in-script" },
  "job": { "statement": "string", "evidence": "emerging" },
  "timeline": [ { "stage": "firstThought", "quote": "string", "at": 12.3 }, ... ],
  "forces": [ { "force": "push", "snippet": "string" }, ... ],
  "quotes": [ "string", ... ],
  "summary": "string",
  "transcriptRef": "local://… | uploadId | null"   // transcript stays local unless user opts to upload
}
```
The backend appends to the project's interview set; the demo's "Interview snapshots" + the certainty meter reflect the new evidence. Auth via the existing next-auth session/token.

---

## 12. Distribution

- **Direct download, notarized DMG.** Hardened Runtime on; codesign + `notarytool`; staple.
- **Not Mac App Store** (sandbox restricts the audio capture we need).
- Auto-update later (Sparkle).
- App icon from `noetic-logo.svg`.

---

## 13. Build phases (do them in order; verify each on a real call)

- **Phase 0 — Skeleton.** SwiftUI app, window, `InterviewSession`, the Full/Focus layout shells with mock data wired to the model. Match the mock visually.
- **Phase 1 — Capture.** Mic + system audio (Core Audio taps; ScreenCaptureKit fallback), TCC prompts, ring buffers, optional local recording. Prove dual-source capture on a native call.
- **Phase 2 — Transcription.** `Transcriber` protocol + SpeechAnalyzer impl (+ whisper.cpp fallback). Live transcript with partials/finals, correct speaker labels.
- **Phase 3 — Copilot brain.** Anthropic structured-output analysis on a debounced cadence; wire `askNext` / `timeline` / `forces` / `job` into the model → UI updates live. Enforce the evidence cap.
- **Phase 4 — Focus mode + consent + controls.** Full/Focus toggle, consent gating, Pause/Resume, End.
- **Phase 5 — Synthesis + integration.** Final Opus synthesis; POST to Noetic Mind; local persistence of the record.
- **Phase 6 — Polish + distribution.** Branding/tokens parity with the mock, Reduce-Motion, error/offline states, notarized DMG.

MVP = Phases 0–4 working on a real Google Meet call. Phases 5–6 make it shippable.

---

## 14. Acceptance criteria (definition of done for MVP)

1. On a real native Google Meet call (video off), the app captures both sides, attributed correctly, no bot joins.
2. Live transcript appears within ~1–2 s, speaker-labelled, stable finals.
3. The "Ask this next" card shows a small reason + a big verbatim question that meaningfully advances the JTBD timeline; updates within a few seconds of the participant finishing a thought.
4. Timeline stages light up with captured quotes; forces populate; the Job synthesises and rises `assumption → emerging` (never beyond).
5. Focus mode shows only the reason + big question + progress; calm enough to use while talking.
6. Consent must be confirmed before capture; consent copy states audio stays on-device.
7. End produces a synthesis and (Phase 5) posts it to Noetic Mind.
8. Full and Focus views match `copilot.html` in layout and branding.

---

## 15. Risks & open decisions (flag, don't silently choose)

- **macOS audio API availability** across target versions — confirm Core Audio taps (14.4+) vs ScreenCaptureKit (13+) per the minimum OS you set. Recommend min target **macOS 14.4**, ideal **15** (for SpeechAnalyzer).
- **STT accuracy vs latency** — SpeechAnalyzer (newer, fast) vs whisper.cpp (accurate, heavier). Pick per OS; keep the protocol.
- **Brain latency/cost** — sonnet for live cadence; debounce hard; cancel in-flight passes.
- **LLM privacy** — transcript text to Anthropic; disclose; offer brain-off mode; roadmap a local model.
- **Window management** — true macOS Split View tiling vs a floating always-on-top panel. Start with a floating resizable panel; add tiling if needed.
- **Backend contract** — confirm `/api/interviews` shape with the `noeticapp` team before Phase 5.

---

## 16. References

- **`copilot.html`** (noetic-mind repo) — the canonical UI/behaviour/branding mock. Open it first.
- **`v3.html`** (same repo) — the Continuous Discovery system this plugs into (the Progress loop, evidence ladder, certainty meter). The copilot's synthesis feeds it.
- Architecture rationale: §1 (local capture / Granola model; bot-in-call dead; extension can't do macOS system audio).
- Methodology: JTBD "Forces of Progress" / the switch timeline; the four forces; evidence ladder `assumption → emerging → validated → disproven`.

---

### One-line summary to open the other chat with
"Build **Noetic Copilot**, a native macOS (SwiftUI) on-device JTBD-interview copilot that captures mic + system audio with no bot, transcribes locally, and uses Claude to surface the next verbatim question, the JTBD timeline, the four forces, and the Job (capped at `emerging`) — in a Full dashboard + Focus HUD that matches `copilot.html`. Follow the attached spec, build in phases, verify on a real Google Meet call."
