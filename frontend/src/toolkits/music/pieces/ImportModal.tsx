import { useRef, useState } from 'react';
import { Field, inputClass } from '../../../components/Field';
import { Modal } from '../../../components/Modal';
import { ErrorText, primaryButton, secondaryButton } from '../../../components/ui';
import { ACCEPT, fileKind, piecesApi } from './api';
import { importAudio } from './importAudio';
import { importMidi } from './importMidi';
import { importMusicXml } from './importMusicXml';
import { DifficultyPicker, FolderSelect } from './pieceFields';
import { sourceLabels, type ImportResult, type PieceFolder } from './types';
import type { PieceDifficulty } from '@learn/shared';

const STAGES = { decode: 'Lecture du son…', model: 'Chargement du modèle de transcription…', transcribe: 'Transcription' } as const;

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// Pick a file, convert it to notes in the browser, name it, save it.
export function ImportModal({ subject, folders, onClose, onSaved }: { subject: string; folders: PieceFolder[]; onClose(): void; onSaved(id: number): void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [folder, setFolder] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<PieceDifficulty | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const kind = file ? fileKind(file) : null;

  const convert = async (f: File, sens = sensitivity) => {
    setError('');
    setResult(null);
    const k = fileKind(f);
    if (!k) return setError('Format non reconnu : MIDI (.mid), MusicXML (.musicxml, .mxl) ou audio/vidéo.');
    try {
      let r: ImportResult;
      if (k === 'midi') r = await importMidi(f);
      else if (k === 'musicxml') r = await importMusicXml(f);
      else {
        r = await importAudio(f, {
          sensitivity: sens,
          onProgress: (stage, p) => setProgress(stage === 'transcribe' && p !== undefined ? `${STAGES[stage]} : ${Math.round(p * 100)} %` : STAGES[stage]),
        });
      }
      setResult(r);
      setTitle(r.title);
      setArtist(r.artist ?? '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    setError('');
    try {
      const { warnings: _, ...piece } = result;
      const { id } = await piecesApi.create(subject, { ...piece, title: title.trim() || result.title, artist: artist.trim() || null }, { folder_id: folder, difficulty });
      onSaved(id);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const duration = result ? result.notes.reduce((end, n) => Math.max(end, n.time + n.duration), 0) : 0;

  return (
    <Modal title="Importer un morceau" subtitle="MIDI, MusicXML (MuseScore) ou un fichier audio / vidéo à transcrire." onClose={onClose} width="md">
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={!!progress}
          className="w-full rounded-xl border-2 border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-900"
        >
          {file ? <span className="font-medium text-neutral-900">{file.name}</span> : 'Choisir un fichier'}
          <span className="mt-1 block text-xs text-neutral-400">.mid · .musicxml · .mxl · mp3 · wav · m4a · mp4 · webm</span>
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setFile(f);
            // Files with exact notes convert at once; audio waits for the sensitivity.
            if (fileKind(f) !== 'audio') void convert(f);
            else {
              setResult(null);
              setError('');
            }
          }}
        />

        {kind === 'audio' && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="text-sm font-semibold text-neutral-900">Transcription automatique</div>
            <p className="mt-0.5 text-xs text-neutral-500">
              Faite dans ton navigateur, rien n’est envoyé. Fiable sur du piano seul ; sur une chanson complète (voix, batterie), le résultat sera approximatif.
            </p>
            <label className="mt-3 flex items-center gap-3 text-sm text-neutral-600">
              Sensibilité
              <input type="range" min={0} max={1} step={0.05} value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} className="flex-1 accent-neutral-900" />
              <span className="w-24 text-right text-xs text-neutral-400">{sensitivity < 0.35 ? 'notes sûres' : sensitivity > 0.65 ? 'toutes les notes' : 'équilibrée'}</span>
            </label>
            <button type="button" disabled={!!progress} onClick={() => file && void convert(file)} className={`${secondaryButton} mt-3`}>
              {result ? 'Retranscrire' : 'Transcrire'}
            </button>
          </div>
        )}

        {progress && <p className="text-sm text-neutral-500">{progress}</p>}

        {result && (
          <div className="space-y-3">
            <div className="rounded-lg border border-neutral-200 px-4 py-3 text-sm text-neutral-600">
              <span className="font-semibold text-neutral-900">{result.notes.length} notes</span> · {formatDuration(duration)} · {sourceLabels[result.source]}
              {result.bpm && <> · {result.bpm} bpm</>}
              {result.warnings.map((w) => <p key={w} className="mt-1.5 text-xs text-amber-700">{w}</p>)}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Titre">
                <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Artiste">
                <input value={artist} maxLength={120} placeholder="Facultatif" onChange={(e) => setArtist(e.target.value)} className={inputClass} />
              </Field>
            </div>
            {folders.length > 0 && (
              <Field label="Dossier">
                <FolderSelect folders={folders} value={folder} onChange={setFolder} />
              </Field>
            )}
            <Field label="Difficulté">
              <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            </Field>
          </div>
        )}

        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Annuler</button>
          <button type="button" onClick={() => void save()} disabled={!result || saving || !!progress} className={primaryButton}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
