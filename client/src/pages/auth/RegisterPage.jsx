import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) {
      setErrorMessage('Password must contain at least one letter and one number.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
      });

      toast.success('Account created successfully! Let’s set up your Care Circle.');
      navigate('/onboarding/create-circle');
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="lowest" padding="lg" className="w-full shadow-lg">
      <div className="text-center mb-6">
        <h1 className="font-serif text-3xl font-bold text-on-surface tracking-tight">
          Create Caretaker Account
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed">
          Set up your Main Caretaker profile to create a Care Circle and coordinate care for your loved one.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error/20">
          <Icon name="error" size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          name="name"
          placeholder="e.g. Rahul Sharma"
          value={formData.name}
          onChange={handleChange}
          icon="person"
          required
          autoFocus
        />

        <Input
          label="Email Address"
          type="email"
          name="email"
          placeholder="e.g. rahul@family.com"
          value={formData.email}
          onChange={handleChange}
          icon="mail"
          required
          autoComplete="email"
        />

        <Input
          label="Phone Number"
          type="tel"
          name="phone"
          placeholder="e.g. +91 98765 43210 (Optional)"
          value={formData.phone}
          onChange={handleChange}
          icon="call"
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="At least 8 characters"
          value={formData.password}
          onChange={handleChange}
          icon="lock"
          required
          helperText="Must be at least 8 characters with letters and numbers"
          autoComplete="new-password"
          iconRight={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="p-1 text-outline hover:text-on-surface focus:outline-none"
              tabIndex={-1}
            >
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
            </button>
          }
        />

        <Input
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          name="confirmPassword"
          placeholder="Re-enter your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          icon="lock_clock"
          required
          autoComplete="new-password"
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full text-base font-bold shadow-md"
          >
            Create Account & Continue
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-outline-variant/30 text-center space-y-3">
        <p className="text-xs text-on-surface-variant">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Sign In
          </Link>
        </p>

        <p className="text-xs text-on-surface-variant">
          Joining an existing circle?{' '}
          <Link to="/invite" className="font-bold text-secondary hover:underline">
            Accept Invitation
          </Link>
        </p>
      </div>
    </Card>
  );
}
