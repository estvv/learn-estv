import { pieceDifficulties, type PieceDifficulty } from '@learn/shared';
import { useCallback, useEffect, useState, type DragEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../../app/auth';
import { Field, inputClass } from '../../../components/Field';
import { ChevronDownIcon, PencilIcon, PlusIcon } from '../../../components/icons';
import { ConfirmModal, Modal } from '../../../components/Modal';
import { ErrorText, primaryButton, secondaryButton } from '../../../components/ui';
import { readJson, writeJson } from '../../../lib/storage';
import { foldersApi, piecesApi } from './api';
import { ImportModal } from './ImportModal';
import { Cover, DifficultyBadge, DifficultyPicker, FolderSelect } from './pieceFields';
import { difficultyLabels, difficultyStyles, sourceLabels, type PieceFolder, type PieceMeta, type PieceSummary } from './types';

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// Collapsed folders, remembered per browser ("none" = pieces out of folders).
const COLLAPSED_KEY = 'pieces.collapsed';
type FolderKey = number | 'none';

// Side panel of the practice page: the account's pieces, sorted into folders
// (in order of priority) and tagged by difficulty, and the import.
export function PiecesPanel({ subject, current, onPick, onUpdated, onClose }: {
  subject: string;
  current: number | null;
  onPick(id: number | null): void;
  onUpdated(id: number, meta: PieceMeta & { cover?: string | null }): void;
  onClose(): void;
}) {
  const { user } = useAuth();
  const [pieces, setPieces] = useState<PieceSummary[] | null>(null);
  const [folders, setFolders] = useState<PieceFolder[]>([]);
  const [filter, setFilter] = useState<PieceDifficulty | null>(null);
  const [collapsed, setCollapsed] = useState<FolderKey[]>(() => readJson(COLLAPSED_KEY, { keys: [] as FolderKey[] }).keys);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<PieceSummary | null>(null);
  const [removing, setRemoving] = useState<PieceSummary | null>(null);
  // Folder modal: new (no folder) or rename.
  const [naming, setNaming] = useState<{ folder: PieceFolder | null } | null>(null);
  const [removingFolder, setRemovingFolder] = useState<PieceFolder | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<FolderKey | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!user) return;
    Promise.all([piecesApi.list(subject), foldersApi.list(subject)]).then(([p, f]) => {
      setPieces(p);
      setFolders(f);
    }, (e: Error) => setError(e.message));
  }, [user, subject]);
  useEffect(load, [load]);

  const run = (p: Promise<unknown>) => p.catch((e: Error) => setError(e.message));

  const toggle = (key: FolderKey) => {
    const next = collapsed.includes(key) ? collapsed.filter((k) => k !== key) : [...collapsed, key];
    setCollapsed(next);
    writeJson(COLLAPSED_KEY, { keys: next });
  };

  const patchPiece = (p: PieceSummary, change: Partial<PieceMeta> & { cover?: string | null }) => {
    const meta = { title: p.title, artist: p.artist, folder_id: p.folder_id, difficulty: p.difficulty, cover: p.cover, ...change };
    setPieces((list) => list?.map((x) => (x.id === p.id ? { ...x, ...meta } : x)) ?? list);
    onUpdated(p.id, meta);
  };

  const moveTo = (pieceId: number, folder: number | null) => {
    const p = pieces?.find((x) => x.id === pieceId);
    if (!p || p.folder_id === folder) return;
    patchPiece(p, { folder_id: folder });
    void run(piecesApi.update(p.id, { folder_id: folder }).catch((e) => { load(); throw e; }));
  };

  const moveFolder = (index: number, by: -1 | 1) => {
    const next = [...folders];
    const [f] = next.splice(index, 1);
    next.splice(index + by, 0, f);
    setFolders(next);
    void run(foldersApi.reorder(next.map((x) => x.id)));
  };

  const visible = (pieces ?? []).filter((p) => !filter || p.difficulty === filter);
  const groups: { key: FolderKey; folder: PieceFolder | null; items: PieceSummary[] }[] = [
    ...folders.map((f) => ({ key: f.id as FolderKey, folder: f, items: visible.filter((p) => p.folder_id === f.id) })),
    { key: 'none', folder: null, items: visible.filter((p) => p.folder_id === null || !folders.some((f) => f.id === p.folder_id)) },
  ];

  const dropProps = (key: FolderKey) => ({
    onDragOver: (e: DragEvent) => {
      if (dragged === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(key);
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget((t) => (t === key ? null : t));
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (dragged !== null) moveTo(dragged, key === 'none' ? null : key);
      setDragged(null);
      setDropTarget(null);
    },
  });

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
            <div className="space-y-3 p-4 pb-2">
              <button type="button" onClick={() => setImporting(true)} className={`${primaryButton} w-full`}>
                <PlusIcon className="h-4 w-4" />Importer un morceau
              </button>
              {pieces && pieces.length > 0 && (
                <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrer par difficulté">
                  <FilterChip on={filter === null} onClick={() => setFilter(null)}>Tous</FilterChip>
                  {pieceDifficulties.map((d) => (
                    <FilterChip key={d} on={filter === d} onClick={() => setFilter(filter === d ? null : d)}>
                      <span className={`h-1.5 w-1.5 rounded-full ${difficultyStyles[d].dot}`} />{difficultyLabels[d]}
                    </FilterChip>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              <button
                type="button"
                onClick={() => onPick(null)}
                className={`flex w-full items-center gap-3 rounded-xl p-2 text-left ${current === null ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 5v8M12 5v8M16 5v8" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-neutral-900">Jeu libre</span>
                  <span className="block text-xs text-neutral-500">Joue sans partition</span>
                </span>
              </button>

              {pieces?.length === 0 && folders.length === 0 && <p className="px-3 py-4 text-sm text-neutral-400">Aucun morceau importé pour l’instant.</p>}

              {pieces && groups.map(({ key, folder, items }, index) => {
                // No "Sans dossier" heading while there are no folders at all.
                if (!folder && folders.length === 0) {
                  return <div key={key} className="mt-1 space-y-0.5">{items.map((p) => row(p))}</div>;
                }
                if (!folder && items.length === 0 && dragged === null) return null;
                const open = !collapsed.includes(key);
                const total = folder ? (pieces ?? []).filter((p) => p.folder_id === folder.id).length : items.length;
                return (
                  <section key={key} {...dropProps(key)} className={`mt-3 rounded-xl transition-colors ${dropTarget === key ? 'bg-sky-50 ring-2 ring-inset ring-sky-300' : ''}`}>
                    <div className="group/folder flex items-center gap-1 px-1">
                      <button type="button" onClick={() => toggle(key)} className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1 py-1.5 text-left">
                        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? '' : '-rotate-90'}`} />
                        {folder && index === 0 && folders.length > 1 && <span title="Dossier prioritaire" className="text-amber-500">★</span>}
                        <span className={`truncate text-sm font-semibold ${folder ? 'text-neutral-900' : 'text-neutral-500'}`}>{folder?.name ?? 'Sans dossier'}</span>
                        <span className="shrink-0 text-xs text-neutral-400">{filter && folder ? `${items.length}/${total}` : total}</span>
                      </button>
                      {folder && (
                        <div className="hidden items-center group-hover/folder:flex">
                          <IconButton title="Plus prioritaire" disabled={index === 0} onClick={() => moveFolder(index, -1)}>↑</IconButton>
                          <IconButton title="Moins prioritaire" disabled={index === folders.length - 1} onClick={() => moveFolder(index, 1)}>↓</IconButton>
                          <IconButton title="Renommer" onClick={() => setNaming({ folder })}><PencilIcon className="h-3.5 w-3.5" /></IconButton>
                          <IconButton title="Supprimer le dossier" danger onClick={() => setRemovingFolder(folder)}><TrashIcon /></IconButton>
                        </div>
                      )}
                    </div>
                    {open && (
                      <div className="space-y-0.5 pb-1">
                        {items.map((p) => row(p))}
                        {items.length === 0 && (
                          <p className="px-8 py-2 text-xs text-neutral-400">
                            {filter ? `Aucun morceau « ${difficultyLabels[filter]} » ici.` : 'Vide : glisse un morceau ici, ou choisis ce dossier en modifiant un morceau.'}
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}

              {pieces && (
                <button type="button" onClick={() => setNaming({ folder: null })} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900">
                  <PlusIcon className="h-4 w-4" />Nouveau dossier
                </button>
              )}
              <div className="px-3"><ErrorText>{error}</ErrorText></div>
            </div>
          </>
        )}
      </aside>

      {importing && (
        <ImportModal
          subject={subject}
          folders={folders}
          onClose={() => setImporting(false)}
          onSaved={(id) => {
            setImporting(false);
            load();
            onPick(id);
          }}
        />
      )}
      {editing && (
        <EditModal
          piece={editing}
          folders={folders}
          onClose={() => setEditing(null)}
          onSaved={(meta) => {
            patchPiece(editing, meta);
            setEditing(null);
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
      {naming && (
        <FolderModal
          folder={naming.folder}
          onClose={() => setNaming(null)}
          onSave={async (name) => {
            if (naming.folder) await foldersApi.rename(naming.folder.id, name);
            else await foldersApi.create(subject, name);
            setNaming(null);
            load();
          }}
        />
      )}
      {removingFolder && (
        <ConfirmModal
          title={`Supprimer le dossier « ${removingFolder.name} » ?`}
          message="Ses morceaux ne sont pas supprimés : ils passent dans « Sans dossier »."
          confirmLabel="Supprimer le dossier"
          danger
          onConfirm={async () => {
            await foldersApi.remove(removingFolder.id);
            load();
          }}
          onClose={() => setRemovingFolder(null)}
        />
      )}
    </div>
  );

  function row(p: PieceSummary) {
    const active = current === p.id;
    return (
      <div
        key={p.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(p.id));
          setDragged(p.id);
        }}
        onDragEnd={() => {
          setDragged(null);
          setDropTarget(null);
        }}
        className={`group flex items-center gap-1 rounded-xl pr-1.5 ${active ? 'bg-neutral-100' : 'hover:bg-neutral-50'} ${dragged === p.id ? 'opacity-40' : ''}`}
      >
        <button
          type="button"
          onClick={() => onPick(p.id)}
          onDoubleClick={() => setEditing(p)}
          title={`${sourceLabels[p.source]} · ${p.note_count} notes`}
          className="flex min-w-0 flex-1 items-center gap-3 p-2 text-left"
        >
          <Cover key={p.cover} src={p.cover} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-neutral-900">{p.title}</span>
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-500">
              <span className="truncate">{p.artist ?? <span className="text-neutral-400">Artiste inconnu</span>}</span>
              {p.difficulty && <DifficultyBadge value={p.difficulty} />}
            </span>
          </span>
          <span className="shrink-0 text-xs tabular-nums text-neutral-400 group-hover:hidden">{formatDuration(p.duration)}</span>
        </button>
        <div className="hidden shrink-0 items-center group-hover:flex">
          <IconButton title="Modifier (titre, artiste, dossier, difficulté)" onClick={() => setEditing(p)}><PencilIcon className="h-4 w-4" /></IconButton>
          <IconButton title="Supprimer" danger onClick={() => setRemoving(p)}><TrashIcon /></IconButton>
        </div>
      </div>
    );
  }
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${on ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
    >
      {children}
    </button>
  );
}

function IconButton({ title, onClick, disabled, danger, children }: { title: string; onClick(): void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm text-neutral-400 disabled:opacity-30 disabled:hover:bg-transparent ${
        danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-neutral-200/70 hover:text-neutral-900'
      }`}
    >
      {children}
    </button>
  );
}

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

function EditModal({ piece, folders, onClose, onSaved }: { piece: PieceSummary; folders: PieceFolder[]; onClose(): void; onSaved(meta: PieceMeta & { cover: string | null }): void }) {
  const [title, setTitle] = useState(piece.title);
  const [artist, setArtist] = useState(piece.artist ?? '');
  const [folder, setFolder] = useState(piece.folder_id);
  const [difficulty, setDifficulty] = useState(piece.difficulty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // A Deezer / Apple Music link picks the cover by hand; without one, the
  // cover follows the title and artist being typed.
  const [link, setLink] = useState('');
  const [linking, setLinking] = useState(false);
  const [preview, setPreview] = useState<{ cover: string | null; searching: boolean }>({ cover: piece.cover, searching: false });

  useEffect(() => {
    const l = link.trim();
    const t = title.trim();
    const a = artist.trim() || null;
    if (!l && (!t || (t === piece.title && a === piece.artist))) {
      setPreview({ cover: t ? piece.cover : null, searching: false });
      return;
    }
    setPreview((p) => ({ ...p, searching: true }));
    const abort = new AbortController();
    const timer = setTimeout(() => {
      (l ? piecesApi.coverFromLink(l, abort.signal) : piecesApi.findCover(t, a, abort.signal)).then(
        ({ cover }) => setPreview({ cover, searching: false }),
        () => !abort.signal.aborted && setPreview((p) => ({ ...p, searching: false })),
      );
    }, l ? 200 : 500);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [title, artist, link, piece]);
  const linkCover = link.trim() && !preview.searching ? preview.cover : null;

  const save = async () => {
    const meta: PieceMeta = { title: title.trim(), artist: artist.trim() || null, folder_id: folder, difficulty };
    if (!meta.title) return setError('Le titre ne peut pas être vide.');
    if (link.trim() && !linkCover) return setError('Ce lien ne donne pas de pochette : colle le lien d’un morceau, d’un album ou d’un artiste Deezer ou Apple Music.');
    setSaving(true);
    try {
      const { cover } = await piecesApi.update(piece.id, linkCover ? { ...meta, cover: linkCover } : meta);
      onSaved({ ...meta, cover });
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Modifier le morceau"
      onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>Annuler</button>
          <button type="submit" form="piece-edit" disabled={saving} className={primaryButton}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}
    >
      <form
        id="piece-edit"
        className="space-y-4"
        // Keep typing out of the piano shortcuts.
        onKeyDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="flex gap-4">
          <div className="w-24 shrink-0 text-center">
            <div className={`transition-opacity ${preview.searching ? 'opacity-40' : ''}`}>
              <Cover key={preview.cover} src={preview.cover} size="lg" />
            </div>
            {link.trim() && !preview.searching && !preview.cover ? (
              <p className="mt-1.5 text-[11px] leading-tight text-red-600">Lien non reconnu</p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (linking) setLink('');
                  setLinking(!linking);
                }}
                className="mt-1.5 text-[11px] text-neutral-400 underline-offset-2 hover:text-neutral-900 hover:underline"
              >
                {linking ? 'Annuler' : 'Changer'}
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <Field label="Titre">
              <input autoFocus value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Artiste">
              <input value={artist} maxLength={120} placeholder="Facultatif" onChange={(e) => setArtist(e.target.value)} className={inputClass} />
            </Field>
          </div>
        </div>
        {linking && (
          <input
            autoFocus
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Lien Deezer ou Apple Music du morceau, de l’album ou de l’artiste"
            inputMode="url"
            aria-label="Lien de la pochette"
            className={inputClass}
          />
        )}
        <Field label="Dossier">
          <FolderSelect folders={folders} value={folder} onChange={setFolder} />
        </Field>
        <Field label="Difficulté">
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        </Field>
        <ErrorText>{error}</ErrorText>
      </form>
    </Modal>
  );
}

function FolderModal({ folder, onClose, onSave }: { folder: PieceFolder | null; onClose(): void; onSave(name: string): Promise<void> }) {
  const [name, setName] = useState(folder?.name ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      title={folder ? 'Renommer le dossier' : 'Nouveau dossier'}
      subtitle={folder ? undefined : 'Par exemple « À apprendre en priorité » ou « Plus tard ». L’ordre se change avec ↑ ↓.'}
      onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>Annuler</button>
          <button type="submit" form="folder-name" disabled={saving || !name.trim()} className={primaryButton}>{folder ? 'Renommer' : 'Créer'}</button>
        </>
      )}
    >
      <form
        id="folder-name"
        onKeyDown={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setSaving(true);
          try {
            await onSave(name.trim());
          } catch (err) {
            setError((err as Error).message);
            setSaving(false);
          }
        }}
      >
        <Field label="Nom">
          <input autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <ErrorText>{error}</ErrorText>
      </form>
    </Modal>
  );
}
