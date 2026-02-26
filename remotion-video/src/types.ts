// ── Hook Intro (shared optional props) ──────────────────────────────────────
export interface HookIntroConfig {
  hookIntroDuration?: number;      // Duration of hook intro in seconds (0 = no hook)
  questionTypeLabel?: string;      // Label shown in hook, e.g. "Multiple Choice"
}

// ── Sentence Completion ──────────────────────────────────────────────────────
export interface SentenceCompletionProps extends HookIntroConfig {
  sentences: string[];
  answers: string[];
  category: string;
  scenarioDescription: string;
  durationSeconds: number;       // Total video length (audio + 4s buffer)
  audioDurationSeconds: number;   // Raw audio length — answers reveal AFTER this
  audioFileName: string;
}

// ── MCQ Single Answer ────────────────────────────────────────────────────────
export interface MCQSingleProps extends HookIntroConfig {
  question: string;
  options: string[];         // 3-4 options
  correctIndex: number;      // 0-based index of correct answer
  category: string;
  scenarioDescription: string;
  durationSeconds: number;       // Total video length (audio + 4s buffer)
  audioDurationSeconds: number;   // Raw audio length — answers reveal AFTER this
  audioFileName: string;
  examType?: "IELTS" | "PTE";
}

// ── Note/Form Completion ─────────────────────────────────────────────────────
export interface NoteCompletionField {
  label: string;
  value: string;
}

export interface NoteCompletionProps extends HookIntroConfig {
  formTitle: string;
  fields: NoteCompletionField[];
  category: string;
  scenarioDescription: string;
  durationSeconds: number;       // Total video length (audio + 4s buffer)
  audioDurationSeconds: number;   // Raw audio length — answers reveal AFTER this
  audioFileName: string;
  examType?: "IELTS" | "PTE";
}

// ── Table Completion ─────────────────────────────────────────────────────────
export interface TableRow {
  cells: string[];           // Cell values; "___" marks blanks
  answers: string[];         // Answers for blank cells in order
}

export interface TableCompletionProps extends HookIntroConfig {
  tableTitle: string;
  headers: string[];
  rows: TableRow[];
  category: string;
  scenarioDescription: string;
  durationSeconds: number;       // Total video length (audio + 4s buffer)
  audioDurationSeconds: number;   // Raw audio length — answers reveal AFTER this
  audioFileName: string;
  examType?: "IELTS" | "PTE";
}

// ── Write from Dictation (PTE) ───────────────────────────────────────────────
export interface WriteFromDictationProps extends HookIntroConfig {
  sentence: string;
  category: string;
  scenarioDescription: string;
  durationSeconds: number;       // Total video length (audio + 4s buffer)
  audioDurationSeconds: number;   // Raw audio length — answers reveal AFTER this
  audioFileName: string;
  examType?: "IELTS" | "PTE";
}

// ── Highlight Incorrect Words (PTE) ──────────────────────────────────────────
export interface IncorrectWord {
  original: string;
  correction: string;
  wordIndex: number;
}

export interface HighlightIncorrectProps extends HookIntroConfig {
  transcript: string;
  incorrectWords: IncorrectWord[];
  category: string;
  scenarioDescription: string;
  durationSeconds: number;       // Total video length (audio + 4s buffer)
  audioDurationSeconds: number;   // Raw audio length — answers reveal AFTER this
  audioFileName: string;
  examType?: "IELTS" | "PTE";
}

// ── Matching / Classification (IELTS) ────────────────────────────────────────
export interface MatchingItem {
  text: string;
  categoryIndex: number;
}

export interface MatchingClassificationProps extends HookIntroConfig {
  categories: string[];
  items: MatchingItem[];
  category: string;
  scenarioDescription: string;
  durationSeconds: number;       // Total video length (audio + 4s buffer)
  audioDurationSeconds: number;   // Raw audio length — answers reveal AFTER this
  audioFileName: string;
  examType?: "IELTS" | "PTE";
}

