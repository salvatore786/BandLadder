import { useVideoConfig } from "remotion";

/**
 * The window of the audio file that actually contains speech.
 *
 * `speechStartSeconds` / `speechEndSeconds` come from WhisperX word alignment
 * (see transcribe.py). edge-tts routinely leaves a fraction of a second of
 * silence at the head and a longer tail at the end, so keying reveals off the
 * raw file duration made answers appear while the voice was still talking, or
 * long after it had stopped. When the props are absent — no transcription
 * backend installed — this falls back to the old behaviour exactly.
 */
export function useSpeechWindow(audioDurationSeconds: number): {
  speechStart: number;
  speechEnd: number;
  aligned: boolean;
} {
  const { props } = useVideoConfig();

  const rawStart = props.speechStartSeconds;
  const rawEnd = props.speechEndSeconds;

  const start = typeof rawStart === "number" && Number.isFinite(rawStart) ? rawStart : null;
  const end = typeof rawEnd === "number" && Number.isFinite(rawEnd) ? rawEnd : null;

  if (start === null || end === null || end <= start) {
    return { speechStart: 0, speechEnd: audioDurationSeconds, aligned: false };
  }

  return {
    speechStart: Math.max(0, start),
    speechEnd: Math.min(end, audioDurationSeconds),
    aligned: true,
  };
}

/**
 * Calculate sentence timeline for SentenceCompletion.
 *
 * durationSeconds  = total video length (audio + 4s buffer)
 * audioDurationSeconds = raw audio length
 *
 * Answers reveal 1 second AFTER the voice stops — never before.
 * Sentences appear spread across the spoken portion only.
 */
export function calculateSentenceTimeline(
  durationSeconds: number,
  audioDurationSeconds: number,
  fps: number,
  speech?: { speechStart: number; speechEnd: number; aligned: boolean }
) {
  const totalFrames = Math.ceil(durationSeconds * fps);

  const speechStart = speech?.aligned ? speech.speechStart : 0;
  const speechEnd = speech?.aligned ? speech.speechEnd : audioDurationSeconds;
  const speechLength = Math.max(speechEnd - speechStart, 0.1);

  // Sentences appear during the spoken portion (12% to 75% of the speech).
  const sentenceStartPct = 0.12;
  const interval = (speechLength * 0.63) / 5;

  const sentenceAppearFrames = Array.from({ length: 5 }, (_, i) => {
    const timeSec = speechStart + speechLength * sentenceStartPct + i * interval;
    return Math.floor(timeSec * fps);
  });

  // Answer reveal = 1 second AFTER the last spoken word.
  const answerRevealFrame = Math.ceil((speechEnd + 1) * fps);

  return { totalFrames, sentenceAppearFrames, answerRevealFrame };
}
