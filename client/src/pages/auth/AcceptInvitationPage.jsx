import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCareCircle } from '../../hooks/useCareCircle';
import { useToast } from '../../hooks/useToast';
import { invitationsApi } from '../../api/invitations.api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  ROLE_LABELS,
  ROLE_BADGE_VARIANTS,
  ROLE_ICONS,
  ROLE_DESCRIPTIONS,
} from '../../constants/roles';

export function AcceptInvitationPage() {
  const { token: urlToken } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, setSession, logout } = useAuth();
  const { refreshCircles, selectCircle } = useCareCircle();
  const toast = useToast();

  const [tokenInput, setTokenInput] = useState(urlToken || '');
  const [invitationData, setInvitationData] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');

  // Register form fields for new user onboarding
  const [registerForm, setRegisterForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const verifyToken = async (rawToken) => {
    if (!rawToken || !rawToken.trim()) return;
    setIsVerifying(true);
    setErrorMessage('');
    setErrorCode('');
    try {
      const data = await invitationsApi.verifyInvitation(rawToken.trim());
      setInvitationData(data);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired invitation token.');
      setErrorCode(err.code || 'VERIFICATION_FAILED');
      setInvitationData(null);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (urlToken) {
      verifyToken(urlToken);
    }
  }, [urlToken]);

  const handleVerifyManual = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMessage('Please enter an invitation token.');
      return;
    }
    verifyToken(tokenInput);
  };

  // 1. Existing authenticated user accepting invitation
  const handleAcceptAuthenticated = async () => {
    const activeToken = (urlToken || tokenInput).trim();
    if (!activeToken) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setErrorCode('');
    try {
      const res = await invitationsApi.acceptInvitation(activeToken);
      const circleId = res?.careCircleId || res?.membership?.careCircle;

      await refreshCircles();
      if (circleId) {
        selectCircle(circleId);
      }
      toast.success(`Successfully joined ${invitationData?.circleName || 'the Care Circle'}!`);
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to accept invitation.');
      setErrorCode(err.code || '');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. New invited user registering and accepting in one atomic step
  const handleAcceptAndRegister = async (e) => {
    e.preventDefault();
    const activeToken = (urlToken || tokenInput).trim();
    if (!activeToken) return;

    if (!registerForm.name.trim() || !registerForm.password) {
      setErrorMessage('Please fill in your name and password.');
      return;
    }

    if (registerForm.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setErrorCode('');

    try {
      const data = await invitationsApi.acceptAndRegister(activeToken, {
        name: registerForm.name.trim(),
        phone: registerForm.phone ? registerForm.phone.trim() : undefined,
        password: registerForm.password,
      });

      // Establish authenticated session
      setSession(data.tokens, data.user);
      await refreshCircles();

      const circleId = data.careCircleId || data.membership?.careCircle;
      if (circleId) {
        selectCircle(circleId);
      }

      toast.success(`Welcome to CareOS! You joined as ${ROLE_LABELS[data.role] || data.role}.`);
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete registration.');
      setErrorCode(err.code || '');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check email mismatch for logged-in user
  const isEmailMismatch =
    isAuthenticated &&
    user &&
    invitationData &&
    user.email.toLowerCase() !== invitationData.email.toLowerCase();

  return (
    <Card variant="lowest" padding="lg" className="w-full shadow-lg border border-outline-variant/30">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center mx-auto mb-3 shadow-sm">
          <Icon name="diversity_1" size={26} />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
          Care Circle Invitation
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed">
          Collaborate in coordinated family care and daily health routines.
        </p>
      </div>

      {/* Error Message Display */}
      {errorMessage && (
        <div className="mb-5 p-4 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2.5 border border-error/30 animate-in fade-in duration-150">
          <Icon name="error" size={18} className="shrink-0 text-error mt-0.5" />
          <div className="flex flex-col">
            <span className="font-bold">
              {errorCode === 'INVITATION_EXPIRED'
                ? 'Invitation Expired'
                : errorCode === 'INVITATION_REVOKED'
                ? 'Invitation Revoked'
                : errorCode === 'INVITATION_ALREADY_USED'
                ? 'Invitation Already Accepted'
                : errorCode === 'INVITATION_NOT_FOUND'
                ? 'Invalid Invitation'
                : 'Invitation Error'}
            </span>
            <span className="mt-0.5 leading-relaxed">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Token Input if not provided in URL */}
      {!urlToken && !invitationData && (
        <form onSubmit={handleVerifyManual} className="space-y-4 mb-6">
          <Input
            label="Invitation Token"
            placeholder="Paste your invite token (or click the invite link)"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            icon="key"
            required
          />
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={isVerifying}
            className="w-full font-bold"
          >
            Verify Invitation
          </Button>
        </form>
      )}

      {isVerifying && (
        <div className="py-8 flex flex-col items-center justify-center gap-2">
          <LoadingSpinner size="md" />
          <span className="text-xs text-on-surface-variant font-medium">
            Verifying invitation security token...
          </span>
        </div>
      )}

      {/* Verified Invitation Details */}
      {invitationData && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Invitation Dossier Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                You're Invited To Join
              </span>
              <Badge
                variant={ROLE_BADGE_VARIANTS[invitationData.role] || 'primary'}
                size="md"
                icon={ROLE_ICONS[invitationData.role]}
              >
                {ROLE_LABELS[invitationData.role] || invitationData.role}
              </Badge>
            </div>

            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-on-surface">
                {invitationData.circleName || 'Care Circle'}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Invited by <strong>{invitationData.inviterName || 'Main Caretaker'}</strong>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs text-on-surface-variant">
              <div className="font-semibold text-on-surface mb-1 flex items-center gap-1.5">
                <Icon name="verified_user" size={15} className="text-primary" />
                <span>Assigned Role: {ROLE_LABELS[invitationData.role]}</span>
              </div>
              <p className="leading-relaxed">
                {ROLE_DESCRIPTIONS[invitationData.role] ||
                  'You will collaborate with family members in logging daily care and medications.'}
              </p>
            </div>

            <div className="text-xs text-on-surface-variant flex items-center justify-between pt-1 border-t border-outline-variant/20">
              <div className="flex items-center gap-1.5">
                <Icon name="mail" size={14} className="text-outline" />
                <span>Sent to: <strong className="text-on-surface">{invitationData.email}</strong></span>
              </div>

              {invitationData.expiresAt && (
                <span className="text-[11px] text-outline">
                  Expires {new Date(invitationData.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Email Mismatch Notice */}
          {isEmailMismatch && (
            <div className="p-4 rounded-xl bg-warning-container/20 border border-warning/30 text-xs text-on-surface space-y-2">
              <div className="flex items-center gap-2 font-bold text-warning">
                <Icon name="warning" size={16} />
                <span>Account Email Mismatch</span>
              </div>
              <p className="leading-relaxed">
                You are currently signed in as <strong>{user?.email}</strong>. This invitation was strictly sent to <strong>{invitationData.email}</strong>.
              </p>
              <div className="pt-1 flex items-center gap-2">
                <Button
                  variant="surface"
                  size="sm"
                  onClick={() => {
                    logout();
                  }}
                  className="font-semibold"
                >
                  Sign Out & Switch Account
                </Button>
              </div>
            </div>
          )}

          {/* Authenticated with matching email -> 1-click Accept */}
          {isAuthenticated && !isEmailMismatch && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-on-surface-variant text-center">
                Signed in as <strong className="text-on-surface">{user?.email}</strong>
              </p>
              <Button
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                onClick={handleAcceptAuthenticated}
                className="w-full text-base font-bold shadow-md"
              >
                Accept & Join {invitationData.circleName || 'Care Circle'}
              </Button>
            </div>
          )}

          {/* Not authenticated -> Onboard & Register */}
          {!isAuthenticated && (
            <form onSubmit={handleAcceptAndRegister} className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
                <span className="text-xs font-bold uppercase tracking-wider text-outline">
                  Create Your CareOS Account
                </span>
                <span className="text-[11px] text-primary font-semibold">
                  Role Locked: {ROLE_LABELS[invitationData.role]}
                </span>
              </div>

              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, name: e.target.value }))
                }
                icon="person"
                required
              />

              <Input
                label="Registered Email Address"
                value={invitationData.email}
                disabled
                helperText="Email is permanently bound to this invitation."
                icon="mail"
              />

              <Input
                label="Phone Number (Optional)"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={registerForm.phone}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                icon="call"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  icon="lock"
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={registerForm.confirmPassword}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  icon="lock_clock"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  className="w-full text-base font-bold shadow-md"
                >
                  Join Circle & Create Account
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Footer Navigation */}
      <div className="mt-6 pt-6 border-t border-outline-variant/30 text-center">
        <p className="text-xs text-on-surface-variant">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Sign In with Existing Account
          </Link>
        </p>
      </div>
    </Card>
  );
}
