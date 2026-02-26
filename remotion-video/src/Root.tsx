import React from "react";
import { Composition } from "remotion";
import { SentenceCompletion } from "./SentenceCompletion/SentenceCompletion";
import { MCQSingle } from "./MCQSingle/MCQSingle";
import { NoteCompletion } from "./NoteCompletion/NoteCompletion";
import { TableCompletion } from "./TableCompletion/TableCompletion";
import { WriteFromDictation } from "./WriteFromDictation/WriteFromDictation";
import { HighlightIncorrect } from "./HighlightIncorrect/HighlightIncorrect";
import { MatchingClassification } from "./MatchingClassification/MatchingClassification";
import { MCQMultiple } from "./MCQMultiple/MCQMultiple";
import { CTAEndScreen } from "./CTA/CTAEndScreen";
import { CueCard } from "./CueCard/CueCard";
import { VocabularyComparison } from "./VocabularyComparison/VocabularyComparison";
import { MCQSingleClean, MCQSingleCleanProps } from "./MCQSingleClean/MCQSingleClean";
import { VocabSequence, VocabSequenceProps } from "./VocabSequence/VocabSequence";
import { ListeningQuiz, ListeningQuizProps } from "./ListeningQuiz/ListeningQuiz";
import { HookIntro } from "./shared/HookIntro";
import {
  SentenceCompletionProps,
  MCQSingleProps,
  NoteCompletionProps,
  TableCompletionProps,
  WriteFromDictationProps,
  HighlightIncorrectProps,
  MatchingClassificationProps,
  MCQMultipleProps,
  CueCardProps,
  VocabularyComparisonProps,
  CTAEndScreenProps,
  ListeningQuizProps as _LQP,
} from "./types";

