import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Icon } from '../../../components/ui/Icon';
import { invitationsApi } from '../../../api/invitations.api';
import {
  INVITATION_ROLES,
  ROLE_LABELS,
  ROLE_BADGE_VARIANTS,
  ROLE_ICONS,
  ROLE_DESCRIPTIONS,
} from '../../../constants/roles';

export function InviteMemberModal({
  isOpen,
  onClose,
  circleId,
  onSuccess,
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(INVITATION_ROLES[1] || 'FAMILY_MEMBER'); // Default to FAMILY_MEMBER
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Success state with generated invitation link
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setEmail('');
    setRole('FAMILY_MEMBER');
    setError('');
    setCreatedInvite(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !circleId || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const result = await invitationsApi.createInvitation(circleId, {
        email: email.trim().toLowerCase(),
        role,
      });

      setCreatedInvite(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      if (err.code === 'MEMBERSHIP_ALREADY_EXISTS') {
        setError('A user with this email address is already an active member of this Care Circle.');
      } else {
        setError(err.message || 'Failed to create invitation.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inviteLink = createdInvite?.token
    ? `${window.location.origin}/invite/${createdInvite.token}`
    : '';

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      setCopied(true);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdInvite ? 'Invitation Created!' : 'Invite Care Circle Member'}
      description={
        createdInvite
          ? 'Share the single-use invitation link with your family member, doctor, or nurse.'
          : 'Send a role-specific invitation to collaborate in your family Care Circle.'
      }
      maxWidth="max-w-lg"
    >
      {createdInvite ? (
        /* Success Link Card */
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl bg-success-container/20 border border-success/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-success font-bold text-sm">
                <Icon name="check_circle" size={20} />
                <span>Invitation Ready</span>
              </div>
              <Badge variant={ROLE_BADGE_VARIANTS[createdInvite.invitation?.role]} size="sm">
                {ROLE_LABELS[createdInvite.invitation?.role]}
              </Badge>
            </div>

            <p className="text-xs text-on-surface leading-relaxed">
              An invitation for <strong>{createdInvite.invitation?.email}</strong> has been generated with role <strong>{ROLE_LABELS[createdInvite.invitation?.role]}</strong>.
            </p>

            {/* Copyable Link Box */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-outline block">
                Shareable Invitation Link
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-transparent text-xs text-on-surface font-mono outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0 ${
                    copied
                      ? 'bg-success text-on-success'
                      : 'bg-primary text-on-primary hover:bg-primary/90'
                  }`}
                >
                  <Icon name={copied ? 'check' : 'content_copy'} size={14} />
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <span className="text-[11px] text-outline block pt-1">
              Expires on {new Date(createdInvite.expiresAt).toLocaleDateString()} (48 hours).
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="surface"
              size="md"
              onClick={() => {
                resetForm();
              }}
            >
              Invite Another Member
            </Button>
            <Button variant="primary" size="md" onClick={handleClose} className="font-bold">
              Done
            </Button>
          </div>
        </div>
      ) : (
        /* Invite Form */
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-error-container/30 border border-error/30 text-error text-xs flex items-center gap-2">
              <Icon name="error" size={16} />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Invitee Email Address"
            type="email"
            placeholder="e.g. family.member@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon="mail"
            required
          />

          <div>
            <Select
              label="Circle Role to Assign"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={INVITATION_ROLES.map((r) => ({
                value: r,
                label: ROLE_LABELS[r] || r,
              }))}
            />

            {/* Dynamic Role Capability Card */}
            <div className="mt-2.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-on-surface">
                <Icon name={ROLE_ICONS[role] || 'verified_user'} size={16} className="text-primary" />
                <span>{ROLE_LABELS[role]} Permissions:</span>
              </div>
              <p className="text-on-surface-variant leading-relaxed">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-end gap-3">
            <Button variant="surface" size="md" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>

            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isSubmitting}
              className="font-bold shadow-sm"
            >
              {isSubmitting ? 'Generating Invite...' : 'Create Invitation Link'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
