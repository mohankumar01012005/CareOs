import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background ambient natural light shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-secondary-fixed/25 blur-3xl pointer-events-none" />

      {/* Header / Brand */}
      <header className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-xl shadow-sm">
            <Icon name="health_and_safety" size={22} />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-bold text-primary tracking-tight leading-none">
              CareOS
            </span>
            <span className="text-xs font-semibold text-on-surface-variant">
              Family Health & Coordination
            </span>
          </div>
        </Link>
      </header>

      {/* Main Form Container */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto text-center py-4">
        <p className="text-xs text-on-surface-variant/80">
          CareOS is designed for families, caregivers, and doctors to coordinate elderly care with clarity and compassion.
        </p>
      </footer>
    </div>
  );
}
