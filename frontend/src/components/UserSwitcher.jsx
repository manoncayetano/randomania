import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export default function UserSwitcher() {
  const { utilisateur, logout } = useUser();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm text-gray-500 hover:text-[var(--color-accent-dark)]"
      title="Se déconnecter"
    >
      {utilisateur} (déconnexion)
    </button>
  );
}