// ── MCQ Multiple Answers (PTE) ──────────────────────────────────────────────
export interface MCQMultipleProps extends HookIntroConfig {
  question: string;
  options: string[];           // 4-5 options
  correctIndices: number[];    // 0-based indices of ALL correct answers
  category: string;
  scenarioDescription: string;
  durationSeconds: number;       // Total video length (audio + 4s buffer)
  audioDurationSeconds: number;   // Raw audio length — answers reveal AFTER this
  audioFileName: string;
  examType?: "IELTS" | "PTE";
}

// ── Cue Card / Speaking Part 2 (IELTS) ──────────────────────────────────────
export interface SentenceTiming {
  index: number;
  startTime: number;       // seconds from start of model-answer audio
  endTime: number;         // seconds from start of model-answer audio
  text: string;
}

export interface CueCardProps extends HookIntroConfig {
  topic: string;                          // "Describe a book that you recently read."
  bulletPoints: string[];                 // 3-4 "You should say" items
  modelAnswerSentences: string[];         // 6-10 sentences of the model answer
  sentenceTimings: SentenceTiming[];      // Per-sentence start/end times for highlight sync
  cueCardDisplayDuration: number;         // Seconds to show the cue card before answer scrolls
  category: string;
  scenarioDescription: string;
  durationSeconds: number;                // Total video duration (hook + card + answer + buffer)
  audioDurationSeconds: number;           // Raw model-answer audio length
  audioFileName: string;
  examType?: "IELTS" | "PTE";
  backgroundMusicFileName?: string;       // Optional bg music file in public/
  sectionLabel?: string;                  // "Speaking" (override for hook intro)
}

// ── Vocabulary Comparison (IELTS/PTE) ───────────────────────────────────────
export interface WordPair {
  basic: string;            // Band 5-6 word (e.g. "good")
  advanced: string;         // Band 7-9 word (e.g. "exemplary")
  basicMeaning?: string;    // Brief definition of basic word
  advancedMeaning?: string; // Brief definition of advanced word
  exampleSentence?: string; // Example using the advanced word
}

export interface VocabularyComparisonProps extends HookIntroConfig {
  topic: string;                    // e.g. "Upgrade Your Writing"
  wordPairs: WordPair[];            // 5-6 word pairs
  category: string;
  scenarioDescription: string;
  durationSeconds: number;          // Total video length (audio + buffer)
  audioDurationSeconds: number;     // Raw audio length
  audioFileName: string;
  examType?: "IELTS" | "PTE";
}

// ── Listening Quiz (engaging light-blue design) ─────────────────────────────
export interface ListeningQuizProps {
  question: string;
  options: string[];          // ["A) Broken machine", "B) No fresh coffee", "C) Late meeting"]
  correctIndex: number;       // 0-based
  level: string;              // "B1", "IELTS 6", etc.
  durationSeconds: number;
  audioDurationSeconds: number;
  audioFileName: string;
  hookDuration?: number;      // seconds (0 = disabled)
  hookText?: string;
  ctaDuration?: number;       // seconds (0 = disabled)
  ctaLine1?: string;
  ctaLine2?: string;
  brandName?: string;
  mascotImage?: string;       // optional PNG filename in public/ (overrides SVG mascot)
}

// ── CTA End Screens ─────────────────────────────────────────────────────────
export type CTAVariant =
  | "follow"          // Follow us on social media
  | "visit"           // Visit BandLadder.com
  | "practice"        // Start Practicing Now
  | "score"           // Boost Your Score (stats)
  | "features"        // Platform features highlight
  | "trial"           // Free trial / pricing CTA
  | "swipe"           // Swipe up / Link in bio
  | "testimonial";    // Social proof / rating

export interface CTAEndScreenProps {
  variant: CTAVariant;
  durationSeconds: number;      // Typically 5 seconds
  audioFileName?: string;       // Optional voiceover audio file in public/
}
