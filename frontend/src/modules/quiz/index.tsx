import { fillTemplate, gradeFromAnswer, quizConfig, type QuizConfig } from '@learn/shared';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Markdown } from '../../components/Markdown';
import { drawCycling, shuffle } from '../../lib/random';
import type { ActivityModule, PlayerProps } from '../types';
import { Button, Empty, Kbd, ProgressBar, Summary, Surface } from '../ui';
import { useKeys } from '../useKeys';
import type { SubjectModel } from '../../content/subject';

interface Question {
  prompt: string;
  choices?: string[];
  answer: string;
  accept: string[];
  explanation?: string;
  element?: string; // full id
  facet?: string;
}

function buildQuestions(subject: SubjectModel, config: QuizConfig): Question[] {
  if (config.mode === 'fixed') {
    const qs = config.questions.map((q) => ({
      ...q,
      element: q.element ? subject.elementId(q.element) : undefined,
    }));
    return config.shuffle ? shuffle(qs) : qs;
  }
  const selected = subject.select(config.select);
  const pool = config.distractors ? subject.select(config.distractors) : selected;
  const poolAnswers = [...new Set(pool.map((e) => fillTemplate(config.answer, e)))];
  return drawCycling(selected, config.count).map((e) => {
    const answer = fillTemplate(config.answer, e);
    const own = config.wrong ? e.data[config.wrong] : undefined;
    const choices = Array.isArray(own) ? shuffle([answer, ...own.map(String)]) : config.choices > 0
      ? shuffle([answer, ...shuffle(poolAnswers.filter((a) => a !== answer)).slice(0, config.choices - 1)])
      : undefined;
    return {
      prompt: fillTemplate(config.prompt, e),
      choices,
      answer,
      accept: [],
      explanation: config.explanation ? fillTemplate(config.explanation, e) : undefined,
      element: subject.elementId(e.id),
      facet: config.facet,
    };
  });
}

// `code` between backquotes, in choices and answers.
const inlineCode = (text: string) => text.split(/`([^`]+)`/).map((part, i) => (i % 2 ? <code key={i} className="font-mono text-[0.95em]">{part}</code> : part));

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function QuizPlayer({ subject, config, onReview, onFinish }: PlayerProps<QuizConfig>) {
  const questions = useMemo(() => buildQuestions(subject, config), [subject, config]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const shownAt = useRef(performance.now());

  const q = questions[index];
  const answered = picked !== null;
  const isRight = (value: string) => [q.answer, ...q.accept].some((a) => normalize(a) === normalize(value));

  const answer = (value: string) => {
    if (answered || done) return;
    const correct = isRight(value);
    const responseMs = Math.round(performance.now() - shownAt.current);
    setPicked(value);
    if (correct) setCorrectCount((c) => c + 1);
    if (q.element && q.facet) {
      onReview({ element: q.element, facet: q.facet, grade: gradeFromAnswer(correct, responseMs), correct, responseMs });
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIndex(index + 1);
    setPicked(null);
    setTyped('');
    shownAt.current = performance.now();
  };

  useKeys((e) => {
    if (done || !q) return;
    if (answered && e.key === 'Enter') {
      next();
      return true;
    }
    if (!answered && q.choices) {
      const n = Number(e.key);
      if (n >= 1 && n <= q.choices.length) {
        answer(q.choices[n - 1]);
        return true;
      }
    }
  });

  if (questions.length === 0) return <Empty>Aucune question pour cette sélection.</Empty>;

  if (done) {
    const score = correctCount / questions.length;
    const passed = score >= config.passRatio;
    return (
      <Summary score={score} total={questions.length} correct={correctCount} passed={passed}>
        <Button onClick={() => onFinish({ score, passed })}>Continuer</Button>
      </Summary>
    );
  }

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    if (!answered && typed.trim()) answer(typed);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3 text-sm text-neutral-500">
        <ProgressBar value={index / questions.length} />
        <span className="shrink-0 tabular-nums">{index + 1} / {questions.length}</span>
      </div>
      <Surface>
        <Markdown>{q.prompt}</Markdown>
      </Surface>

      {q.choices ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {q.choices.map((c, i) => {
            const state = !answered ? 'idle' : isRight(c) ? 'right' : c === picked ? 'wrong' : 'idle';
            return (
              <button
                key={c}
                type="button"
                disabled={answered}
                onClick={() => answer(c)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                  state === 'right' ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : state === 'wrong' ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-neutral-200 bg-white shadow-sm hover:border-neutral-400 disabled:opacity-60'
                }`}
              >
                <span className="min-w-0 whitespace-pre-wrap break-words">{inlineCode(c)}</span>
                <Kbd>{i + 1}</Kbd>
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={submitTyped} className="mt-4 flex gap-2">
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={answered}
            placeholder="Ta réponse"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          {!answered && <Button type="submit">Valider</Button>}
        </form>
      )}

      {answered && (
        <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${isRight(picked!) ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <div className="font-semibold">{isRight(picked!) ? 'Correct' : <>Réponse : {inlineCode(q.answer)}</>}</div>
          {q.explanation && <Markdown className="mt-1">{q.explanation}</Markdown>}
          <div className="mt-3 flex justify-end">
            <Button onClick={next} autoFocus>Suivant <Kbd>Entrée</Kbd></Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const quizModule: ActivityModule<QuizConfig> = {
  id: 'quiz',
  label: 'Quiz',
  configSchema: quizConfig,
  Player: QuizPlayer,
  reviewConfig: (config, ids) => (config.mode === 'generated'
    ? { ...config, select: { ids }, count: ids.length, distractors: config.distractors ?? config.select }
    : config),
};
