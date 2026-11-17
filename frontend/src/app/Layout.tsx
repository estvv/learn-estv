import { Link, NavLink, Outlet } from 'react-router';
import { Avatar } from '../components/Avatar';
import { GearIcon, LogoutIcon } from '../components/icons';
import { useAuth } from './auth';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
    isActive ? 'text-neutral-900 bg-neutral-100' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
  }`;

const iconButton = 'p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 transition-colors';

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link to="/" className="mr-3 shrink-0 font-bold text-neutral-900">Learn</Link>
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
            <NavLink to="/" end className={navClass}>Sujets</NavLink>
            {user?.is_admin && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
          </nav>
          <div className="flex-1" />
          <div className="flex shrink-0 items-center gap-1">
            <NavLink
              to="/reglages"
              title="Réglages"
              aria-label="Réglages"
              className={({ isActive }) => `${iconButton} ${isActive ? 'bg-neutral-100 text-neutral-900' : ''}`}
            >
              <GearIcon className="h-4.5 w-4.5" />
            </NavLink>
            {user ? (
              <>
                <NavLink
                  to="/compte"
                  title="Mon compte"
                  className={({ isActive }) => `flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors md:pr-3 ${isActive ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
                >
                  <Avatar url={user.avatar_url} name={user.display_name} size="xs" />
                  <span className="hidden text-sm font-medium text-neutral-700 md:inline">{user.display_name}</span>
                </NavLink>
                <button type="button" onClick={() => void logout()} title="Déconnexion" aria-label="Déconnexion" className={iconButton}>
                  <LogoutIcon className="h-4.5 w-4.5" />
                </button>
              </>
            ) : (
              <Link to="/connexion" className="ml-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
                Connexion
              </Link>
            )}
          </div>
        </div>
      </header>
      {!user && (
        <div className="border-b border-neutral-200 bg-white/60 px-4 py-1.5 text-center text-xs text-neutral-500">
          Mode invité : tout est accessible, ta progression reste dans ce navigateur.
        </div>
      )}
      <Outlet />
    </div>
  );
}
