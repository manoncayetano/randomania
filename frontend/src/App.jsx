import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Recherche from './pages/Recherche';
import FicheParcours from './pages/FicheParcours';
import ImporterRando from './pages/ImporterRando';
import RandosAutour from './pages/RandosAutour';
import Projets from './pages/Projets';
import ProjetDetail from './pages/ProjetDetail';
import Suggestions from './pages/Suggestions';
import Ameliorations from './pages/Ameliorations';
import Login from './pages/Login';
import UserSwitcher from './components/UserSwitcher';
import { useUser } from './context/UserContext';

function AppLayout() {
  const { loading, authenticated } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-400">Chargement...</div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm font-medium text-gray-900">
            Randonnées
          </Link>
          <Link to="/recherche" className="text-sm text-gray-500 hover:text-[var(--color-accent-dark)]">
            Rechercher
          </Link>
          <Link to="/importer" className="text-sm text-gray-500 hover:text-[var(--color-accent-dark)]">
            Importer
          </Link>
          <Link to="/projets" className="text-sm text-gray-500 hover:text-[var(--color-accent-dark)]">
            Mes projets
          </Link>
          <Link to="/suggestions" className="text-sm text-gray-500 hover:text-[var(--color-accent-dark)]">
            Proposer un enchaînement
          </Link>
          <Link to="/ameliorations" className="text-sm text-gray-500 hover:text-[var(--color-accent-dark)]">
            Améliorations
          </Link>
        </div>
        <UserSwitcher />
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recherche" element={<Recherche />} />
        <Route path="/parcours/:id" element={<FicheParcours />} />
        <Route path="/parcours/:id/autour" element={<RandosAutour />} />
        <Route path="/importer" element={<ImporterRando />} />
        <Route path="/projets" element={<Projets />} />
        <Route path="/projets/:id" element={<ProjetDetail />} />
        <Route path="/suggestions" element={<Suggestions />} />
        <Route path="/ameliorations" element={<Ameliorations />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  );
}
