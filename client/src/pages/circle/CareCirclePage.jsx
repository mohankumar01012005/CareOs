import React, { useState, useEffect, useCallback } from 'react';
import { useCareCircle } from '../../hooks/useCareCircle';
import { useAuth } from '../../hooks/useAuth';
import { careCircleApi } from '../../api/careCircle.api';
import { invitationsApi } from '../../api/invitations.api';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { canInviteMembers, isMainCaretaker, ROLE_LABELS } from '../../constants/roles';

// Subcomponents
import { MemberCard } from './components/MemberCard';
import { InviteMemberModal } from './components/InviteMemberModal';
import { PendingInvitationsList } from './components/PendingInvitationsList';
import { RoleCapabilitiesCard } from './components/RoleCapabilitiesCard';

export function CareCirclePage() {
  const { user } = useAuth();
  const {
    activeCircleId,
    activeCircle,
    activeRecipient,
    activeRole,
    isLoading: isCircleLoading,
  } = useCareCircle();

  const isMain = isMainCaretaker(activeRole);
  const canInvite = canInviteMembers(activeRole);

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'invitations' | 'roles'
  const [circleDetails, setCircleDetails] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRevokingId, setIsRevokingId] = useState(null);
  const [bannerMessage, setBannerMessage] = useState(null);

  const showBanner = (message, type = 'success') => {
    setBannerMessage({ message, type });
    setTimeout(() => {
      setBannerMessage(null);
    }, 4000);
  };

  const loadData = useCallback(async () => {
    if (!activeCircleId) return;
    setIsLoading(true);
    setError(null);
    try {
      const detailsPromise = careCircleApi.getCareCircleDetails(activeCircleId);
      const invitationsPromise = isMain
        ? invitationsApi.getCircleInvitations(activeCircleId).catch((err) => {
            console.warn('Could not load invitations:', err.message);
            return [];
          })
        : Promise.resolve([]);

      const [detailsRes, invsRes] = await Promise.all([detailsPromise, invitationsPromise]);

      setCircleDetails(detailsRes);
      setInvitations(Array.isArray(invsRes) ? invsRes : []);
    } catch (err) {
      setError(err.message || 'Failed to load Care Circle details.');
    } finally {
      setIsLoading(false);
    }
  }, [activeCircleId, isMain]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRevokeInvitation = async (invitationId) => {
    if (!activeCircleId || isRevokingId) return;
    setIsRevokingId(invitationId);
    try {
      await invitationsApi.revokeInvitation(activeCircleId, invitationId);
      showBanner('Invitation successfully revoked.');
      await loadData();
    } catch (err) {
      showBanner(err.message || 'Failed to revoke invitation.', 'error');
    } finally {
      setIsRevokingId(null);
    }
  };

  const recipientName = activeRecipient?.fullName || activeCircle?.name || 'Care Recipient';
  const members = circleDetails?.members || [];
  const pendingCount = invitations.filter((i) => i.status === 'PENDING').length;

  if (isCircleLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <span className="text-xs text-on-surface-variant font-medium">
          Loading Care Circle information...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Toast Feedback Banner */}
      {bannerMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
            bannerMessage.type === 'success'
              ? 'bg-success-container/30 border-success/30 text-success'
              : 'bg-error-container/30 border-error/30 text-error'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <Icon
              name={bannerMessage.type === 'success' ? 'check_circle' : 'error'}
              size={18}
            />
            <span>{bannerMessage.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-outline hover:text-on-surface"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-6 sm:p-8 shadow-xs border border-outline-variant/30">
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-48 w-48 h-48 rounded-full bg-secondary-fixed/20 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <Icon name="diversity_1" size={16} />
              <span>Care Circle Governance & Members</span>
              <span className="text-outline-variant">•</span>
              <span className="text-on-surface-variant font-medium">CareOS Circle</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-on-surface tracking-tight leading-tight font-bold">
              {recipientName}'s Care Team
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Coordinate between family members, sub-caretakers, visiting doctors, and hired care aides with role-based access.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            {canInvite && (
              <Button
                variant="primary"
                size="md"
                icon="person_add"
                onClick={() => setIsInviteModalOpen(true)}
                className="font-bold shadow-sm"
              >
                Invite Member
              </Button>
            )}
          </div>
        </div>

        {/* Telemetry Pills */}
        <div className="mt-6 pt-5 border-t border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-on-surface font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              <span>
                <strong>{members.length}</strong> Active Circle {members.length === 1 ? 'Member' : 'Members'}
              </span>
            </div>

            {isMain && pendingCount > 0 && (
              <div className="flex items-center gap-1.5 text-primary font-bold px-2 py-0.5 rounded-full bg-primary-container/30">
                <Icon name="outgoing_mail" size={14} />
                <span>{pendingCount} Pending {pendingCount === 1 ? 'Invitation' : 'Invitations'}</span>
              </div>
            )}
          </div>

          <div className="text-on-surface-variant text-[11px]">
            Your Role: <strong className="text-on-surface">{ROLE_LABELS[activeRole] || activeRole}</strong>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'members'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <Icon name="group" size={18} />
            <span>Active Members ({members.length})</span>
          </button>

          {isMain && (
            <button
              type="button"
              onClick={() => setActiveTab('invitations')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'invitations'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <Icon name="outgoing_mail" size={18} />
              <span>Pending Invitations</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest text-primary text-xs font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'roles'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <Icon name="admin_panel_settings" size={18} />
            <span>Roles & Permissions Guide</span>
          </button>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors font-semibold self-end sm:self-center"
        >
          <Icon name="refresh" size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Tab Views */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" />
          <span className="text-xs text-on-surface-variant">Loading circle members...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-error-container/20 border border-error/30 text-center space-y-3">
          <Icon name="error" size={32} className="text-error mx-auto" />
          <h3 className="font-serif text-lg font-bold text-on-surface">
            Could not load Care Circle
          </h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">{error}</p>
          <Button variant="surface" size="sm" onClick={loadData}>
            Try Again
          </Button>
        </div>
      ) : (
        <>
          {/* TAB 1: ACTIVE MEMBERS */}
          {activeTab === 'members' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => {
                const isCurrentUser =
                  member.user?.id === user?.id ||
                  member.user?._id === user?.id ||
                  member.user?.id === user?._id;

                return (
                  <MemberCard
                    key={member.id || member._id}
                    member={member}
                    isCurrentUser={isCurrentUser}
                  />
                );
              })}
            </div>
          )}

          {/* TAB 2: PENDING INVITATIONS (Main Caretaker only) */}
          {activeTab === 'invitations' && isMain && (
            <PendingInvitationsList
              invitations={invitations}
              onRevoke={handleRevokeInvitation}
              isRevokingId={isRevokingId}
            />
          )}

          {/* TAB 3: ROLES & CAPABILITIES GUIDE */}
          {activeTab === 'roles' && <RoleCapabilitiesCard />}
        </>
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <InviteMemberModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          circleId={activeCircleId}
          onSuccess={() => {
            showBanner('Invitation generated successfully.');
            loadData();
          }}
        />
      )}
    </div>
  );
}
