import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, inputClass } from '../../../../components/Field';
import { Modal } from '../../../../components/Modal';
import { Segmented } from '../../../../components/Segmented';
import { Toggle } from '../../../../components/settings';
import { ErrorText, primaryButton, secondaryButton } from '../../../../components/ui';
import { look } from '../../../../lib/appearance';
import { useObservable } from '../../../../lib/store';
import { ensureAudio } from '../../audio';
import { clock } from '../PlayerControls';
import type { PiecePlayer } from '../player';
import { FrameMaker, type Film } from './frame';
import { canFilm, film as filmIt, fileType, heardAs, type Filming } from './record';
import { audioClock } from '../../audio';
import { MAX_LOGO, setVideo, sizeOf, videoOptions } from './settings';

// A video of the piece as it plays here, to share. Filmed in real time.
export function VideoModal({ player, base, range, onBefore, onAfter, onClose }: {
  player: PiecePlayer;
  base: Omit<Film, 'player' | 'start'>;
  // What is filmed: the loop, or the whole piece.
  range: { start: number; end: number; name: string };
  // The piece is made ready (listen mode, no loop), then given back.
  onBefore(): void;
  onAfter(): void;
  onClose(): void;
}) {
  const options = useObservable(videoOptions);
  const colors = useObservable(look);
  const size = sizeOf(options);
  const [filming, setFilming] = useState<Filming | null>(null);
  const [position, setPosition] = useState(range.start);
  const [result, setResult] = useState<{ url: string; name: string; bytes: number } | null>(null);
  const [error, setError] = useState('');
  const preview = useRef<HTMLCanvasElement>(null);
  const filmData = useMemo((): Film => ({ ...base, player, start: range.start }), [base, player, range.start]);

  // A picture, a second into it.
  useEffect(() => {
    const canvas = preview.current;
    if (!canvas || filming) return;
    const [w, h] = size;
    Object.assign(canvas, { width: w, height: h });
    const ctx = canvas.getContext('2d')!;
    const shown = { ...filmData, player: { position: range.start + 1.5, rate: player.rate, notes: player.notes, state: { get: () => ({ expected: [], playing: false }) } } };
    const maker = new FrameMaker(shown, options, colors, w, h);
    const draw = () => maker.draw(ctx, performance.now());
    // Again once the logo has come.
    draw();
    const id = setTimeout(draw, 300);
    return () => clearTimeout(id);
  }, [options, colors, filmData, size, range.start, player, filming]);

  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  const start = async () => {
    setError('');
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    await ensureAudio().catch(() => {});
    onBefore();
    player.seek(Math.max(0, range.start - 0.5));
    const late = options.sound ? audioClock()?.ahead ?? 0 : 0;
    const maker = new FrameMaker({ ...filmData, player: heardAs(player, late) }, options, colors, size[0], size[1]);
    const f = filmIt(player, maker, size, { end: range.end, sound: options.sound, onProgress: setPosition });
    setFilming(f);
    const blob = await f.done;
    setFilming(null);
    onAfter();
    if (!blob) return;
    const mp4 = blob.type.includes('mp4');
    setResult({ url: URL.createObjectURL(blob), name: `${base.title}${range.name ? ` - ${range.name}` : ''}.${mp4 ? 'mp4' : 'webm'}`.replace(/[\\/:*?"<>|]+/g, ' '), bytes: blob.size });
  };

  const total = range.end - range.start;
  const supported = canFilm() && !!fileType();

  return (
    <Modal title="Exporter en vidéo" subtitle={range.name ? `Partie ${range.name}` : 'Morceau entier'} onClose={() => (filming ? filming.stop() : onClose())} width="lg">
      {!supported ? (
        <p className="text-sm text-neutral-600">Ce navigateur ne sait pas enregistrer de vidéo. Utilise Chrome, Edge ou Firefox sur ordinateur.</p>
      ) : filming ? (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">Enregistrement en cours : <b>reste sur cet onglet</b>, sinon la vidéo saccade.</p>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full bg-neutral-900 transition-[width]" style={{ width: `${Math.min(100, ((position - range.start) / total) * 100)}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm tabular-nums text-neutral-500">
            <span>{clock(Math.max(0, position - range.start))} / {clock(total)}</span>
            <button type="button" onClick={() => filming.stop()} className={secondaryButton}>Arrêter</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}>
          <div className="space-y-4">
            <Field label="Format">
              <Segmented<'landscape' | 'portrait'> full value={options.format} onChange={(format) => setVideo({ format })} options={[{ value: 'landscape', label: 'Paysage 16:9' }, { value: 'portrait', label: 'Vertical 9:16' }]} />
            </Field>
            <Field label="Qualité">
              <Segmented<720 | 1080> full value={options.quality} onChange={(quality) => setVideo({ quality })} options={[{ value: 1080, label: '1080p' }, { value: 720, label: '720p (plus léger)' }]} />
            </Field>
            <div className="space-y-2">
              <Toggle checked={options.sound} onChange={(sound) => setVideo({ sound })} label="Son du piano (et de la voix)" />
              {base.lyrics && <Toggle checked={options.lyrics} onChange={(lyrics) => setVideo({ lyrics })} label="Paroles" />}
              <Toggle checked={options.numbers} onChange={(numbers) => setVideo({ numbers })} label="Chiffres sur les notes" />
              <Toggle checked={options.title} onChange={(title) => setVideo({ title })} label="Titre au début" />
            </div>
            <Field label="Logo">
              <div className="flex gap-2">
                <input value={options.logo} maxLength={40} placeholder="Ton nom, dans un coin" onChange={(e) => setVideo({ logo: e.target.value })} className={`${inputClass} min-w-0 flex-1`} />
                <LogoImage value={options.logoImage} onChange={(logoImage) => setVideo({ logoImage })} onError={setError} />
              </div>
            </Field>
          </div>
          <div className="space-y-3">
            <canvas ref={preview} aria-label="Aperçu" className={`mx-auto block rounded-lg border border-neutral-200 ${options.format === 'portrait' ? 'max-h-80 w-auto' : 'w-full'}`} />
            <p className="text-xs text-neutral-400">
              {size[0]}×{size[1]}, {fileType().includes('mp4') ? 'MP4' : 'WebM'} · dure {clock(total)} à filmer : le morceau se joue pendant l’enregistrement. Le style des notes est celui des Réglages.
            </p>
            {result ? (
              <div className="space-y-2 rounded-xl bg-emerald-50 p-3">
                <p className="text-sm text-emerald-800">Vidéo prête ({(result.bytes / 1e6).toFixed(1).replace('.', ',')} Mo).</p>
                <div className="flex gap-2">
                  <a href={result.url} download={result.name} className={primaryButton}>Télécharger</a>
                  <button type="button" onClick={() => void start()} className={secondaryButton}>Refaire</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => void start()} className={`${primaryButton} w-full`}>Enregistrer la vidéo</button>
            )}
            <ErrorText>{error}</ErrorText>
          </div>
        </div>
      )}
    </Modal>
  );
}

function LogoImage({ value, onChange, onError }: { value: string; onChange(v: string): void; onError(e: string): void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => (value ? onChange('') : input.current?.click())} className={secondaryButton} title={value ? 'Enlever l’image' : 'Ajouter une image (PNG transparent de préférence)'}>
        {value ? <><img src={value} alt="" className="h-5 w-5 object-contain" />✕</> : 'Image'}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/webp,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const [file] = e.target.files ?? [];
          e.target.value = '';
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const url = String(reader.result);
            if (url.length > MAX_LOGO) return onError('Image trop lourde (300 Ko maximum).');
            onError('');
            onChange(url);
          };
          reader.readAsDataURL(file);
        }}
      />
    </>
  );
}
