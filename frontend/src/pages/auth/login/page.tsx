import { ApiError, errorMessage } from '@/lib/api';
import ApiStatus from '@/components/base/ApiStatus';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '@/pages/auth/components/AuthShell';
import AuthField from '@/pages/auth/components/AuthField';
import Button from '@/components/base/Button';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { signIn, ready } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);


  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = 'Enter a valid email address';
    if (password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitError('');
    setSubmitting(true);
    try {
      await signIn(email.trim(),password,remember);
      const from: unknown = location.state?.from;
      navigate(typeof from === 'string' && (from === '/app' || from.startsWith('/app/')) ? from : '/app', {replace:true});
    } catch(error) {
      if(error instanceof ApiError && error.code==='EMAIL_UNVERIFIED'){navigate('/verify-email',{state:{email:email.trim(),from:location.state?.from}});return;}
      setSubmitError(errorMessage(error));
    } finally {setSubmitting(false);}
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Deal Alert"
      subtitle="Pick up where you left off — your products, alerts and price history are waiting."
      footer={
        <div className="space-y-3">
          <p className="text-center text-[12.5px] text-foreground-500">
            New to Deal Alert?{' '}
            <Link to="/signup" className="font-medium text-foreground-950 underline decoration-background-300 underline-offset-4 hover:decoration-foreground-900 cursor-pointer">
              Create an account
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ApiStatus error={submitError||undefined}/>
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
        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          autoComplete="current-password"
          icon="ri-lock-line"
          error={errors.password}
        />

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-background-300 accent-primary-600 cursor-pointer"
            />
            <span className="text-[12px] text-foreground-600">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-[12px] font-medium text-foreground-800 hover:text-primary-700 dark:hover:text-primary-400 cursor-pointer">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" block size="lg" disabled={!ready || submitting}>
          {submitting ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-background-50/40 border-t-background-50 animate-spin"></span>
              Signing in
            </>
          ) : (
            'Sign in'
          )}
        </Button>

      </form>
    </AuthShell>
  );
}