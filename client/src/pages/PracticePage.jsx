import React from 'react';
import { useParams } from 'react-router-dom';
import { PlayPage } from './PlayPage';

export const PracticePage = () => {
  const { seed } = useParams();

  return <PlayPage isPracticeMode={true} key={seed} />;
};
