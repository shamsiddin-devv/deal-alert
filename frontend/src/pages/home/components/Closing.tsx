import { useState } from 'react';
import { Link } from 'react-router-dom';
import { benefits, landingFaqs, landingStats } from '@/mocks/landing';

export function Benefits() {
  return (
    <section id="benefits" className="w-full border-b border-background-200 bg-background-100">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-14 md:px-8 md:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-400">
            Use cases
          </p>
          <h2 className="mt-3 font-heading text-[26px] font-semibold leading-tight tracking-[-0.025em] text-foreground-950 md:text-[34px]">
            Built for people who refuse to guess
          </h2>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {benefits.map((item) => (
            <div key={item.role} className="flex flex-col rounded-xl border border-background-200 bg-background-50 p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foreground-400">{item.role}</p>
              <h3 className="mt-2 font-heading text-[16px] font-semibold leading-snug text-foreground-950">{item.title}</h3>
              <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-foreground-500">{item.body}</p>
              <ul className="mt-4 space-y-2 border-t border-background-200 pt-4">
                {item.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-[12px] text-foreground-700">
                    <i aria-hidden="true" className="ri-check-line mt-0.5 text-[13px] text-primary-600 dark:text-primary-400"></i>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 border-t border-background-200 pt-8 md:grid-cols-4">
          {landingStats.map((stat) => (
            <div key={stat.label}>
              <p className="font-heading text-[24px] font-semibold tracking-tight text-foreground-950 md:text-[30px]">
                {stat.value}
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-foreground-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="w-full border-b border-background-200 bg-background-50">
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-400">FAQ</p>
          <h2 className="mt-3 font-heading text-[26px] font-semibold leading-tight tracking-[-0.025em] text-foreground-950 md:text-[32px]">
            Questions people ask before trusting a price tracker
          </h2>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-foreground-600">
            Still unsure about something? Create a free account and explore your workspace.
          </p>
          <Link
            to="/signup"
            className="mt-5 inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-background-300 bg-background-100 px-4 text-[13px] font-medium text-foreground-900 transition-colors hover:bg-background-200 cursor-pointer"
          >
            Open the workspace
            <i aria-hidden="true" className="ri-arrow-right-line text-sm"></i>
          </Link>
        </div>

        <div className="divide-y divide-background-200 border-y border-background-200">
          {landingFaqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left cursor-pointer"
                >
                  <span className="text-[13.5px] font-medium text-foreground-900">{item.q}</span>
                  <i aria-hidden="true"
                    className={`${isOpen ? 'ri-subtract-line' : 'ri-add-line'} shrink-0 text-lg text-foreground-400`}
                  ></i>
                </button>
                <div
                  className={`grid transition-all duration-200 ease-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100 pb-4' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <p className="overflow-hidden text-[12.5px] leading-relaxed text-foreground-500">{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CallToAction() {
  return (
    <section className="w-full bg-background-50 px-4 py-14 md:px-8 md:py-20">
      <div className="relative mx-auto w-full max-w-[1400px] overflow-hidden rounded-2xl border border-background-200 bg-foreground-950 px-6 py-12 md:px-12 md:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-[0.16]">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-primary-500 blur-3xl"></div>
          <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-accent-500 blur-3xl"></div>
        </div>
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-300">Ready when you are</p>
            <h2 className="mt-3 font-heading text-[28px] font-semibold leading-tight tracking-[-0.025em] text-background-50 md:text-[40px]">
              Stop guessing. Start tracking.
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-background-300">
              Create an account to open the full dashboard: products, price history, comparisons, alerts and savings
              insights. Demonstration data is already loaded.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
            <Link
              to="/signup"
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-background-50 px-5 text-[13.5px] font-medium text-foreground-950 transition-colors hover:bg-background-200 cursor-pointer"
            >
              Create free account
              <i aria-hidden="true" className="ri-arrow-right-line text-sm"></i>
            </Link>
            <Link
              to="/login"
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-background-50/25 px-5 text-[13.5px] font-medium text-background-100 transition-colors hover:bg-background-50/10 cursor-pointer"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}