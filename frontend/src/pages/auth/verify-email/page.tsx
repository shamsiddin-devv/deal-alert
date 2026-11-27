import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import ApiStatus from '@/components/base/ApiStatus';
import Button from '@/components/base/Button';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, errorMessage, send } from '@/lib/api';
import AuthField from '../components/AuthField';
import AuthShell from '../components/AuthShell';

type Action = 'verify' | 'resend';
type Errors = { email?: string; code?: string };

export default function VerifyEmail() {
  const location = useLocation();
  const { user, ready, verifyEmail } = useAuth();
  const initialEmail: unknown = location.state?.email;
  const requestedPage: unknown = location.state?.from;
  const [email, setEmail] = useState(typeof initialEmail === 'string' ? initialEmail : '');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submissionError, setSubmissionError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const [pending, setPending] = useState<Action>();
  const emailInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  if (user) {
    const destination =
      typeof requestedPage === 'string' && (requestedPage === '/app' || requestedPage.startsWith('/app/'))
        ? requestedPage
        : '/app';
    return <Navigate to={destination} replace />;
  }

  const run = async (action: Action) => {
    if (pending) return;
    const address = email.trim();
    const next: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) next.email = 'Enter a valid email address';
    if (action === 'verify' && code.length !== 6) next.code = 'Enter the six-digit code';
    setErrors(next);
    setSubmissionError(undefined);
    setFeedback(undefined);
    if (next.email || next.code) {
      (next.email ? emailInput : codeInput).current?.focus();
      return;
    }

    setPending(action);
    try {
      if (action === 'verify') {
        await verifyEmail(address, code);
      } else {
        await send('POST', '/auth/resend-verification', { email: address });
        setCode('');
        setFeedback('A new verification code has been requested. Check your inbox.');
        codeInput.current?.focus();
      }
    } catch (error) {
      if (action === 'verify' && error instanceof ApiError && error.status === 401) {
        setErrors({ code: error.message });
        codeInput.current?.focus();
      } else {
        setSubmissionError(errorMessage(error));
      }
    } finally {
      setPending(undefined);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run('verify');
  };

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Verify your email"
      subtitle="Enter the six-digit code from your email to open your workspace."
      footer={
        <p className="text-center text-[12.5px] text-foreground-500">
          Already verified?{' '}
          <Link
            to="/login"
            className="font-medium text-foreground-950 underline decoration-background-300 underline-offset-4 hover:decoration-foreground-900"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ApiStatus error={submissionError} />
        {feedback && (
          <p
            role="status"
            className="rounded-lg border border-primary-500/25 bg-primary-500/[0.07] px-3 py-2 text-[12px] text-foreground-700"
          >
            {feedback}
          </p>
        )}
        <AuthField
          ref={emailInput}
          label="Email address"
          name="email"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
            setFeedback(undefined);
          }}
          placeholder="you@example.com"
          autoComplete="email"
          icon="ri-mail-line"
          error={errors.email}
          readOnly={Boolean(pending)}
          required
        />
        <AuthField
          ref={codeInput}
          label="Verification code"
          name="verification-code"
          value={code}
          onChange={(value) => {
            setCode(value.replace(/\D/g, '').slice(0, 6));
            setErrors((current) => ({ ...current, code: undefined }));
          }}
          placeholder="Enter the code"
          hint="6 digits"
          inputMode="numeric"
          pattern="[0-9]{6}"
          autoComplete="one-time-code"
          icon="ri-shield-keyhole-line"
          error={errors.code}
          readOnly={Boolean(pending)}
          required
        />
        <Button type="submit" size="lg" block disabled={!ready || Boolean(pending)}>
          {pending === 'verify' ? 'Verifying…' : 'Verify email'}
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-foreground-500">
          <span>Didn’t receive a code?</span>
          <button
            type="button"
            onClick={() => void run('resend')}
            disabled={Boolean(pending)}
            className="cursor-pointer font-medium text-foreground-950 underline decoration-background-300 underline-offset-4 hover:decoration-foreground-900 disabled:cursor-wait disabled:opacity-60"
          >
            {pending === 'resend' ? 'Requesting…' : 'Resend code'}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
