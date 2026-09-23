import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCareCircle } from '../../hooks/useCareCircle';
import { useAuth } from '../../hooks/useAuth';
import { careTaskApi } from '../../api/careTask.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { ROLE_LABELS, ROLE_BADGE_VARIANTS } from '../../constants/roles';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    activeCircleId,
    activeCircle,
    activeRecipient,
    activeRole,
  } = useCareCircle();

  const [todaySummary, setTodaySummary] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTaskSummary() {
      if (!activeCircleId) return;
      try {
        const data = await careTaskApi.getTodayTaskSummary(activeCircleId);
        if (isMounted) {
          setTodaySummary(data?.summary || null);
        }
      } catch (err) {
        console.warn('Could not fetch today task summary for dashboard:', err.message);
      }
    }

    fetchTaskSummary();

    return () => {
      isMounted = false;
    };
  }, [activeCircleId]);


  const recipientName = activeRecipient?.fullName || activeCircle?.name || 'Care Recipient';
  const recipientAge = activeRecipient?.dateOfBirth
    ? `${new Date().getFullYear() - new Date(activeRecipient.dateOfBirth).getFullYear()} yrs`
    : 'Active';

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Editorial Ambient Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-6 sm:p-8 shadow-sm border border-outline-variant/30">
        {/* Subtle natural glow shape */}
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-48 w-48 h-48 rounded-full bg-secondary-fixed/30 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse" />
              <span>Daily Family Care Sync</span>
              <span className="text-outline-variant">•</span>
              <span className="text-on-surface-variant font-medium">Circle Active</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-on-surface tracking-tight leading-tight font-bold">
              Care for {recipientName}
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Keep track of daily medications, routines, health telemetry, and handover notes together.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            <Button
              variant="primary"
              size="md"
              icon="add"
              onClick={() => navigate('/tasks')}
              className="font-bold shadow-sm"
            >
              Add Care Task
            </Button>
            <Button
              variant="surface"
              size="md"
              icon="medication"
              onClick={() => navigate('/medicines')}
            >
              Medications
            </Button>
          </div>
        </div>

        {/* Micro Care Pace Progress */}
        <div className="mt-6 pt-5 border-t border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-tertiary-container/20 text-tertiary flex items-center justify-center shrink-0">
              <Icon name="task_alt" size={22} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface font-bold">
                  Active Care Dashboard
                </span>
                {todaySummary && (
                  <span className="text-xs text-primary font-semibold">
                    • {todaySummary.completedCount}/{todaySummary.totalCount} tasks completed today
                  </span>
                )}
              </div>
              <span className="text-xs text-on-surface-variant">
                Logged in as <strong className="text-on-surface">{user?.name}</strong> ({ROLE_LABELS[activeRole] || activeRole})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md" icon="verified_user">
              Care Circle Active
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Bento Grid: 8 Cols Left / 4 Cols Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center 8 Columns: Quick Slices Overview */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Access Module Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Care Tasks Card (Active Vertical Slice) */}
            <Card
              variant="lowest"
              padding="md"
              className="hover:border-primary transition-all cursor-pointer group shadow-xs hover:shadow-md border-primary/30"
              onClick={() => navigate('/tasks')}
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-tertiary-container/20 text-tertiary flex items-center justify-center group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors">
                  <Icon name="check_box" size={24} />
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="success" size="sm">Active</Badge>
                  <Icon name="arrow_forward" size={18} className="text-outline group-hover:text-tertiary transition-colors" />
                </div>
              </div>

              <h3 className="font-serif text-lg font-bold text-on-surface mt-3">
                Care Tasks & Routines
              </h3>

              {todaySummary ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs text-on-surface-variant font-semibold">
                    <span>
                      {todaySummary.totalCount === 0
                        ? 'No tasks due today'
                        : `${todaySummary.totalCount} tasks scheduled today`}
                    </span>
                    <span>{todaySummary.completionPercentage}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className="h-full bg-tertiary rounded-full transition-all duration-300"
                      style={{ width: `${todaySummary.completionPercentage}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                    <span className="text-primary font-bold">{todaySummary.completedCount} Done</span>
                    <span>•</span>
                    <span className="text-on-surface font-bold">{todaySummary.pendingCount} Pending</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant mt-1">
                  Daily errands, physical therapy, and family assignments.
                </p>
              )}
            </Card>

            {/* Medications Card */}
            <Card
              variant="lowest"
              padding="md"
              className="hover:border-primary/40 transition-colors cursor-pointer group"
              onClick={() => navigate('/medicines')}
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <Icon name="medication" size={24} />
                </div>
                <Icon name="arrow_forward" size={18} className="text-outline group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-serif text-lg font-bold text-on-surface mt-3">
                Medicines & Dose Logs
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Active prescriptions, schedules, and daily dose adherence tracking.
              </p>
            </Card>


            {/* Health & Vitals Card */}
            <Card
              variant="lowest"
              padding="md"
              className="hover:border-primary/40 transition-colors cursor-pointer group"
              onClick={() => navigate('/health')}
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                  <Icon name="vital_signs" size={24} />
                </div>
                <Icon name="arrow_forward" size={18} className="text-outline group-hover:text-secondary transition-colors" />
              </div>
              <h3 className="font-serif text-lg font-bold text-on-surface mt-3">
                Health & Biometrics
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Blood pressure, blood sugar, heart rate, symptoms & Doctor's Brief.
              </p>
            </Card>

            {/* Care Notes Card */}
            <Card
              variant="lowest"
              padding="md"
              className="hover:border-primary/40 transition-colors cursor-pointer group"
              onClick={() => navigate('/notes')}
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
                  <Icon name="edit_note" size={24} />
                </div>
                <Icon name="arrow_forward" size={18} className="text-outline group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-serif text-lg font-bold text-on-surface mt-3">
                Care Notes & Handover
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Shift observations, meals, mood, and family handover notes.
              </p>
            </Card>
          </div>

          {/* Documents & Vault Section */}
          <Card variant="lowest" padding="md">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <Icon name="folder_shared" size={20} className="text-primary" />
                <h3 className="font-serif text-base font-bold text-on-surface">
                  Emergency Vault & Medical Documents
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconRight="arrow_forward"
                onClick={() => navigate('/documents')}
              >
                View Vault
              </Button>
            </div>
            <p className="text-xs text-on-surface-variant mt-3">
              Store insurance cards, hospital records, and DNR/advance directives securely for emergency access.
            </p>
          </Card>
        </div>

        {/* Right 4 Columns: Recipient & Team Dossier */}
        <div className="lg:col-span-4 space-y-6">
          {/* Recipient Profile Card */}
          <Card variant="lowest" padding="md" className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={recipientName}
                src={activeRecipient?.profilePhoto}
                size="lg"
                status="stable"
              />
              <div className="flex flex-col min-w-0">
                <h3 className="font-serif text-xl font-bold text-on-surface truncate">
                  {recipientName}
                </h3>
                <span className="text-xs text-on-surface-variant">
                  {recipientAge} • Blood Group:{' '}
                  <strong className="text-on-surface font-semibold">
                    {activeRecipient?.bloodGroup || 'Unknown'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Conditions & Allergies */}
            <div className="space-y-2.5 pt-2 border-t border-outline-variant/30 text-xs">
              <div>
                <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[11px] block mb-1">
                  Known Conditions:
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeRecipient?.knownConditions?.length > 0 ? (
                    activeRecipient.knownConditions.map((cond, i) => (
                      <Badge key={i} variant="neutral" size="sm">
                        {cond}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-outline">None recorded</span>
                  )}
                </div>
              </div>

              <div>
                <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[11px] block mb-1">
                  Allergies:
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeRecipient?.allergies?.length > 0 ? (
                    activeRecipient.allergies.map((allergy, i) => (
                      <Badge key={i} variant="error" size="sm">
                        {allergy}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-outline">None recorded</span>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            {(activeRecipient?.emergencyContact?.name || activeRecipient?.emergencyContact?.phone) && (
              <div className="pt-2 border-t border-outline-variant/30">
                <div className="p-3 bg-error-container/30 border border-error/20 rounded-xl">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-error">
                    Primary Emergency Contact
                  </div>
                  <div className="text-sm font-bold text-on-surface mt-0.5">
                    {activeRecipient.emergencyContact.name || 'Emergency Contact'}{' '}
                    {activeRecipient.emergencyContact.relationship && (
                      <span className="text-xs font-normal text-on-surface-variant">
                        ({activeRecipient.emergencyContact.relationship})
                      </span>
                    )}
                  </div>
                  {activeRecipient.emergencyContact.phone && (
                    <a
                      href={`tel:${activeRecipient.emergencyContact.phone}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mt-1.5"
                    >
                      <Icon name="call" size={14} />
                      <span>{activeRecipient.emergencyContact.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Care Circle Team */}
          <Card variant="lowest" padding="md">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <h3 className="font-serif text-base font-bold text-on-surface">
                Care Circle Team
              </h3>
              <Button
                variant="ghost"
                size="sm"
                iconRight="arrow_forward"
                onClick={() => navigate('/circle')}
              >
                Manage
              </Button>
            </div>

            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Avatar name={user?.name || 'You'} size="sm" />
                  <div>
                    <span className="font-bold text-on-surface block">
                      {user?.name} (You)
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      {ROLE_LABELS[activeRole] || activeRole}
                    </span>
                  </div>
                </div>
                <Badge variant={ROLE_BADGE_VARIANTS[activeRole] || 'primary'} size="sm">
                  Active
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
