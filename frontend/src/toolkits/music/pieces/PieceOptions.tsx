import type { Hand, PieceLevel, PieceNote, PieceTrack } from '@learn/shared';
import { PencilIcon } from '../../../components/icons';
import { Modal } from '../../../components/Modal';
import { Segmented } from '../../../components/Segmented';
import { Toggle } from '../../../components/settings';
import { Field } from '../../../components/Field';
import { secondaryButton } from '../../../components/ui';
import type { PlayMode } from './player';
import { TrackList } from './PlayerControls';

export type HandChoice = 'both' | Hand;

export const RATES = [0.5, 0.75, 1, 1.25];

// Phones and tablets: what does not fit around the notes.
export function PieceOptions({ mode, level, rate, hand, numbered, tracks, notes, enabled, bigKeys, onMode, onLevel, onRate, onHand, onNumbered, onTracks, onBigKeys, onEdit, onEditNumbers, onClose }: {
  // Null while correcting the notes: they are the piece's own, only listened to.
  mode: PlayMode | null;
  level: PieceLevel;
  rate: number;
  // Null when the piece has a single hand.
  hand: HandChoice | null;
  // Null while correcting the notes: no numbers then.
  numbered: boolean | null;
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
  // Left out where correcting notes by hand is not possible.
  onEdit?(): void;
  onEditNumbers?(): void;
  onClose(): void;
}) {
  return (
    <Modal title="Réglages du morceau" onClose={onClose}>
      <div className="space-y-5">
        {mode && (
          <>
            <Field label="Mode" hint={mode === 'wait' ? 'Le morceau attend que tu joues les bonnes notes.' : 'Le morceau se joue tout seul.'}>
              <Segmented<PlayMode> full value={mode} onChange={onMode} options={[{ value: 'listen', label: 'Écouter' }, { value: 'wait', label: 'Attente' }]} />
            </Field>
            {mode === 'wait' && bigKeys !== null && (
              <div>
                <Toggle checked={bigKeys} onChange={onBigKeys} label="Grandes touches" />
                <p className="mt-1 text-xs text-neutral-400">Pour jouer sur l’écran : le clavier suit les notes, et glisse si tu tires la zone au-dessus.</p>
              </div>
            )}
            <Field label="Niveau">
              <Segmented<PieceLevel>
                full
                value={level}
                onChange={onLevel}
                options={[{ value: 'original', label: 'Original' }, { value: 'simplified', label: 'Simplifié' }, { value: 'melody', label: 'Mélodie' }]}
              />
            </Field>
          </>
        )}
        <Field label="Vitesse">
          <Segmented<number> full value={rate} onChange={onRate} options={RATES.map((r) => ({ value: r, label: `${Math.round(r * 100)} %` }))} />
        </Field>
        {hand && (
          <Field label="Mains" hint={hand === 'both' ? undefined : 'L’autre main n’est ni jouée ni affichée.'}>
            <Segmented<HandChoice> full value={hand} onChange={onHand} options={[{ value: 'both', label: 'Les deux' }, { value: 'left', label: 'Gauche' }, { value: 'right', label: 'Droite' }]} />
          </Field>
        )}
        {numbered !== null && <Toggle checked={numbered} onChange={onNumbered} label="Chiffres" />}
        {tracks.length > 1 && (
          <Field label="Pistes">
            <div className="-mx-2"><TrackList tracks={tracks} notes={notes} enabled={enabled} onChange={onTracks} /></div>
          </Field>
        )}
        {onEditNumbers && (
          <button type="button" onClick={onEditNumbers} className={`${secondaryButton} w-full`}>
            <PencilIcon className="h-4 w-4" />Modifier les chiffres
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit();
            }}
            className={`${secondaryButton} w-full`}
          >
            <PencilIcon className="h-4 w-4" />Corriger les notes
          </button>
        )}
      </div>
    </Modal>
  );
}
