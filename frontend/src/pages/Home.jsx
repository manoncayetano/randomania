import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { countParcours, listAmeliorations, listProjets } from '../api/client';
import { useUser } from '../context/UserContext';

function MontagneHero({ prenom }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200" style={{ height: '20rem' }}>
      <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bfe3f0" />
            <stop offset="60%" stopColor="#eaf3e6" />
            <stop offset="100%" stopColor="#fbe4d8" />
          </linearGradient>
        </defs>
        <rect width="1200" height="400" fill="url(#ciel)" />
        <circle cx="970" cy="90" r="46" fill="#ffe9b8" opacity="0.9" />

        <path d="M0,230 L150,120 L260,210 L400,90 L520,220 L650,140 L760,230 L900,110 L1030,215 L1200,150 L1200,400 L0,400 Z" fill="#9fb8c9" opacity="0.55" />
        <path d="M0,290 L120,200 L230,270 L380,170 L500,280 L640,190 L780,285 L940,180 L1080,270 L1200,210 L1200,400 L0,400 Z" fill="#6f9a7c" opacity="0.75" />
        <path d="M0,340 L140,260 L280,330 L430,240 L580,335 L720,255 L880,335 L1040,250 L1200,320 L1200,400 L0,400 Z" fill="#365c46" />

        <path d="M0,400 L0,365 Q150,330 300,365 T600,365 T900,365 T1200,360 L1200,400 Z" fill="#1d9e75" />

        {[
          { x: 90, y: 372, c: '#e87ba4' },
          { x: 160, y: 385, c: '#eda100' },
          { x: 260, y: 378, c: '#4a3aa7' },
          { x: 340, y: 388, c: '#e87ba4' },
          { x: 470, y: 375, c: '#eda100' },
          { x: 600, y: 386, c: '#e34948' },
          { x: 730, y: 376, c: '#4a3aa7' },
          { x: 860, y: 388, c: '#eda100' },
          { x: 980, y: 378, c: '#e87ba4' },
          { x: 1100, y: 386, c: '#e34948' },
        ].map((f, i) => (
          <g key={i} transform={`translate(${f.x}, ${f.y})`}>
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse
                key={angle}
                cx={0}
                cy={-4}
                rx="2.6"
                ry="4.2"
                fill={f.c}
                transform={`rotate(${angle})`}
              />
            ))}
            <circle r="2" fill="#fff6d6" />
          </g>
        ))}
      </svg>

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
