import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { landingFaqs } from '@/mocks/landing';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Button from '@/components/base/Button';
import Modal from '@/components/base/Modal';
import { inputClass, Field } from '@/components/base/Controls';
import { errorMessage, send } from '@/lib/api';
import { EmptyState } from '@/components/base/Bits';

const guides = [
  {
    icon: 'ri-add-circle-line',
    title: 'Add your first product',
    body: 'Paste a marketplace link, check the extracted details and choose the price you are willing to pay.',
    to: '/app/products',
    action: 'Open my products',
  },
  {
    icon: 'ri-focus-3-line',
    title: 'Set meaningful conditions',
    body: 'Combine a target price with availability alerts so you are told when the offer is actually buyable.',
    to: '/app/products',
    action: 'Review conditions',
  },
  {
    icon: 'ri-arrow-left-right-line',
    title: 'Compare before you buy',
    body: 'Check delivery cost, warranty and condition across supported marketplaces for the same model.',
    to: '/app/compare',
    action: 'Open comparison',
  },
  {
    icon: 'ri-pie-chart-2-line',
    title: 'Understand your savings',
    body: 'See the difference between potential and confirmed savings, and which products are closest to target.',
    to: '/app/insights',
    action: 'View insights',
  },
];

const shortcuts = [
  { keys: '⌘ / Ctrl + K', label: 'Focus global search' },
  { keys: '⌘ / Ctrl + B', label: 'Collapse the sidebar' },
  { keys: 'G then P', label: 'Go to my products' },
  { keys: 'G then A', label: 'Go to alerts' },
  { keys: 'Esc', label: 'Close any dialog' },
];

export default function HelpPage() {
  const { pushToast } = useWorkspace();
  const [supportOpen, setSupportOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function submitSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await send('POST', '/support', { subject: subject.trim(), message: message.trim() });
      setSupportOpen(false);
      setSubject('');
      setMessage('');
      pushToast('Support request submitted');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSending(false);
    }
  }

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | null>(0);

  const faqs = landingFaqs.filter((item) =>
    `${item.q} ${item.a}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const matchedGuides = guides.filter((item) =>
    `${item.title} ${item.body}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-background-200 bg-background-50 p-5">
        <h1 className="font-heading text-[22px] font-semibold tracking-[-0.025em] text-foreground-950">
          Help & support
        </h1>
        <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-foreground-500">
          Guides, answers and shortcuts for getting the most out of Deal Alert.
        </p>
        <div className="relative mt-4 max-w-md">
          <i aria-hidden="true" className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-foreground-400"></i>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help articles and FAQ"
            aria-label="Search help"
            className="h-10 w-full rounded-lg border border-background-200 bg-background-50 pl-9 pr-3 text-[12.5px] text-foreground-950 outline-none placeholder:text-foreground-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {matchedGuides.map((guide) => (
          <div key={guide.title} className="flex flex-col rounded-xl border border-background-200 bg-background-50 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-100 text-foreground-600">
              <i aria-hidden="true" className={`${guide.icon} text-[16px]`}></i>
            </span>
            <h2 className="mt-2.5 font-heading text-[13.5px] font-semibold text-foreground-950">{guide.title}</h2>
            <p className="mt-1 flex-1 text-[11.5px] leading-relaxed text-foreground-500">{guide.body}</p>
            <Link
              to={guide.to}
              className="mt-2.5 inline-flex w-fit items-center gap-1 text-[11.5px] font-medium text-primary-700 hover:underline dark:text-primary-400 cursor-pointer"
            >
              {guide.action}
              <i aria-hidden="true" className="ri-arrow-right-line text-[11px]"></i>
            </Link>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-background-200 bg-background-50">
          <div className="border-b border-background-200 px-4 py-3">
            <h2 className="font-heading text-[14.5px] font-semibold text-foreground-950">Frequently asked</h2>
            <p className="mt-0.5 text-[11px] text-foreground-500">{faqs.length} articles</p>
          </div>
          {faqs.length === 0 ? (
            <EmptyState
              icon="ri-search-eye-line"
              title="Nothing matched that search"
              body="Try a shorter phrase such as “price”, “marketplace” or “alerts”."
              action={
                <Button variant="secondary" size="sm" onClick={() => setQuery('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-background-200">
              {faqs.map((item, index) => {
                const isOpen = open === index;
                return (
                  <div key={item.q} className="px-4">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left cursor-pointer"
                    >
                      <span className="text-[12.5px] font-medium text-foreground-900">{item.q}</span>
                      <i aria-hidden="true" className={`${isOpen ? 'ri-subtract-line' : 'ri-add-line'} shrink-0 text-base text-foreground-400`}></i>
                    </button>
                    <div
                      className={`grid transition-all duration-200 ${
                        isOpen ? 'grid-rows-[1fr] opacity-100 pb-3' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <p className="overflow-hidden text-[11.5px] leading-relaxed text-foreground-500">{item.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-background-200 bg-background-50 p-4">
            <h2 className="font-heading text-[14px] font-semibold text-foreground-950">Keyboard shortcuts</h2>
            <div className="mt-2.5 space-y-1.5">
              {shortcuts.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] text-foreground-600">{item.label}</span>
                  <span className="rounded border border-background-200 bg-background-100 px-1.5 py-0.5 font-label text-[10px] text-foreground-500">
                    {item.keys}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-background-200 bg-foreground-950 p-4">
            <h2 className="font-heading text-[14px] font-semibold text-background-50">Still stuck?</h2>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-background-300">
              Write to the team. Include the product link if the issue is about a specific offer.
            </p>
            <button
              type="button"
              onClick={() => { setError(''); setSupportOpen(true); }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-background-50/20 py-2 text-[11.5px] font-medium text-background-100 hover:bg-background-50/10 cursor-pointer"
            >
              <i aria-hidden="true" className="ri-chat-3-line text-[13px]"></i>
              Ask a question in-app
            </button>
          </div>

          <div className="rounded-xl border border-background-200 bg-background-100 p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foreground-400">Data status</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-foreground-600">
              Prices and availability reflect the last successful check. Monitoring depends on marketplace access.
            </p>
          </div>
        </div>
      </div>
      <Modal open={supportOpen} onClose={() => { if (!sending) setSupportOpen(false); }} title="Ask a question in-app">
        <form className="space-y-4" onSubmit={submitSupport}>
          <Field label="Subject">
            <input id="support-subject" data-modal-autofocus className={inputClass} required minLength={3} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} />
          </Field>
          <Field label="Message">
            <textarea id="support-message" className={inputClass + ' min-h-24 py-2'} required minLength={10} maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} />
          </Field>
          {error && <p role="alert" className="text-sm text-danger-600">{error}</p>}
          <Button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send request'}</Button>
        </form>
      </Modal>
    </div>
  );
}