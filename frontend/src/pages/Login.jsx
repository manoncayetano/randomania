import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export default function Login() {
  const { login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(identifiant.trim(), motDePasse);
      const destination = location.state?.from || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Identifiant ou mot de passe incorrect.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-8">
      <h1 className="text-2xl font-medium text-gray-900">Connexion</h1>
      <p className="mt-1 text-sm text-gray-500">Accès réservé aux comptes autorisés.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Identifiant
          <input
            type="text"
            autoComplete="username"
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Mot de passe
          <input
            type="password"
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            required
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
