import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { Icon } from '../../../components/ui/Icon';
import {
  ROLE_LABELS,
  ROLE_BADGE_VARIANTS,
  ROLE_ICONS,
  ROLE_DESCRIPTIONS,
} from '../../../constants/roles';

export function MemberCard({ member, isCurrentUser }) {
  const user = member.user || {};
  const name = user.name || 'Circle Member';
  const role = member.role;
  const roleLabel = ROLE_LABELS[role] || role;
  const roleBadge = ROLE_BADGE_VARIANTS[role] || 'primary';
  const roleIcon = ROLE_ICONS[role] || 'person';

  const joinedDateFormatted = member.joinedAt
    ? new Date(member.joinedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active';

  return (
    <Card
      variant="lowest"
      padding="md"
      className={`relative flex flex-col justify-between border transition-all duration-200 ${
        isCurrentUser
          ? 'border-primary/40 bg-primary-container/5 shadow-xs'
          : 'border-outline-variant/40 hover:border-primary/30 hover:shadow-xs'
      }`}
    >
      <div className="space-y-3.5">
        {/* Top Header: Avatar, Name, and Role Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={name} src={user.profilePhoto} size="md" status="stable" />

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-serif text-base font-bold text-on-surface truncate">
                  {name}
                </span>
                {isCurrentUser && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-on-primary shrink-0">
                    You
                  </span>
                )}
              </div>

              {user.email && (
                <span className="text-xs text-on-surface-variant truncate mt-0.5">
                  {user.email}
                </span>
              )}
            </div>
          </div>

          <Badge variant={roleBadge} size="sm" icon={roleIcon}>
            {roleLabel}
          </Badge>
        </div>

        {/* Role Capability Description */}
        <div className="p-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface-variant leading-relaxed">
          {ROLE_DESCRIPTIONS[role] || 'Active member contributing to family care coordination.'}
        </div>

        {/* Contact Info Details */}
        <div className="space-y-1 text-xs text-on-surface-variant pt-1 border-t border-outline-variant/20">
          {user.phone && (
            <div className="flex items-center gap-1.5">
              <Icon name="call" size={14} className="text-outline" />
              <a
                href={`tel:${user.phone}`}
                className="text-primary font-semibold hover:underline"
              >
                {user.phone}
              </a>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-outline">
            <Icon name="calendar_today" size={13} />
            <span>Joined on {joinedDateFormatted}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