const FPS = 30;
const HOOK = 5; // Hook intro duration in seconds

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── Sentence Completion ─────────────────────────────────── */}
      <Composition
        id="SentenceCompletion"
        component={SentenceCompletion}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * (54 + HOOK)}
        defaultProps={{
          sentences: [
            "The library membership costs ___ per year.",
            "Students need to bring their ___ to register.",
            "The library opens at ___ on weekdays.",
            "Books can be borrowed for ___ weeks.",
            "The late return fee is ___ per day.",
          ],
          answers: ["\u00a325", "student ID", "8:30 AM", "3", "50p"],
          category: "University",
          scenarioDescription:
            "A student asks about joining the university library",
          durationSeconds: 54 + HOOK,
          audioDurationSeconds: 50,
          audioFileName: "audio.mp3",
          hookIntroDuration: HOOK,
          questionTypeLabel: "Sentence Completion",
        } satisfies SentenceCompletionProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── MCQ Single Answer ───────────────────────────────────── */}
      <Composition
        id="MCQSingle"
        component={MCQSingle}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * (54 + HOOK)}
        defaultProps={{
          question: "What is the main reason the student wants to change courses?",
          options: [
            "The workload is too heavy",
            "The course content is not relevant",
            "The timetable clashes with work",
            "The lecturer is difficult to understand",
          ],
          correctIndex: 2,
          category: "University",
          scenarioDescription:
            "A student discusses course changes with an academic advisor",
          durationSeconds: 54 + HOOK,
          audioDurationSeconds: 50,
          audioFileName: "audio.mp3",
          examType: "IELTS" as const,
          hookIntroDuration: HOOK,
          questionTypeLabel: "Multiple Choice",
        } satisfies MCQSingleProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── MCQ Single Clean (minimal black+white card style) ──── */}
      <Composition
        id="MCQSingleClean"
        component={MCQSingleClean}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 30}
        defaultProps={{
          headerText: "IELTS 6 listening",
          question: "How long the girl stayed in Australia ___ ?",
          options: [
            "A. 6 months",
            "B. 12 months",
            "C. 18 months",
          ],
          correctIndex: 1,
          durationSeconds: 30,
          audioDurationSeconds: 12,
          audioFileName: "audio.mp3",
          hookDuration: 3,
          hookText: "Can you answer this?",
          ctaDuration: 5,
          ctaLine1: "For more practice,",
          ctaLine2: "follow BandLadder",
        } satisfies MCQSingleCleanProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── Note/Form Completion ────────────────────────────────── */}
      <Composition
        id="NoteCompletion"
        component={NoteCompletion}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * (54 + HOOK)}
        defaultProps={{
          formTitle: "Hotel Booking Form",
          fields: [
            { label: "Guest Name", value: "Sarah Mitchell" },
            { label: "Check-in Date", value: "15th March" },
            { label: "Room Type", value: "Double" },
            { label: "Number of Nights", value: "3" },
            { label: "Special Request", value: "Sea view" },
          ],
          category: "Travel",
          scenarioDescription:
            "A guest making a hotel reservation over the phone",
          durationSeconds: 54 + HOOK,
          audioDurationSeconds: 50,
          audioFileName: "audio.mp3",
          examType: "IELTS" as const,
          hookIntroDuration: HOOK,
          questionTypeLabel: "Note Completion",
        } satisfies NoteCompletionProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── Table Completion ────────────────────────────────────── */}
      <Composition
        id="TableCompletion"
        component={TableCompletion}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * (54 + HOOK)}
        defaultProps={{
          tableTitle: "Course Schedule",
          headers: ["Day", "Time", "Room"],
          rows: [
            { cells: ["Monday", "___", "Room 204"], answers: ["10:00 AM"] },
            { cells: ["Wednesday", "2:30 PM", "___"], answers: ["Lab B"] },
            { cells: ["___", "9:00 AM", "Room 107"], answers: ["Friday"] },
          ],
          category: "University",
          scenarioDescription:
            "A tutor explaining the weekly class timetable",
          durationSeconds: 54 + HOOK,
          audioDurationSeconds: 50,
          audioFileName: "audio.mp3",
          examType: "IELTS" as const,
          hookIntroDuration: HOOK,
          questionTypeLabel: "Table Completion",
        } satisfies TableCompletionProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── Write from Dictation (PTE) ──────────────────────────── */}
      <Composition
        id="WriteFromDictation"
        component={WriteFromDictation}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * (54 + HOOK)}
        defaultProps={{
          sentence: "The university library will be closed for renovations during the summer break.",
          category: "University",
          scenarioDescription:
            "Write the sentence you hear exactly as spoken",
          durationSeconds: 54 + HOOK,
          audioDurationSeconds: 50,
          audioFileName: "audio.mp3",
          examType: "PTE" as const,
          hookIntroDuration: HOOK,
          questionTypeLabel: "Write from Dictation",
        } satisfies WriteFromDictationProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── Highlight Incorrect Words (PTE) ─────────────────────── */}
      <Composition
        id="HighlightIncorrect"
        component={HighlightIncorrect}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * (54 + HOOK)}
        defaultProps={{
          transcript: "The professor announced that the final exam would be held on Thursday instead of Friday due to a scheduling conflict with the university hall.",
          incorrectWords: [
            { original: "Thursday", correction: "Wednesday", wordIndex: 9 },
            { original: "conflict", correction: "problem", wordIndex: 18 },
            { original: "hall", correction: "auditorium", wordIndex: 21 },
          ],
          category: "University",
          scenarioDescription:
            "Identify words in the transcript that differ from what you hear",
          durationSeconds: 54 + HOOK,
          audioDurationSeconds: 50,
          audioFileName: "audio.mp3",
          examType: "PTE" as const,
          hookIntroDuration: HOOK,
          questionTypeLabel: "Highlight Incorrect",
        } satisfies HighlightIncorrectProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── Matching / Classification (IELTS) ─────────────────────── */}
      <Composition
        id="MatchingClassification"
        component={MatchingClassification}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * (54 + HOOK)}
        defaultProps={{
          categories: ["Main Library", "Science Library", "Both"],
          items: [
            { text: "Quiet study zone", categoryIndex: 0 },
            { text: "Technical journals", categoryIndex: 1 },
            { text: "Group study rooms", categoryIndex: 2 },
            { text: "On-site cafe", categoryIndex: 0 },
            { text: "Computer workstations", categoryIndex: 1 },
          ],
          category: "University",
          scenarioDescription:
            "Two students compare features of university libraries",
          durationSeconds: 54 + HOOK,
          audioDurationSeconds: 50,
          audioFileName: "audio.mp3",
          examType: "IELTS" as const,
          hookIntroDuration: HOOK,
          questionTypeLabel: "Matching",
        } satisfies MatchingClassificationProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── MCQ Multiple Answers (PTE) ────────────────────────────── */}
      <Composition
        id="MCQMultiple"
        component={MCQMultiple}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * (54 + HOOK)}
        defaultProps={{
          question: "According to the discussion, which are benefits of renewable energy?",
          options: [
            "Lower initial investment costs than fossil fuels",
            "Reduced greenhouse gas emissions",
            "Completely eliminates the need for all fossil fuels",
            "Creates employment in local communities",
            "Requires more maintenance than traditional power plants",
          ],
          correctIndices: [1, 3],
          category: "University",
          scenarioDescription:
            "A lecture discussion about renewable energy benefits",
          durationSeconds: 54 + HOOK,
          audioDurationSeconds: 50,
          audioFileName: "audio.mp3",
          examType: "PTE" as const,
          hookIntroDuration: HOOK,
          questionTypeLabel: "Multiple Answers",
        } satisfies MCQMultipleProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── Cue Card / Speaking Part 2 (IELTS) ─────────────────────── */}
      <Composition
        id="CueCard"
        component={CueCard}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * (75 + HOOK)}
        defaultProps={{
          topic: "Describe a book that you recently read.",
          bulletPoints: [
            "what the book was about",
            "why you chose to read it",
            "how long it took you to read it",
            "and explain whether you would recommend it to others",
          ],
          modelAnswerSentences: [
            "I'd like to talk about a fascinating book I read last month called Sapiens by Yuval Noah Harari.",
            "The book is essentially a brief history of humankind, covering everything from the Stone Age to the modern era.",
            "I chose to read it because several of my colleagues had recommended it enthusiastically during our lunch conversations.",
            "It took me roughly three weeks to finish, as I found myself reading a chapter or two each evening before bed.",
            "What really struck me was how the author manages to make complex historical concepts incredibly accessible and engaging.",
            "The chapters on the Agricultural Revolution were particularly eye-opening, challenging many assumptions I had about early human societies.",
            "I would absolutely recommend this book to anyone who is curious about how the world came to be the way it is today.",
            "In fact, I've already lent my copy to a friend who has been looking for something thought-provoking to read.",
          ],
          sentenceTimings: [
            { index: 0, startTime: 0.0, endTime: 5.5, text: "" },
            { index: 1, startTime: 5.8, endTime: 11.0, text: "" },
            { index: 2, startTime: 11.3, endTime: 17.0, text: "" },
            { index: 3, startTime: 17.3, endTime: 23.0, text: "" },
            { index: 4, startTime: 23.3, endTime: 29.5, text: "" },
            { index: 5, startTime: 29.8, endTime: 36.0, text: "" },
            { index: 6, startTime: 36.3, endTime: 42.5, text: "" },
            { index: 7, startTime: 42.8, endTime: 49.0, text: "" },
          ],
          cueCardDisplayDuration: 10,
          category: "Books & Reading",
          scenarioDescription: "Describe a memorable book you recently read",
          durationSeconds: 75 + HOOK,
          audioDurationSeconds: 49,
          audioFileName: "audio.mp3",
          examType: "IELTS" as const,
          hookIntroDuration: HOOK,
          questionTypeLabel: "Speaking Part 2",
          sectionLabel: "Speaking",
        } satisfies CueCardProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── Vocabulary Comparison (IELTS/PTE) ─────────────────────── */}
      <Composition
        id="VocabularyComparison"
        component={VocabularyComparison}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * (54 + HOOK)}
        defaultProps={{
          topic: "Upgrade Your Writing",
          wordPairs: [
            {
              basic: "good",
              advanced: "exemplary",
              basicMeaning: "of high quality",
              advancedMeaning: "serving as a desirable model",
              exampleSentence: "The student submitted an exemplary essay.",
            },
            {
              basic: "bad",
              advanced: "detrimental",
              basicMeaning: "of poor quality",
              advancedMeaning: "causing harm or damage",
              exampleSentence: "Pollution has a detrimental effect on health.",
            },
            {
              basic: "important",
              advanced: "paramount",
              basicMeaning: "of great significance",
              advancedMeaning: "more important than anything else",
              exampleSentence: "Safety is of paramount importance in aviation.",
            },
            {
              basic: "show",
              advanced: "illustrate",
              basicMeaning: "to display or present",
              advancedMeaning: "to explain or make clear by examples",
              exampleSentence: "The data illustrates a clear upward trend.",
            },
            {
              basic: "big",
              advanced: "substantial",
              basicMeaning: "large in size",
              advancedMeaning: "of considerable importance or size",
              exampleSentence: "There has been a substantial increase in enrollment.",
            },
          ],
          category: "Academic Writing",
          scenarioDescription:
            "Replace basic words with Band 7+ vocabulary",
          durationSeconds: 54 + HOOK,
          audioDurationSeconds: 50,
          audioFileName: "audio.mp3",
          examType: "IELTS" as const,
          hookIntroDuration: HOOK,
          questionTypeLabel: "Vocabulary",
        } satisfies VocabularyComparisonProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── Vocabulary Sequence (clean card, one-at-a-time) ────────── */}
      <Composition
        id="VocabSequence"
        component={VocabSequence}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 50}
        defaultProps={{
          headerText: "IELTS Vocabulary",
          wordPairs: [
            {
              basic: "good",
              advanced: "exemplary",
              basicMeaning: "of high quality",
              advancedMeaning: "serving as a desirable model",
              exampleSentence: "The student submitted an exemplary essay.",
            },
            {
              basic: "bad",
              advanced: "detrimental",
              basicMeaning: "of poor quality",
              advancedMeaning: "causing harm or damage",
              exampleSentence: "Pollution has a detrimental effect on health.",
            },
            {
              basic: "important",
              advanced: "paramount",
              basicMeaning: "of great significance",
              advancedMeaning: "more important than anything else",
              exampleSentence: "Safety is of paramount importance in aviation.",
            },
            {
              basic: "show",
              advanced: "illustrate",
              basicMeaning: "to display or present",
              advancedMeaning: "to explain or make clear by examples",
              exampleSentence: "The data illustrates a clear upward trend.",
            },
            {
              basic: "big",
              advanced: "substantial",
              basicMeaning: "large in size",
              advancedMeaning: "of considerable importance or size",
              exampleSentence: "There has been a substantial increase in enrollment.",
            },
            {
              basic: "think",
              advanced: "contemplate",
              basicMeaning: "to consider",
              advancedMeaning: "to think deeply or carefully about",
              exampleSentence: "Researchers contemplate the long-term effects.",
            },
          ],
          durationSeconds: 50,
          audioFileName: "audio.mp3",
          hookDuration: 3,
          hookText: "Level up your vocabulary!",
          ctaDuration: 5,
          ctaLine1: "For more practice,",
          ctaLine2: "follow BandLadder",
        } satisfies VocabSequenceProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── Listening Quiz (engaging light-blue design) ────────────── */}
      <Composition
        id="ListeningQuiz"
        component={ListeningQuiz}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 30}
        defaultProps={{
          question: "What caused the problem?",
          options: [
            "A) Broken machine",
            "B) No fresh coffee",
            "C) Late meeting",
          ],
          correctIndex: 1,
          level: "B1",
          durationSeconds: 30,
          audioDurationSeconds: 12,
          audioFileName: "audio.mp3",
          hookDuration: 3,
          hookText: "Can you get this right?",
          ctaDuration: 5,
          ctaLine1: "Boost your Band Score,",
          ctaLine2: "One Quiz at a Time!",
          brandName: "BandLadder",
        } satisfies ListeningQuizProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: Math.ceil(props.durationSeconds * FPS),
        })}
      />

      {/* ── CTA End Screens (8 variants) ──────────────────────────── */}
      <Composition
        id="CTA-Follow"
        component={CTAEndScreen}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 4}
        defaultProps={{ variant: "follow", durationSeconds: 4 } satisfies CTAEndScreenProps}
      />
      <Composition
        id="CTA-Visit"
        component={CTAEndScreen}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 4}
        defaultProps={{ variant: "visit", durationSeconds: 4 } satisfies CTAEndScreenProps}
      />
      <Composition
        id="CTA-Practice"
        component={CTAEndScreen}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 4}
        defaultProps={{ variant: "practice", durationSeconds: 4 } satisfies CTAEndScreenProps}
      />
      <Composition
        id="CTA-Score"
        component={CTAEndScreen}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 4}
        defaultProps={{ variant: "score", durationSeconds: 4 } satisfies CTAEndScreenProps}
      />
      <Composition
        id="CTA-Features"
        component={CTAEndScreen}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 4}
        defaultProps={{ variant: "features", durationSeconds: 4 } satisfies CTAEndScreenProps}
      />
      <Composition
        id="CTA-Trial"
        component={CTAEndScreen}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 4}
        defaultProps={{ variant: "trial", durationSeconds: 4 } satisfies CTAEndScreenProps}
      />
      <Composition
        id="CTA-Swipe"
        component={CTAEndScreen}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 5}
        defaultProps={{ variant: "swipe", durationSeconds: 5, audioFileName: "cta_voiceover.mp3" } satisfies CTAEndScreenProps}
      />
      <Composition
        id="CTA-Testimonial"
        component={CTAEndScreen}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 5}
        defaultProps={{ variant: "testimonial", durationSeconds: 5, audioFileName: "cta_voiceover.mp3" } satisfies CTAEndScreenProps}
      />
      {/* ── Hook Intro Test Samples (5 seconds) ─────────────────── */}
      <Composition
        id="HookIntro-MCQ"
        component={HookIntro}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 5}
        defaultProps={{
          examType: "IELTS" as const,
          questionTypeLabel: "Multiple Choice",
          introDuration: 5,
        }}
      />
      <Composition
        id="HookIntro-SentenceCompletion"
        component={HookIntro}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 5}
        defaultProps={{
          examType: "IELTS" as const,
          questionTypeLabel: "Sentence Completion",
          introDuration: 5,
        }}
      />
      <Composition
        id="HookIntro-PTE-MCQMultiple"
        component={HookIntro}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 5}
        defaultProps={{
          examType: "PTE" as const,
          questionTypeLabel: "Multiple Answers",
          introDuration: 5,
        }}
      />
    </>
  );
};
