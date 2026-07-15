import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { countParcours, listAmeliorations, listProjets } from '../api/client';
import { useUser } from '../context/UserContext';
import heroImg from '../assets/lac-de-la-douche-visorando-535442.jpg';

function MontagneHero({ prenom }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gray-200 bg-cover bg-center"
      style={{ height: '20rem', backgroundImage: `url(${heroImg})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      <div className="relative flex h-full flex-col items-start justify-end p-6 sm:p-8">
        <h1 className="text-2xl font-medium text-white drop-shadow sm:text-3xl">
          {prenom ? `Bienvenue, ${prenom}` : 'Bienvenue'}
        </h1>
        <p className="mt-1 max-w-md text-sm text-white/90 drop-shadow sm:text-base">
          Retrouve tes randonnées, prépare tes prochains projets et laisse-toi inspirer pour la suite.
        </p>
      </div>
    </div>
  );
}

function StatCard({ to, valeur, label }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-gray-200 bg-white p-5 text-center transition hover:border-[var(--color-accent)] hover:shadow-md"
    >
      <div className="text-3xl font-medium text-[var(--color-accent-dark)]">{valeur ?? '…'}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </Link>
  );
}

export default function Home() {
  const { utilisateur } = useUser();
  const [nbRandos, setNbRandos] = useState(null);
  const [nbProjets, setNbProjets] = useState(null);
  const [nbAmeliorations, setNbAmeliorations] = useState(null);

  useEffect(() => {
    countParcours({}).then(setNbRandos).catch(() => setNbRandos(null));
    listProjets().then((l) => setNbProjets(l.length)).catch(() => setNbProjets(null));
    listAmeliorations().then((l) => setNbAmeliorations(l.length)).catch(() => setNbAmeliorations(null));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <MontagneHero prenom={utilisateur} />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard to="/recherche" valeur={nbRandos} label="Randonnées" />
        <StatCard to="/projets" valeur={nbProjets} label="Projets" />
        <StatCard to="/ameliorations" valeur={nbAmeliorations} label="Demandes d'amélioration à traiter" />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3 text-center">
        <Link
          to="/recherche"
          className="inline-block rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-dark)]"
        >
          Rechercher un parcours
        </Link>
        <Link
          to="/importer"
          className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-[var(--color-accent)]"
        >
          Importer une rando
        </Link>
      </div>
    </div>
  );
}
