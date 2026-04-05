import React, { useEffect, useState } from 'react';
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
  const [profileTimeout, setProfileTimeout] = useState(false);

  // If profile takes more than 3 seconds, stop waiting
  useEffect(() => {
    if (user && !profile && !isLoading) {
      const timer = setTimeout(() => setProfileTimeout(true), 3000);
      return () => clearTimeout(timer);
    }
    if (profile) setProfileTimeout(false);
  }, [user, profile, isLoading]);

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

  // Wait for profile briefly, but don't block forever
  if (!profile && !profileTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-fest-gold" size={48} />
      </div>
    );
  }

  if (allowedRoles && profile) {
    if (!allowedRoles.includes(profile.role)) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
}
