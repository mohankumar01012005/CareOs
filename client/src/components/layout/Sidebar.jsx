import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useCareCircle } from '../../hooks/useCareCircle';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';
import { ROLE_LABELS } from '../../constants/roles';

export function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const {
    memberships,
    activeCircleId,
    activeCircle,
    activeRecipient,
    activeRole,
    selectCircle,
  } = useCareCircle();

  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);

  const recipientName = activeRecipient?.fullName || activeCircle?.name || 'Care Recipient';
  const recipientAge = activeRecipient?.dateOfBirth
    ? `${new Date().getFullYear() - new Date(activeRecipient.dateOfBirth).getFullYear()} yrs`
    : 'Active';

  const navItems = [
    { label: 'Home / Dashboard', path: '/dashboard', icon: 'grid_view' },
    { label: 'Tasks', path: '/tasks', icon: 'check_box' },
    { label: 'Medicines', path: '/medicines', icon: 'medication' },
    { label: 'Health & Vitals', path: '/health', icon: 'vital_signs' },
    { label: 'Care Notes', path: '/notes', icon: 'edit_note' },
    { label: 'Documents', path: '/documents', icon: 'description' },
    { label: 'Care Circle', path: '/circle', icon: 'diversity_1' },
  ];

  const systemItems = [
    { label: 'Notifications', path: '/notifications', icon: 'notifications' },
    { label: 'Settings & Profile', path: '/settings', icon: 'settings' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-outline-variant/30 z-50 flex flex-col justify-between py-4 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="px-5 pt-1 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-lg shadow-sm">
                <Icon name="health_and_safety" size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl font-bold text-primary tracking-tight leading-none">
                  CareOS
                </span>
                <span className="text-xs font-semibold text-on-surface-variant">
                  Family Health
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold">
              v1.0
            </span>
          </div>

          {/* Active Recipient Switcher Card */}
          <div className="px-4 my-2 relative">
            <div
              onClick={() => setShowRecipientDropdown((prev) => !prev)}
              className="bg-surface-container-low hover:bg-surface-container rounded-xl p-2.5 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-outline-variant/30 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  name={recipientName}
                  src={activeRecipient?.profilePhoto}
                  size="sm"
                  status="stable"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-on-surface truncate leading-tight">
                    {recipientName}
                  </span>
                  <span className="text-xs text-on-surface-variant truncate">
                    {recipientAge} • {ROLE_LABELS[activeRole] || 'Member'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <Icon name={showRecipientDropdown ? 'expand_less' : 'unfold_more'} size={18} />
              </button>
            </div>

            {/* Recipient / Circle Dropdown */}
            {showRecipientDropdown && (
              <div className="absolute left-4 right-4 top-full mt-1.5 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/50 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-outline">
                  Your Care Circles
                </div>
                {memberships.map((m) => {
                  const circle = m.careCircle;
                  const circleId = circle?._id || circle?.id || circle;
                  const cRecipient = circle?.careRecipient;
                  const cName = cRecipient?.fullName || circle?.name || 'Care Circle';
                  const isCurrent = circleId === activeCircleId;

                  return (
                    <button
                      key={circleId}
                      type="button"
                      onClick={() => {
                        selectCircle(circleId);
                        setShowRecipientDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors ${
                        isCurrent
                          ? 'bg-primary-container/20 text-primary font-bold'
                          : 'hover:bg-surface-container-low text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Avatar name={cName} size="sm" />
                        <span className="truncate">{cName}</span>
                      </div>
                      {isCurrent && <Icon name="check" size={16} className="text-primary" />}
                    </button>
                  );
                })}
                <div className="border-t border-outline-variant/30 my-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecipientDropdown(false);
                      navigate('/onboarding/create-circle');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-primary font-semibold hover:bg-surface-container-low flex items-center gap-1.5"
                  >
                    <Icon name="add_circle" size={16} />
                    <span>+ New Care Circle</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto px-4 space-y-1 mt-1">
            <div className="px-2 pt-2 pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                Overview
              </span>
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`
                }
              >
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* System Items & Emergency SOS */}
        <div className="flex flex-col gap-1 px-4 pt-2 border-t border-outline-variant/20">
          <div className="px-2 pb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
              System
            </span>
          </div>
          <nav className="space-y-1">
            {systemItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`
                }
              >
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Emergency SOS Button */}
          <div className="mt-2 pt-1">
            <button
              type="button"
              onClick={() => setShowSosModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-all font-bold text-sm shadow-sm cursor-pointer active:scale-[0.98]"
            >
              <Icon name="sos" size={20} />
              <span>Emergency SOS</span>
            </button>
          </div>
        </div>
      </aside>

      {/* SOS Modal Dialog */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-error/30 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-error-container text-error flex items-center justify-center mx-auto mb-3">
              <Icon name="emergency" size={36} />
            </div>
            <h3 className="font-serif text-2xl font-bold text-on-surface">
              Emergency Assistance
            </h3>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
              If {recipientName} requires immediate medical attention, call national emergency services or their emergency contact.
            </p>

            {activeRecipient?.emergencyContact?.phone && (
              <div className="my-4 p-3 bg-error-container/30 border border-error/20 rounded-xl text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-error">
                  Emergency Contact ({activeRecipient.emergencyContact.relationship || 'Primary'})
                </div>
                <div className="text-base font-bold text-on-surface mt-0.5">
                  {activeRecipient.emergencyContact.name}
                </div>
                <a
                  href={`tel:${activeRecipient.emergencyContact.phone}`}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline mt-1"
                >
                  <Icon name="call" size={16} />
                  <span>{activeRecipient.emergencyContact.phone}</span>
                </a>
              </div>
            )}

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                Close
              </button>
              <a
                href="tel:911"
                className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-error text-on-error hover:bg-error/90 transition-colors flex items-center justify-center gap-1"
              >
                <Icon name="call" size={18} />
                <span>Call 911 / 112</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
