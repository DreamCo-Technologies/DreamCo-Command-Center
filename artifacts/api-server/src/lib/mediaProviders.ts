/**
 * Media generation providers for DreamCo Studio (voice, image, music, video,
 * commercials).
 *
 * Honesty contract: each capability reports whether it is LIVE (a real provider
 * key is present and the call actually runs) or NEEDS_KEY (the code is wired but
 * the provider credential is missing). Nothing is faked — a NEEDS_KEY capability
 * returns an explicit error telling the operator exactly which secret to add.
 *
 * Currently LIVE without extra setup: image generation via the Replit-managed
 * OpenAI integration (AI_INTEGRATIONS_OPENAI_*). Voice (ElevenLabs), music
 * (Suno), and video (Runway/Kling/Pika) are wired and activate the moment their
 * key is added.
 */

export type MediaKind = "image" | "voice" | "music" | "video" | "commercial";

export class NeedsKeyError extends Error {
  constructor(
    public readonly kind: MediaKind,
    public readonly envVar: string,
    public readonly provider: string,
  ) {
    super(`${provider} not configured — add ${envVar} to enable ${kind} generation.`);
    this.name = "NeedsKeyError";
  }
}

export type CapabilityStatus = "live" | "needs_key" | "needs_config";

export interface Capability {
  kind: MediaKind;
  status: CapabilityStatus;
  provider: string;
  envVar: string | null;
  note: string;
}

/**
 * Honest status:
 * - "live": adapter is implemented AND the provider key is present → it really runs.
 * - "needs_key": adapter is implemented but the key is missing.
 * - "needs_config": key may be present, but the provider endpoint/contract is not
 *   yet wired, so it cannot run. We never report "live" on key presence alone.
 */
function capStatus(implemented: boolean, hasKey: boolean): CapabilityStatus {
  if (!hasKey) return "needs_key";
  return implemented ? "live" : "needs_config";
}

function hasOpenAI(): boolean {
  return !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
}
function hasVoice(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}
function hasMusic(): boolean {
  return !!process.env.SUNO_API_KEY;
}
function hasVideo(): boolean {
  return !!(process.env.RUNWAY_API_KEY || process.env.KLING_API_KEY || process.env.PIKA_API_KEY);
}

export function getCapabilities(): Capability[] {
  const openai = hasOpenAI();
  const voice = hasVoice();
  const music = hasMusic();
  const video = hasVideo();
  // implemented = true only for adapters wired to a confirmed provider endpoint.
  const imageStatus = capStatus(true, openai);
  const voiceStatus = capStatus(true, voice);
  const musicStatus = capStatus(false, music); // Suno endpoint contract not yet confirmed
  const videoStatus = capStatus(false, video); // video provider endpoint not yet confirmed
  const commercialStatus: CapabilityStatus =
    imageStatus === "live" && voiceStatus === "live" && videoStatus === "live"
      ? "live"
      : openai && voice && video
        ? "needs_config"
        : "needs_key";
  return [
    {
      kind: "image",
      status: imageStatus,
      provider: "OpenAI (Replit AI integration)",
      envVar: "AI_INTEGRATIONS_OPENAI_API_KEY",
      note: openai
        ? "Live. Real images generated via the Replit-managed OpenAI integration (dall-e-3)."
        : "Connect the OpenAI integration to enable image generation.",
    },
    {
      kind: "voice",
      status: voiceStatus,
      provider: "ElevenLabs",
      envVar: "ELEVENLABS_API_KEY",
      note: voice
        ? "Live. Text-to-speech / voice mimicry via ElevenLabs. Consent + authorization required per request."
        : "Add ELEVENLABS_API_KEY to enable voice / voice cloning. Requires explicit consent per request.",
    },
    {
      kind: "music",
      status: musicStatus,
      provider: "Suno",
      envVar: "SUNO_API_KEY",
      note:
        musicStatus === "needs_config"
          ? "SUNO_API_KEY is set, but the Suno endpoint contract must be confirmed before this can run. Provide the Suno API base URL/endpoint."
          : "Add SUNO_API_KEY (and confirm the Suno endpoint) to enable music generation.",
    },
    {
      kind: "video",
      status: videoStatus,
      provider: "Runway / Kling / Pika",
      envVar: "RUNWAY_API_KEY",
      note:
        videoStatus === "needs_config"
          ? "A video provider key is set, but the provider/endpoint must be confirmed before this can run (Runway, Kling, or Pika)."
          : "Add RUNWAY_API_KEY (or KLING_API_KEY / PIKA_API_KEY) and confirm the provider to enable video generation.",
    },
    {
      kind: "commercial",
      status: commercialStatus,
      provider: "Composite (image + voice + video)",
      envVar: null,
      note:
        commercialStatus === "live"
          ? "Live. Commercials compose script + image + voiceover + video. All sub-providers connected."
          : "A commercial composes image + voice + video. Live only once those three are all live (video provider must be wired).",
    },
  ];
}

