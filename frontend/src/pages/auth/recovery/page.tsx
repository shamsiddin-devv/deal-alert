import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '@/pages/auth/components/AuthShell';
import AuthField from '@/pages/auth/components/AuthField';
import Button from '@/components/base/Button';
import ApiStatus from '@/components/base/ApiStatus';
import { errorMessage, send } from '@/lib/api';

const linkStyle = 'font-medium text-foreground-950 underline underline-offset-4';
const notice = 'rounded-xl border border-primary-500/25 bg-primary-500/[0.07] p-4 text-sm text-foreground-700';

function useSubmission() {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const run = async (callback: () => Promise<void>) => {
    setError(undefined);
    setPending(true);
    try {
      await callback();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  };
  return { error, pending, run };
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { error, pending, run } = useSubmission();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await send('POST', '/auth/forgot-password', { email });
      setSent(true);
    });
  };
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="Enter your email to request a secure reset link."
      footer={
        <Link className={linkStyle} to="/login">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div role="status" className={notice}>
          If the account exists, a reset link has been requested. Check your inbox.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <ApiStatus error={error} />
          <AuthField
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            icon="ri-mail-line"
          />
          <Button type="submit" block size="lg" disabled={pending}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const { error, pending, run } = useSubmission();
  const email = params.get('email');
  const token = params.get('token');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (password !== confirm) throw new Error('Passwords do not match');
      await send('POST', '/auth/reset-password', { email, token, password });
      setDone(true);
      window.history.replaceState(window.history.state, '', window.location.pathname);
    });
  };
  return (
    <AuthShell
      eyebrow="Account recovery"
      title={done ? 'Password updated' : 'Choose a new password'}
      subtitle={done ? 'You can now sign in with the new password.' : 'Use at least 6 characters.'}
      footer={
        <Link className={linkStyle} to="/login">
          Return to sign in
        </Link>
      }
    >
      {done ? (
        <Link className={linkStyle} to="/login">
          Sign in with new password
        </Link>
      ) : !email || !token ? (
        <div className={notice}>
          A valid reset link is required.{' '}
          <Link className={linkStyle} to="/forgot-password">
            Request a link
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <ApiStatus error={error} />
          <AuthField
            label="New password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            icon="ri-lock-line"
          />
          <AuthField
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            icon="ri-lock-line"
          />
          <Button type="submit" block size="lg" disabled={pending}>
            Update password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
