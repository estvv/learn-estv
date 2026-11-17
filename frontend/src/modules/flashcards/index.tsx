import { fillTemplate, flashcardsConfig, type Element, type FlashcardsConfig, type Grade } from '@learn/shared';
import { useMemo, useRef, useState } from 'react';
import { Markdown } from '../../components/Markdown';
import { shuffle } from '../../lib/random';
import type { ActivityModule, PlayerProps } from '../types';
import { Button, Empty, Kbd, ProgressBar, Summary, Surface } from '../ui';
import { useKeys } from '../useKeys';

const gradeButtons: { grade: Grade; label: string; hint: string; key: string }[] = [
  { grade: 'again', label: 'Raté', hint: 'à revoir tout de suite', key: '1' },
  { grade: 'hard', label: 'Difficile', hint: '', key: '2' },
  { grade: 'good', label: 'Bien', hint: '', key: '3' },
  { grade: 'easy', label: 'Facile', hint: '', key: '4' },
];

function FlashcardsPlayer({ subject, config, onReview, onFinish }: PlayerProps<FlashcardsConfig>) {
  const cards = useMemo<Element[]>(() => {
    const selected = subject.select(config.select);
    const ordered = config.shuffle ? shuffle(selected) : selected;
    return config.count ? ordered.slice(0, config.count) : ordered;
  }, [subject, config]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [missed, setMissed] = useState(0);
  const [done, setDone] = useState(false);
  const shownAt = useRef(performance.now());

  const card = cards[index];

  const grade = (g: Grade) => {
    onReview({
      element: subject.elementId(card.id),
      facet: config.facet,
      grade: g,
      correct: g !== 'again',
      responseMs: Math.round(performance.now() - shownAt.current),
    });
    if (g === 'again') setMissed((m) => m + 1);
    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
      setRevealed(false);
      shownAt.current = performance.now();
    }
  };

  useKeys((e) => {
    if (done || !card) return;
    if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
      setRevealed(true);
      return true;
    }
    const b = revealed && gradeButtons.find((x) => x.key === e.key);
    if (b) {
      grade(b.grade);
      return true;
    }
  });

  if (cards.length === 0) return <Empty>Aucune carte pour cette sélection.</Empty>;

  if (done) {
    const score = (cards.length - missed) / cards.length;
    return (
      <Summary score={score} total={cards.length} correct={cards.length - missed} passed>
        <Button onClick={() => onFinish({ score, passed: true })}>Continuer</Button>
      </Summary>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3 text-sm text-neutral-500">
        <ProgressBar value={index / cards.length} />
        <span className="shrink-0 tabular-nums">{index + 1} / {cards.length}</span>
      </div>
      <Surface>
        <Markdown>{fillTemplate(config.front, card)}</Markdown>
        {revealed && (
          <div className="mt-6 border-t border-neutral-200 pt-6">
            <Markdown>{fillTemplate(config.back, card)}</Markdown>
          </div>
        )}
      </Surface>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {!revealed ? (
          <Button onClick={() => setRevealed(true)}>Afficher la réponse <Kbd>Espace</Kbd></Button>
        ) : (
          gradeButtons.map((b) => (
            <Button key={b.grade} variant={b.grade === 'again' ? 'danger' : 'secondary'} onClick={() => grade(b.grade)}>
              {b.label} <Kbd>{b.key}</Kbd>
            </Button>
          ))
        )}
      </div>
    </div>
  );
}

export const flashcardsModule: ActivityModule<FlashcardsConfig> = {
  id: 'flashcards',
  label: 'Cartes',
  configSchema: flashcardsConfig,
  Player: FlashcardsPlayer,
  reviewConfig: (config, ids) => ({ ...config, select: { ids }, count: undefined }),
};