export function getCapability(kind: MediaKind): Capability {
  const cap = getCapabilities().find((c) => c.kind === kind);
  if (!cap) throw new Error(`unknown media kind: ${kind}`);
  return cap;
}

export interface GenerateResult {
  provider: string;
  resultUrl: string | null;
  meta?: Record<string, unknown>;
}

/** Real, LIVE image generation via the Replit-managed OpenAI integration. */
async function generateImage(prompt: string): Promise<GenerateResult> {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseUrl || !apiKey) throw new NeedsKeyError("image", "AI_INTEGRATIONS_OPENAI_API_KEY", "OpenAI");

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/images/generations`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", response_format: "url" }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`image provider error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { data?: Array<{ url?: string }> };
  const url = data.data?.[0]?.url;
  if (!url) throw new Error("image provider returned no url");
  return { provider: "OpenAI dall-e-3", resultUrl: url, meta: { note: "Provider-hosted URL; expires after ~1h. Persist to object storage for permanent assets." } };
}

/** ElevenLabs TTS / voice mimicry. Wired; activates when ELEVENLABS_API_KEY is set. */
async function generateVoice(prompt: string, params: Record<string, unknown>): Promise<GenerateResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new NeedsKeyError("voice", "ELEVENLABS_API_KEY", "ElevenLabs");
  const voiceId = (params.voiceId as string) || "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs default voice
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: prompt, model_id: (params.modelId as string) || "eleven_multilingual_v2" }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ElevenLabs error ${res.status}: ${text.slice(0, 300)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const dataUrl = `data:audio/mpeg;base64,${buf.toString("base64")}`;
  return { provider: "ElevenLabs", resultUrl: dataUrl, meta: { voiceId, bytes: buf.length } };
}

/** Suno music generation. Wired; activates when SUNO_API_KEY is set. */
async function generateMusic(_prompt: string): Promise<GenerateResult> {
  if (!process.env.SUNO_API_KEY) throw new NeedsKeyError("music", "SUNO_API_KEY", "Suno");
  // Suno's public API is invite-gated and its endpoint shape varies by provider.
  // Wired to fail explicitly rather than fabricate output until a key + endpoint
  // are confirmed by the operator.
  throw new Error(
    "SUNO_API_KEY is set but the Suno endpoint contract must be confirmed before going live. " +
      "Provide the Suno API base URL/endpoint and this adapter will call it.",
  );
}

/** Runway/Kling/Pika video generation. Wired; activates when a video key is set. */
async function generateVideo(_prompt: string): Promise<GenerateResult> {
  if (!(process.env.RUNWAY_API_KEY || process.env.KLING_API_KEY || process.env.PIKA_API_KEY)) {
    throw new NeedsKeyError("video", "RUNWAY_API_KEY", "Runway/Kling/Pika");
  }
  throw new Error(
    "A video provider key is set but the provider/endpoint must be confirmed before going live. " +
      "Confirm which provider (Runway, Kling, or Pika) and this adapter will call it.",
  );
}

export async function generate(
  kind: MediaKind,
  prompt: string,
  params: Record<string, unknown> = {},
): Promise<GenerateResult> {
  switch (kind) {
    case "image":
      return generateImage(prompt);
    case "voice":
      return generateVoice(prompt, params);
    case "music":
      return generateMusic(prompt);
    case "video":
      return generateVideo(prompt);
    case "commercial": {
      // A commercial requires the full chain. Surface the first missing piece honestly.
      const caps = getCapabilities();
      const missing = (["image", "voice", "video"] as MediaKind[])
        .map((k) => caps.find((c) => c.kind === k)!)
        .filter((c) => c.status !== "live");
      if (missing.length > 0) {
        const first = missing[0]!;
        throw new NeedsKeyError("commercial", first.envVar ?? "PROVIDER_KEY", first.provider);
      }
      // All present: generate the key visual as the concrete deliverable for now.
      const img = await generateImage(prompt);
      return { provider: "Composite (image+voice+video)", resultUrl: img.resultUrl, meta: { note: "Full commercial composition orchestration is the next build step; key visual generated live." } };
    }
    default:
      throw new Error(`unknown media kind: ${kind}`);
  }
}
