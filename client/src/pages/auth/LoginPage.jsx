import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await login(formData.email, formData.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="lowest" padding="lg" className="w-full shadow-lg">
      <div className="text-center mb-6">
        <h1 className="font-serif text-3xl font-bold text-on-surface tracking-tight">
          Welcome Back
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed">
          Sign in to coordinate daily routines, medications, and care tasks with your family.
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
          label="Email Address"
          type="email"
          name="email"
          placeholder="e.g. rahul@family.com"
          value={formData.email}
          onChange={handleChange}
          icon="mail"
          required
          autoComplete="email"
          autoFocus
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          icon="lock"
          required
          autoComplete="current-password"
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

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full text-base font-bold shadow-md"
          >
            Sign In to CareOS
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-outline-variant/30 text-center space-y-3">
        <p className="text-xs text-on-surface-variant">
          Setting up care for your family for the first time?{' '}
          <Link
            to="/register"
            className="font-bold text-primary hover:underline"
          >
            Create Main Caretaker Account
          </Link>
        </p>

        <p className="text-xs text-on-surface-variant">
          Have an invitation link or token?{' '}
          <Link
            to="/invite"
            className="font-bold text-secondary hover:underline"
          >
            Join Existing Care Circle
          </Link>
        </p>
      </div>
    </Card>
  );
}
