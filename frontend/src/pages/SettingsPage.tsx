import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../app/auth';
import { HandColorsField, ThemeField } from '../components/AppearanceFields';
import { ConfirmModal } from '../components/Modal';
import { Section } from '../components/settings';
import { Page, PageHeader, secondaryButton } from '../components/ui';
import { clearGuestProgress, guestStore, type SubjectSummaryProgress } from '../progress/store';
import { toolkits } from '../toolkits';

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const sections = [
    { id: 'general', label: 'Général' },
    ...toolkits.filter((t) => t.Settings).map((t) => ({ id: t.id, label: t.label })),
  ];
  const current = sections.find((s) => s.id === params.get('section')) ?? sections[0];
  const toolkit = toolkits.find((t) => t.id === current.id);

  return (
    <Page width="lg">
      <PageHeader title="Réglages" subtitle="Enregistrés sur cet appareil." />
      <div className="grid items-start gap-6 md:grid-cols-[11rem_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto md:sticky md:top-20 md:flex-col">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setParams(s.id === 'general' ? {} : { section: s.id })}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                s.id === current.id ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {toolkit?.Settings ? (
            <>
              <p className="mb-4 text-sm text-neutral-500">{toolkit.description}</p>
              <toolkit.Settings />
            </>
          ) : (
            <GeneralSettings />
          )}
        </div>
      </div>
    </Page>
  );
}

function GeneralSettings() {
  const { user } = useAuth();
  const [guest, setGuest] = useState<SubjectSummaryProgress[]>([]);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => void guestStore.summary().then(setGuest), []);
  const started = guest.reduce((n, s) => n + s.started, 0);

  return (
    <div className="space-y-6">
      <Section title="Apparence" description="Auto suit le mode sombre de l’appareil. Chaque thème a ses couleurs ; un morceau peut avoir les siennes, dans ses options.">
        <div className="space-y-5">
          <ThemeField />
          <div className="grid gap-5 sm:grid-cols-2">
            <HandColorsField theme="light" label="Mains · thème clair" />
            <HandColorsField theme="dark" label="Mains · thème nuit" />
          </div>
        </div>
      </Section>
      <Section title="Progression">
        {user ? (
          <p className="text-sm text-neutral-600">
            Connecté en tant que <strong>{user.display_name}</strong> : ta progression est sauvegardée sur ton compte et suit tous tes appareils.{' '}
            <Link to="/compte" className="underline">Mon compte</Link>
          </p>
        ) : (
          <p className="text-sm text-neutral-600">
            Mode invité : ta progression reste dans ce navigateur. <Link to="/connexion" className="underline">Se connecter</Link>
          </p>
        )}
      </Section>
      <Section title="Progression invité de ce navigateur" description="Ce qui a été fait ici sans être connecté.">
        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
          {started ? `${started} éléments commencés` : 'Aucune progression enregistrée.'}
          {started > 0 && <button type="button" onClick={() => setConfirming(true)} className={secondaryButton}>Effacer</button>}
        </div>
      </Section>
      {confirming && (
        <ConfirmModal
          title="Effacer la progression invité ?"
          message="Tout ce qui a été fait sans compte dans ce navigateur sera perdu. Ta progression de compte n’est pas touchée."
          confirmLabel="Effacer"
          danger
          onConfirm={() => {
            clearGuestProgress();
            setGuest([]);
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
