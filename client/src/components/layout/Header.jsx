import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCareCircle } from '../../hooks/useCareCircle';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { ROLE_LABELS, ROLE_BADGE_VARIANTS } from '../../constants/roles';

export function Header({ onMenuToggle }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { activeRole, activeCircle } = useCareCircle();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const todayString = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 flex items-center justify-between px-4 sm:px-8 transition-all">
      {/* Left side: Mobile menu toggle + Date & Family Sync */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-xl text-on-surface-variant hover:bg-surface-container lg:hidden"
          aria-label="Toggle Navigation Menu"
        >
          <Icon name="menu" size={24} />
        </button>

        {/* Date Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-on-surface">
          <Icon name="today" size={18} className="text-outline" />
          <span className="text-xs sm:text-sm font-semibold tracking-tight">
            Today, {todayString}
          </span>
        </div>

        <div className="hidden md:block h-4 w-px bg-surface-container-highest" />

        {/* Circle / Recipient Status */}
        {activeCircle && (
          <div className="hidden lg:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-on-surface-variant">
              Active Circle: <strong className="text-on-surface font-semibold">{activeCircle.name}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Right side: Quick Action Buttons + User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Actions (Desktop) */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="h-9 px-3 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <Icon name="note_add" size={16} />
            <span>Log Note</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/medicines')}
            className="h-9 px-3 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <Icon name="vaccines" size={16} />
            <span>Log Dose</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="h-9 px-3.5 rounded-xl bg-primary text-on-primary hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
          >
            <Icon name="add" size={16} />
            <span>+ Quick Task</span>
          </button>
        </div>

        {/* User Profile Trigger & Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-surface-container transition-colors"
          >
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-on-surface leading-tight">
                {user?.name || 'User'}
              </span>
              <span className="text-[11px] text-on-surface-variant">
                {ROLE_LABELS[activeRole] || 'Member'}
              </span>
            </div>
            <Avatar name={user?.name || 'User'} src={user?.profilePhoto} size="sm" />
          </button>

          {/* User Menu Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/40 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-outline-variant/30">
                <p className="text-xs font-bold text-on-surface truncate">{user?.name}</p>
                <p className="text-[11px] text-on-surface-variant truncate">{user?.email}</p>
                {activeRole && (
                  <div className="mt-1.5">
                    <Badge
                      variant={ROLE_BADGE_VARIANTS[activeRole] || 'neutral'}
                      size="sm"
                    >
                      {ROLE_LABELS[activeRole] || activeRole}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors"
                >
                  <Icon name="settings" size={16} className="text-outline" />
                  <span>Settings & Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/circle');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors"
                >
                  <Icon name="diversity_1" size={16} className="text-outline" />
                  <span>Care Circle Members</span>
                </button>
              </div>

              <div className="border-t border-outline-variant/30 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-error hover:bg-error-container/20 flex items-center gap-2.5 transition-colors"
                >
                  <Icon name="logout" size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
