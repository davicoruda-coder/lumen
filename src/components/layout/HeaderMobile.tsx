import React from 'react';
import { useLocation } from 'react-router-dom';
import { useClinic } from '../../contexts/ClinicContext';

export function HeaderMobile() {
  const { clinicName, clinicLogo } = useClinic();
  const location = useLocation();

  if (location.pathname !== '/visao-geral') {
    return null;
  }

  return (
    <header className="lg:hidden sticky top-0 w-full h-16 bg-bg-card/80 backdrop-blur-md border-b border-border-card z-50 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-3">
        {clinicLogo ? (
          <img src={clinicLogo} alt={clinicName} className="h-10 w-auto object-contain" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
            {clinicName ? clinicName.charAt(0).toUpperCase() : 'C'}
          </div>
        )}
        <h1 className="font-heading font-bold text-text-main text-lg truncate">
          {clinicName}
        </h1>
      </div>
    </header>
  );
}
