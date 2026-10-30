import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Home, HelpCircle } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12 text-center">
      <div className="w-20 h-20 rounded-3xl bg-pink-100 flex items-center justify-center text-coral-pink mb-4">
        <HelpCircle className="w-10 h-10" />
      </div>
      <h1 className="text-6xl font-heading font-black text-navy mb-2">404</h1>
      <h2 className="text-2xl font-heading font-bold text-navy mb-2">Oops! Drop Spilled</h2>
      <p className="text-sm text-navy/60 max-w-sm mb-6">
        We couldn't find the page you were looking for. Let's guide you back home.
      </p>
      <Link to="/">
        <Button variant="primary">
          <Home className="w-4 h-4 mr-2" /> Back to Home
        </Button>
      </Link>
    </div>
  );
};
