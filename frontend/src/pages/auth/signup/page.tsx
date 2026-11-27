import { errorMessage } from '@/lib/api';
import ApiStatus from '@/components/base/ApiStatus';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthShell from '@/pages/auth/components/AuthShell';
import AuthField from '@/pages/auth/components/AuthField';
import Button from '@/components/base/Button';
import { useAuth } from '@/contexts/AuthContext';

type Errors = { name?: string; email?: string; password?: string; confirm?: string; terms?: string };

export default function Signup() {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = 'Enter a valid email address';
    if (password.length < 6) next.password = 'Use at least 6 characters';
    if (confirm !== password) next.confirm = 'Passwords do not match';
    if (!terms) next.terms = 'Please accept the terms to continue';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitError('');
    setSubmitting(true);
    try {
      await signUp(name.trim(),email.trim(),password);
      navigate('/verify-email',{state:{email:email.trim()},replace:true});
    } catch(error) {
      
      setSubmitError(errorMessage(error));
    } finally {setSubmitting(false);}
  };

  return (
    <AuthShell
      eyebrow="Create your workspace"
      title="Start tracking prices"
      subtitle="Verify your email to open your workspace."
      footer={
        <p className="text-center text-[12.5px] text-foreground-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-foreground-950 underline decoration-background-300 underline-offset-4 hover:decoration-foreground-900 cursor-pointer"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <ApiStatus error={submitError||undefined}/>
        <AuthField
          label="Full name"
          value={name}
          onChange={setName}
          placeholder="Alex Kim"
          autoComplete="name"
          icon="ri-user-line"
          error={errors.name}
        />
        <AuthField
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          icon="ri-mail-line"
          error={errors.email}
        />
        <div>
          <AuthField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            icon="ri-lock-line"
            error={errors.password}
          />
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3].map((level) => (
                <span
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                    strength >= level
                      ? strength === 1
                        ? 'bg-danger-500'
                        : strength === 2
                          ? 'bg-accent-500'
                          : 'bg-primary-500'
                      : 'bg-background-200'
                  }`}
                ></span>
              ))}
            </div>
            <span className="text-[10.5px] text-foreground-400">
              {strength === 0 ? 'Strength' : strength === 1 ? 'Weak' : strength === 2 ? 'Fair' : 'Strong'}
            </span>
          </div>
        </div>
        <AuthField
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Repeat your password"
          autoComplete="new-password"
          icon="ri-lock-2-line"
          error={errors.confirm}
        />

        <div>
          <label className="flex cursor-pointer items-start gap-2 select-none">
            <input
              type="checkbox"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-background-300 accent-primary-600 cursor-pointer"
            />
            <span className="text-[11.5px] leading-relaxed text-foreground-600">
              I agree to the Terms of Service and Privacy Policy.
            </span>
          </label>
          {errors.terms && (
            <p className="mt-1 flex items-center gap-1 text-[11.5px] text-danger-600">
              <i aria-hidden="true" className="ri-error-warning-line text-xs"></i>
              {errors.terms}
            </p>
          )}
        </div>

        <Button type="submit" block size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-background-50/40 border-t-background-50 animate-spin"></span>
              Creating workspace
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
