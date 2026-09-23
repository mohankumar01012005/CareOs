import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { Icon } from '../../../components/ui/Icon';
import { careTaskApi } from '../../../api/careTask.api';
import { ROLE_LABELS, ROLE_BADGE_VARIANTS } from '../../../constants/roles';

export function WorkloadView({ circleId }) {
  const [workloadData, setWorkloadData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchWorkload() {
      if (!circleId) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await careTaskApi.getCaregiverWorkload(circleId);
        if (isMounted) {
          setWorkloadData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load caregiver workload distribution.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchWorkload();

    return () => {
      isMounted = false;
    };
  }, [circleId]);

  if (isLoading) {
    return <LoadingSpinner text="Calculating caregiver workload balance..." />;
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2">
        <Icon name="error" size={18} />
        <span>{error}</span>
      </div>
    );
  }

  const { totalActiveTasks = 0, unassignedCount = 0, workload = [] } = workloadData || {};

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="lowest" padding="md" className="border border-outline-variant/30">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">
            Total Active Tasks
          </span>
          <div className="flex items-center justify-between mt-2">
            <span className="font-serif text-3xl font-bold text-on-surface">
              {totalActiveTasks}
            </span>
            <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
              <Icon name="task_alt" size={22} />
            </div>
          </div>
        </Card>

        <Card variant="lowest" padding="md" className="border border-outline-variant/30">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">
            Caregiver Team Members
          </span>
          <div className="flex items-center justify-between mt-2">
            <span className="font-serif text-3xl font-bold text-on-surface">
              {workload.length}
            </span>
            <div className="w-10 h-10 rounded-xl bg-tertiary-container/20 text-tertiary flex items-center justify-center">
              <Icon name="diversity_1" size={22} />
            </div>
          </div>
        </Card>

        <Card variant="lowest" padding="md" className="border border-outline-variant/30">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">
            Shared / Open Tasks
          </span>
          <div className="flex items-center justify-between mt-2">
            <span className="font-serif text-3xl font-bold text-on-surface">
              {unassignedCount}
            </span>
            <div className="w-10 h-10 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
              <Icon name="group_work" size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Workload Distribution Cards */}
      <Card variant="lowest" padding="lg" className="border border-outline-variant/30 space-y-4">
        <div className="pb-3 border-b border-outline-variant/30">
          <h3 className="font-serif text-lg font-bold text-on-surface">
            Caregiver Task Balance
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Real-time telemetry of task allocation across your Care Circle members.
          </p>
        </div>

        <div className="space-y-4">
          {workload.map((member) => {
            const roleLabel = ROLE_LABELS[member.role] || member.role;
            const badgeVariant = ROLE_BADGE_VARIANTS[member.role] || 'neutral';

            return (
              <div
                key={member.userId}
                className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface">
                          {member.name}
                        </span>
                        <Badge variant={badgeVariant} size="sm">
                          {roleLabel}
                        </Badge>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        {member.email}
                      </span>
                    </div>
                  </div>

                  {/* Task counts badge */}
                  <div className="flex items-center gap-3 text-xs font-semibold self-start sm:self-center">
                    <span className="text-on-surface-variant">
                      <strong className="text-on-surface font-bold">{member.pendingTasks}</strong> Pending
                    </span>
                    <span className="text-outline">•</span>
                    <span className="text-on-surface-variant">
                      <strong className="text-primary font-bold">{member.completedTasks}</strong> Done
                    </span>
                    <span className="text-outline">•</span>
                    <span className="text-on-surface-variant">
                      <strong className="text-on-surface font-bold">{member.totalAssigned}</strong> Total
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant mb-1 font-semibold">
                    <span>Share of Total Circle Tasks</span>
                    <span>{member.percentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(member.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
