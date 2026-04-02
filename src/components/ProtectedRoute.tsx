import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectPath?: string;
}

export default function ProtectedRoute({ children, allowedRoles, redirectPath = '/login' }: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-fest-gold" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectPath} replace state={{ from: location.pathname }} />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-fest-gold" size={48} />
      </div>
    );
  }

  if (allowedRoles) {
    if (!allowedRoles.includes(profile.role)) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
}
