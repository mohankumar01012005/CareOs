import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Icon } from '../../../components/ui/Icon';
import {
  ALL_ROLES,
  ROLE_LABELS,
  ROLE_BADGE_VARIANTS,
  ROLE_ICONS,
  ROLE_DESCRIPTIONS,
} from '../../../constants/roles';

export function RoleCapabilitiesCard() {
  return (
    <Card variant="lowest" padding="md" className="space-y-4 border border-outline-variant/30">
      <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
        <Icon name="admin_panel_settings" size={20} className="text-primary" />
        <h4 className="font-serif text-base font-bold text-on-surface">
          CareOS Circle Roles & Permissions Guide
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {ALL_ROLES.map((role) => (
          <div
            key={role}
            className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-on-surface">
                <Icon name={ROLE_ICONS[role] || 'person'} size={16} className="text-primary" />
                <span>{ROLE_LABELS[role]}</span>
              </div>
              <Badge variant={ROLE_BADGE_VARIANTS[role] || 'primary'} size="sm">
                {role}
              </Badge>
            </div>
            <p className="text-on-surface-variant leading-relaxed">
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
