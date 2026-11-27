import { useEffect, useState } from 'react';
import ApiStatus from '@/components/base/ApiStatus';
import Button from '@/components/base/Button';
import { useApiResource } from '@/hooks/useApiResource';
import { errorMessage, send } from '@/lib/api';

type TelegramStatus = { enabled: boolean; linked: boolean };

export default function TelegramSettings() {
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [link, setLink] = useState<{ url: string; expiresAt: string }>();
  const status = useApiResource<TelegramStatus>('/me/telegram', version);
  const linked = status.data?.linked ?? false;

  useEffect(() => {
    if (!link || linked) return;
    const refresh = () => {
      if (!document.hidden) setVersion((current) => current + 1);
    };
    const timer = window.setInterval(() => {
      if (Date.now() >= Date.parse(link.expiresAt)) {
        window.clearInterval(timer);
        setLink(undefined);
      } else refresh();
    }, 4000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [link, linked]);

  const run = async (operation: () => Promise<void>) => {
    setPending(true);
    setError(undefined);
    try {
      await operation();
      setVersion((current) => current + 1);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <ApiStatus
        loading={status.loading && !status.data}
        error={error ?? status.error}
        retry={() => {
          setError(undefined);
          setVersion((current) => current + 1);
        }}
      />
      {linked ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-[12px] text-primary-700 dark:text-primary-400">
            Telegram connected
          </p>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              void run(async () => {
                await send('DELETE', '/me/telegram');
                setLink(undefined);
              })
            }
          >
            Disconnect
          </Button>
        </div>
      ) : status.data?.enabled ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              void run(async () => {
                const created = await send<{ url: string; expiresAt: string }>('POST', '/me/telegram/link');
                setLink(created);
              })
            }
          >
            {link ? 'Generate a new link' : 'Connect Telegram'}
          </Button>
          {link && (
            <a
              href={link.url}
              rel="noopener noreferrer"
              target="_blank"
              className="text-[12px] font-medium text-primary-700 hover:underline dark:text-primary-400"
            >
              Open Telegram
            </a>
          )}
          {link && (
            <p role="status" className="w-full text-[11.5px] text-foreground-500">
              The link expires in five minutes. Open it and press Start in Telegram.
            </p>
          )}
        </div>
      ) : status.data ? (
        <p className="text-[12px] text-foreground-500">Telegram is unavailable in this environment.</p>
      ) : null}
    </div>
  );
}
