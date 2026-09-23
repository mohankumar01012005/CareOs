import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  ROLE_LABELS,
  ROLE_BADGE_VARIANTS,
  INVITATION_STATUS_BADGE_VARIANTS,
  INVITATION_STATUS_LABELS,
} from '../../../constants/roles';

export function PendingInvitationsList({
  invitations = [],
  onRevoke,
  isRevokingId,
}) {
  if (invitations.length === 0) {
    return (
      <EmptyState
        icon="outgoing_mail"
        title="No Pending Invitations"
        description="You have not sent any pending invitations for this Care Circle. Click '+ Invite Member' to add family members or medical caregivers."
      />
    );
  }

  return (
    <div className="space-y-3">
      {invitations.map((inv) => {
        const invId = inv.id || inv._id;
        const isPending = inv.status === 'PENDING';
        const isExpired =
          inv.status === 'EXPIRED' ||
          (isPending && inv.expiresAt && new Date() > new Date(inv.expiresAt));

        const effectiveStatus = isExpired ? 'EXPIRED' : inv.status;
        const statusBadgeVariant =
          INVITATION_STATUS_BADGE_VARIANTS[effectiveStatus] || 'neutral';
        const statusLabel =
          INVITATION_STATUS_LABELS[effectiveStatus] || effectiveStatus;

        const createdDateFormatted = inv.createdAt
          ? new Date(inv.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '';

        const expiresDateFormatted = inv.expiresAt
          ? new Date(inv.expiresAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })
          : '';

        return (
          <Card
            key={invId}
            variant="lowest"
            padding="md"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-outline-variant/40"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0 mt-0.5 text-primary">
                <Icon name="mail" size={20} />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif text-sm font-bold text-on-surface truncate">
                    {inv.email}
                  </span>
                  <Badge variant={ROLE_BADGE_VARIANTS[inv.role] || 'primary'} size="sm">
                    {ROLE_LABELS[inv.role] || inv.role}
                  </Badge>
                </div>

                <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {createdDateFormatted && (
                    <span>Sent: <strong>{createdDateFormatted}</strong></span>
                  )}
                  {expiresDateFormatted && (
                    <>
                      <span>•</span>
                      <span>Expires: <strong>{expiresDateFormatted}</strong></span>
                    </>
                  )}
                  {inv.invitedBy?.name && (
                    <>
                      <span>•</span>
                      <span>By: {inv.invitedBy.name}</span>
                    </>
                  )}
                  {inv.acceptedBy?.name && (
                    <>
                      <span>•</span>
                      <span className="text-success font-semibold">
                        Accepted by: {inv.acceptedBy.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Badge variant={statusBadgeVariant} size="sm">
                {statusLabel}
              </Badge>

              {isPending && !isExpired && (
                <Button
                  variant="surface"
                  size="sm"
                  onClick={() => onRevoke(invId)}
                  disabled={isRevokingId === invId}
                  className="text-error hover:bg-error-container/20 text-xs font-semibold"
                >
                  {isRevokingId === invId ? 'Revoking...' : 'Revoke'}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
