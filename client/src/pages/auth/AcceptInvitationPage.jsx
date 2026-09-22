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
import { ROLE_LABELS, ROLE_BADGE_VARIANTS } from '../../constants/roles';

export function AcceptInvitationPage() {
  const { token: urlToken } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, setSession } = useAuth();
  const { refreshCircles } = useCareCircle();
  const toast = useToast();

  const [tokenInput, setTokenInput] = useState(urlToken || '');
  const [invitationData, setInvitationData] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Register form fields if new user
  const [registerForm, setRegisterForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!urlToken) return;

    let isMounted = true;
    async function verify() {
      setIsVerifying(true);
      setErrorMessage('');
      try {
        const data = await invitationsApi.verifyInvitation(urlToken.trim());
        if (isMounted) {
          setInvitationData(data.invitation || data);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'Invalid or expired invitation token.');
          setInvitationData(null);
        }
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [urlToken]);

  const handleVerifyManual = async () => {
    if (!tokenInput.trim()) {
      setErrorMessage('Please enter an invitation token.');
      return;
    }
    setIsVerifying(true);
    setErrorMessage('');
    try {
      const data = await invitationsApi.verifyInvitation(tokenInput.trim());
      setInvitationData(data.invitation || data);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired invitation token.');
      setInvitationData(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAcceptAuthenticated = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await invitationsApi.acceptInvitation(tokenInput.trim());
      await refreshCircles();
      toast.success('Successfully joined the Care Circle!');
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to accept invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptAndRegister = async (e) => {
    e.preventDefault();
    if (!registerForm.name || !registerForm.password) {
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

    try {
      const data = await invitationsApi.acceptAndRegister(tokenInput.trim(), {
        name: registerForm.name,
        phone: registerForm.phone || undefined,
        password: registerForm.password,
      });

      setSession(data.tokens, data.user);
      await refreshCircles();
      toast.success('Welcome! You have successfully joined the Care Circle.');
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="lowest" padding="lg" className="w-full shadow-lg">
      <div className="text-center mb-6">
        <h1 className="font-serif text-3xl font-bold text-on-surface tracking-tight">
          Join a Care Circle
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed">
          Accept your invitation to collaborate in caring for a family member.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error/20">
          <Icon name="error" size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Token Input if not provided via URL */}
      {!urlToken && !invitationData && (
        <div className="space-y-4 mb-6">
          <Input
            label="Invitation Token"
            placeholder="Paste your 64-character invite token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            icon="key"
          />
          <Button
            variant="primary"
            size="md"
            isLoading={isVerifying}
            onClick={handleVerifyManual}
            className="w-full"
          >
            Verify Invitation
          </Button>
        </div>
      )}

      {isVerifying && <LoadingSpinner size="md" text="Verifying invitation..." />}

      {/* Verified Invitation Details */}
      {invitationData && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">
                Care Circle Invitation
              </span>
              <Badge
                variant={ROLE_BADGE_VARIANTS[invitationData.role] || 'primary'}
                size="sm"
              >
                {ROLE_LABELS[invitationData.role] || invitationData.role}
              </Badge>
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-on-surface">
                {invitationData.careCircle?.name || 'Care Circle'}
              </h3>
              {invitationData.careRecipient?.fullName && (
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Care recipient:{' '}
                  <strong className="text-on-surface">
                    {invitationData.careRecipient.fullName}
                  </strong>
                </p>
              )}
            </div>

            <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
              <Icon name="mail" size={14} />
              <span>Invited email: {invitationData.email}</span>
            </div>
          </div>

          {/* If already authenticated */}
          {isAuthenticated ? (
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
                Accept & Join Circle
              </Button>
            </div>
          ) : (
            /* If new user: complete registration */
            <form onSubmit={handleAcceptAndRegister} className="space-y-4 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-outline">
                Complete Your Profile
              </div>

              <Input
                label="Full Name"
                placeholder="Your full name"
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, name: e.target.value }))
                }
                icon="person"
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="Your phone number (Optional)"
                value={registerForm.phone}
                onChange={(e) =>
                  setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                icon="call"
              />

              <Input
                label="Create Password"
                type="password"
                placeholder="At least 8 characters"
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

      <div className="mt-6 pt-6 border-t border-outline-variant/30 text-center">
        <p className="text-xs text-on-surface-variant">
          Already have an existing account?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </Card>
  );
}
