import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, status } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isLoading = status === 'loading';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      await login(email, password);
      navigate('/levels');
    } catch (err) {
      if (err.code === 'INVALID_CREDENTIALS') {
        setErrorMessage('Invalid email or password');
      } else if (err.code === 'RATE_LIMITED') {
        setErrorMessage('Too many attempts. Please try again in a few minutes.');
      } else {
        setErrorMessage(err.message || 'Failed to sign in. Please try again.');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      <Card className="w-full max-w-md shadow-soft-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-xs uppercase font-heading font-bold tracking-widest text-sky-blue block mb-1">
            HAPPY DROP
          </span>
          <h2 className="text-3xl font-heading font-black text-navy">Welcome Back</h2>
          <p className="text-sm text-navy/60 mt-1">
            Sign in to continue your water-drawing adventure
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-bold uppercase text-navy/70 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-2xl bg-soft border-2 border-sky-100 text-navy placeholder:text-navy/30 focus:outline-none focus:border-sky-blue transition"
            />
          </div>

          <div>
            <label className="block text-xs font-heading font-bold uppercase text-navy/70 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-11 rounded-2xl bg-soft border-2 border-sky-100 text-navy placeholder:text-navy/30 focus:outline-none focus:border-sky-blue transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy/50 hover:text-navy transition p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Server Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-coral-pink/30 rounded-2xl text-xs font-heading text-coral-pink font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="w-full !py-3.5 mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" /> Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <p className="text-sm text-center text-navy/70 mt-6 font-medium">
          Don't have an account?{' '}
          <Link to="/register" className="text-sky-blue font-bold hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
};
