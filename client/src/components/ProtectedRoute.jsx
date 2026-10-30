import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Spinner } from './Spinner';

export const ProtectedRoute = ({ children }) => {
  const { status, user, token } = useAuthStore();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <Spinner size="lg" />
        <span className="text-sm font-heading font-semibold text-navy/60 mt-3">
          Loading HAPPY DROP...
        </span>
      </div>
    );
  }

  if (!token && status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
