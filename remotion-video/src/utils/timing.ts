/**
 * Calculate sentence timeline for SentenceCompletion.
 *
 * durationSeconds  = total video length (audio + 4s buffer)
 * audioDurationSeconds = raw audio length
 *
 * Answers reveal 1 second AFTER audio ends — never before.
 * Sentences appear spread across the audio portion only.
 */
export function calculateSentenceTimeline(
  durationSeconds: number,
  audioDurationSeconds: number,
  fps: number
) {
  const totalFrames = Math.ceil(durationSeconds * fps);
  const audioFrames = Math.ceil(audioDurationSeconds * fps);

  // Sentences appear during the audio portion (12% to 75% of audio)
  const sentenceStartPct = 0.12;
  const interval = (audioDurationSeconds * 0.63) / 5;

  const sentenceAppearFrames = Array.from({ length: 5 }, (_, i) => {
    const timeSec = audioDurationSeconds * sentenceStartPct + i * interval;
    return Math.floor(timeSec * fps);
  });

  // Answer reveal = 1 second AFTER audio ends
  const answerRevealFrame = Math.ceil((audioDurationSeconds + 1) * fps);

  return { totalFrames, sentenceAppearFrames, answerRevealFrame };
}
