import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../../app/auth';
import { PlusIcon } from '../../../components/icons';
import { ConfirmModal } from '../../../components/Modal';
import { ErrorText, primaryButton } from '../../../components/ui';
import { piecesApi } from './api';
import { ImportModal } from './ImportModal';
import { sourceLabels, type PieceSummary } from './types';

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// Side panel of the practice page: the account's pieces and the import.
export function PiecesPanel({ subject, current, onPick, onClose }: {
  subject: string;
  current: number | null;
  onPick(id: number | null): void;
  onClose(): void;
}) {
  const { user } = useAuth();
  const [pieces, setPieces] = useState<PieceSummary[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [removing, setRemoving] = useState<PieceSummary | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!user) return;
    piecesApi.list(subject).then(setPieces, (e: Error) => setError(e.message));
  }, [user, subject]);
  useEffect(load, [load]);

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-neutral-900/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-sm flex-col border-l border-neutral-200 bg-white shadow-2xl animate-[fade-in_120ms_ease-out]">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <h2 className="text-lg font-bold text-neutral-900">Morceaux</h2>
          <button type="button" onClick={onClose} title="Fermer" className="-mr-2 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {!user ? (
          <div className="p-5 text-sm text-neutral-600">
            Les morceaux importés sont privés et liés à ton compte. <Link to="/connexion" className="underline">Connecte-toi</Link> pour importer des fichiers MIDI, des partitions ou des enregistrements.
          </div>
        ) : (
          <>
            <div className="p-4">
              <button type="button" onClick={() => setImporting(true)} className={`${primaryButton} w-full`}>
                <PlusIcon className="h-4 w-4" />Importer un morceau
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              <button
                type="button"
                onClick={() => onPick(null)}
                className={`mb-1 w-full rounded-lg px-3 py-2.5 text-left text-sm ${current === null ? 'bg-neutral-100 font-semibold text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'}`}
              >
                Jeu libre
              </button>
              {pieces?.length === 0 && <p className="px-3 py-4 text-sm text-neutral-400">Aucun morceau importé pour l’instant.</p>}
              {pieces?.map((p) => (
                <div key={p.id} className={`group flex items-center gap-2 rounded-lg pr-2 ${current === p.id ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}>
                  <button type="button" onClick={() => onPick(p.id)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                    <span className={`block truncate text-sm ${current === p.id ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-800'}`}>{p.title}</span>
                    <span className="block text-xs text-neutral-400">{sourceLabels[p.source]} · {formatDuration(p.duration)} · {p.note_count} notes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(p)}
                    className="hidden rounded px-1.5 py-1 text-xs text-neutral-400 hover:text-red-600 group-hover:block"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
              <div className="px-3"><ErrorText>{error}</ErrorText></div>
            </div>
          </>
        )}
      </aside>

      {importing && (
        <ImportModal
          subject={subject}
          onClose={() => setImporting(false)}
          onSaved={(id) => {
            setImporting(false);
            load();
            onPick(id);
          }}
        />
      )}
      {removing && (
        <ConfirmModal
          title={`Supprimer « ${removing.title} » ?`}
          message="Le morceau sera supprimé de ton compte."
          confirmLabel="Supprimer"
          danger
          onConfirm={async () => {
            await piecesApi.remove(removing.id);
            if (current === removing.id) onPick(null);
            load();
          }}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
