import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlayPage } from './PlayPage';
import levelsData from '../dev/levels.json';
import { AlertTriangle } from 'lucide-react';

export const DevLevelPage = () => {
  const { id } = useParams();
  const levelId = parseInt(id, 10);
  const foundLevel = levelsData.find((l) => l.id === levelId);

  if (!foundLevel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-sunny-yellow mb-3" />
        <h2 className="text-xl font-heading font-black text-navy mb-2">Dev Level #{id} Not Found</h2>
        <p className="text-xs text-navy/70 mb-4">
          Available local dev levels: {levelsData.map((l) => `#${l.id}`).join(', ')}
        </p>
        <Link
          to={`/dev/level/${levelsData[0]?.id || 1}`}
          className="text-xs font-bold text-sky-blue underline"
        >
          Load Level #{levelsData[0]?.id || 1}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Dev Mode Banner */}
      <div className="bg-purple-600 text-white text-[11px] font-heading font-bold text-center py-1 tracking-wider uppercase flex items-center justify-center gap-2">
        <span>DEV-ONLY OFFLINE MODE &bull; LEVEL #{foundLevel.id}: {foundLevel.name}</span>
      </div>

      <PlayPage customLevel={foundLevel} />
    </div>
  );
};
