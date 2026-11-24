import { useState, type ReactNode } from 'react';
import type { Hand, PieceLevel, PieceNote, PieceTrack } from '@learn/shared';
import { PencilIcon, PlusIcon } from '../../../components/icons';
import { Modal } from '../../../components/Modal';
import { Segmented } from '../../../components/Segmented';
import { Toggle } from '../../../components/settings';
import { StageFields, StagePreview } from '../stage/StageFields';
import { HandColorsField, ThemeField } from '../../../components/AppearanceFields';
import { Field } from '../../../components/Field';
import type { PlayMode } from './player';
import { TrackList } from './PlayerControls';

export type HandChoice = 'both' | Hand;

export const RATES = [0.5, 0.75, 1, 1.25];

type Tab = 'play' | 'look' | 'edit';
// Opened again where it was left.
let lastTab: Tab = 'play';

// Everything that is not needed while playing, in a window.
export function PieceOptions({ mode, level, rate, hand, bothHands, numbered, tracks, notes, enabled, bigKeys, onMode, onLevel, onRate, onHand, onNumbered, onTracks, onBigKeys, onEdit, onEditNumbers, onExtract, lyrics, onLyrics, onKaraoke, onClose }: {
  mode: PlayMode;
  level: PieceLevel;
  rate: number;
  hand: HandChoice;
  // Both play, at this level and with these tracks.
  bothHands: boolean;
  numbered: boolean;
  tracks: PieceTrack[];
  notes: PieceNote[];
  enabled: boolean[];
  // Null when the screen has no need for them.
  bigKeys: boolean | null;
  onMode(mode: PlayMode): void;
  onLevel(level: PieceLevel): void;
  onRate(rate: number): void;
  onHand(hand: HandChoice): void;
  onNumbered(on: boolean): void;
  onTracks(enabled: boolean[]): void;
  onBigKeys(on: boolean): void;
  // Left out for pieces written by hand: they only have one editor.
  onEdit?(): void;
  onEditNumbers(): void;
  // A new piece from parts of this one.
  onExtract(): void;
  // Shown or not; null: the piece has none.
  lyrics: boolean | null;
  onLyrics(on: boolean): void;
  // Finding them, putting them in their place.
  onKaraoke(): void;
  onClose(): void;
}) {
  const [tab, setTab] = useState<Tab>(lastTab);
  const show = (next: Tab) => {
    lastTab = next;
    setTab(next);
  };

  return (
    <Modal title="Réglages" onClose={onClose} width="lg">
      <div className="mb-5">
        <Segmented<Tab> full value={tab} onChange={show} options={[{ value: 'play', label: 'Jouer' }, { value: 'look', label: 'Apparence' }, { value: 'edit', label: 'Modifier' }]} />
      </div>
      {/* As tall whatever the tab, so that they do not move under the mouse. */}
      <div className="sm:min-h-104">
        {tab === 'play' && (
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="Mode" hint={mode === 'wait' ? 'Le morceau attend que tu joues les bonnes notes.' : 'Le morceau se joue tout seul.'}>
              <Segmented<PlayMode> full value={mode} onChange={onMode} options={[{ value: 'listen', label: 'Écouter' }, { value: 'wait', label: 'Attente' }]} />
            </Field>
            <Field label="Mains" hint={!bothHands ? 'Une seule main joue avec ce niveau et ces pistes.' : hand === 'both' ? undefined : 'L’autre main n’est ni jouée ni affichée.'}>
              <div className={bothHands ? '' : 'pointer-events-none opacity-40'} inert={!bothHands}>
                <Segmented<HandChoice> full value={hand} onChange={onHand} options={[{ value: 'left', label: 'Gauche' }, { value: 'both', label: 'Les deux' }, { value: 'right', label: 'Droite' }]} />
              </div>
            </Field>
            <Field label="Niveau">
              <Segmented<PieceLevel>
                full
                value={level}
                onChange={onLevel}
                options={[{ value: 'original', label: 'Original' }, { value: 'simplified', label: 'Simplifié' }, { value: 'melody', label: 'Mélodie' }]}
              />
            </Field>
            <Field label="Vitesse">
              <Segmented<number> full value={rate} onChange={onRate} options={RATES.map((r) => ({ value: r, label: `${Math.round(r * 100)} %` }))} />
            </Field>
            <div className="space-y-3 sm:col-span-2">
              <Toggle checked={numbered} onChange={onNumbered} label="Chiffres sur les notes et les touches" />
              {lyrics !== null && <Toggle checked={lyrics} onChange={onLyrics} label="Paroles au-dessus des notes" />}
              {mode === 'wait' && bigKeys !== null && (
                <div>
                  <Toggle checked={bigKeys} onChange={onBigKeys} label="Grandes touches" />
                  <p className="mt-1 text-xs text-neutral-400">Pour jouer sur l’écran : le clavier suit les notes, et glisse si tu tires la zone au-dessus.</p>
                </div>
              )}
            </div>
            {tracks.length > 1 && (
              <div className="sm:col-span-2">
                <Field label="Pistes">
                  <div className="-mx-2 max-h-52 overflow-y-auto overscroll-contain"><TrackList tracks={tracks} notes={notes} enabled={enabled} onChange={onTracks} /></div>
                </Field>
              </div>
            )}
          </div>
        )}
        {tab === 'look' && (
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <StageFields />
            <div className="space-y-5">
              <StagePreview />
              <ThemeField full />
              <HandColorsField />
            </div>
          </div>
        )}
        {tab === 'edit' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {onEdit && <Choice title="Modifier les notes" text="Poser, déplacer et allonger les notes au-dessus du clavier." icon={<PencilIcon className="h-4 w-4" />} onClick={onEdit} />}
            <Choice title="Modifier en chiffres" text={onEdit ? 'Les numéros de chaque touche, et les cases une par une.' : 'Les numéros de chaque touche, et les notes.'} icon={<PencilIcon className="h-4 w-4" />} onClick={onEditNumbers} />
            <Choice
              title={lyrics === null ? 'Ajouter les paroles' : 'Paroles'}
              text="Karaoké : les trouver, et les caler sur le morceau."
              icon={lyrics === null ? <PlusIcon className="h-4 w-4" /> : <PencilIcon className="h-4 w-4" />}
              onClick={onKaraoke}
            />
            <Choice title="Nouveau morceau avec des parties" text="Garder seulement quelques parties. Celui-ci ne change pas." icon={<PlusIcon className="h-4 w-4" />} onClick={onExtract} />
          </div>
        )}
      </div>
    </Modal>
  );
}

function Choice({ title, text, icon, onClick }: { title: string; text: string; icon: ReactNode; onClick(): void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50">
      <span className="mt-0.5 shrink-0 text-neutral-500">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-neutral-900">{title}</span>
        <span className="mt-0.5 block text-xs text-neutral-500">{text}</span>
      </span>
    </button>
  );
}
