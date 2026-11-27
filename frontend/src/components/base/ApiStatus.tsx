export default function ApiStatus({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
}) {
  if (!error && !loading) return null;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className="rounded-lg border border-background-200 bg-background-50 px-3 py-2 text-sm text-foreground-700"
    >
      {error ?? 'Loading…'}
      {error && retry && (
        <button type="button" className="ml-3 underline" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}
