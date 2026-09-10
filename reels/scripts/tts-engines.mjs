/**
 * Swappable TTS engines. Each returns a mono WAV written to `outPath`.
 *
 *   kokoro      free, local, good prosody   (default)
 *   piper       free, local, noticeably flatter — the fallback
 *   elevenlabs  paid, best prosody          (needs an API key)
 *
 * Voice direction for all three: energetic, warm, encouraging teacher.
 * Brisk and upbeat, leaning in. Never flat, never a newsreader.
 *
 * No real IELTS exam audio is ever used — every line is synthesised from our
 * own scripts.
 */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile} from 'node:fs/promises';

const run = promisify(execFile);

let kokoroInstance = null;

const kokoro = async (text, outPath, cfg) => {
  const {KokoroTTS} = await import('kokoro-js');
  if (!kokoroInstance) {
    kokoroInstance = await KokoroTTS.from_pretrained(cfg.kokoro.model, {
      dtype: cfg.kokoro.dtype,
      device: cfg.kokoro.device,
    });
  }
  const audio = await kokoroInstance.generate(text, {
    voice: cfg.voice,
    speed: cfg.speed,
  });
  await audio.save(outPath);
};

const piper = async (text, outPath, cfg) => {
  // Flatter than Kokoro, but it needs no model download at run time.
  await run(cfg.piper.binary, ['--model', cfg.piper.model, '--output_file', outPath], {
    input: text,
  });
};

const elevenlabs = async (text, outPath, cfg) => {
  const key = process.env[cfg.elevenlabs.apiKeyEnv];
  if (!key) {
    throw new Error(
      `ElevenLabs selected but ${cfg.elevenlabs.apiKeyEnv} is not set in the environment.`
    );
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${cfg.elevenlabs.voiceId}?output_format=pcm_24000`,
    {
      method: 'POST',
      headers: {'xi-api-key': key, 'content-type': 'application/json'},
      body: JSON.stringify({
        text,
        model_id: cfg.elevenlabs.modelId,
        voice_settings: {
          stability: cfg.elevenlabs.stability,
          similarity_boost: cfg.elevenlabs.similarityBoost,
          style: cfg.elevenlabs.style,
          use_speaker_boost: true,
        },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs returned ${res.status}: ${await res.text()}`);
  }
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
};

const ENGINES = {kokoro, piper, elevenlabs};

export const synthesise = async (text, outPath, cfg) => {
  const engine = ENGINES[cfg.engine];
  if (!engine) {
    throw new Error(
      `Unknown TTS engine "${cfg.engine}". Choose one of: ${Object.keys(ENGINES).join(', ')}`
    );
  }
  await engine(text, outPath, cfg);
};
