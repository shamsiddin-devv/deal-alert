import { Link } from 'react-router-dom';
import { features, landingStats, marketplaces, steps } from '@/mocks/landing';

export function MarketplaceStrip() {
  return (
    <section className="w-full border-b border-background-200 bg-background-50">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8 py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] text-foreground-400">
            Monitoring offers from
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:items-center lg:gap-8">
            {marketplaces.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-background-200 bg-background-100 text-foreground-600">
                  <i aria-hidden="true" className="ri-store-2-line text-[13px]"></i>
                </span>
                <div>
                  <p className="whitespace-nowrap text-[12.5px] font-medium text-foreground-800">{item.name}</p>
                  <p className="hidden whitespace-nowrap text-[10.5px] text-foreground-400 sm:block">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeatureGrid() {
  return (
    <section id="features" className="w-full border-b border-background-200 bg-background-100">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8 py-14 md:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-400">
            Product intelligence
          </p>
          <h2 className="mt-3 font-heading text-[26px] font-semibold leading-tight tracking-[-0.025em] text-foreground-950 md:text-[34px]">
            Everything you need to judge a price honestly
          </h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-foreground-600">
            A discount is only useful when you can see what came before it. Deal Alert keeps the evidence attached to every
            product you follow.
          </p>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-background-200 bg-background-50 p-5 transition-all duration-200 hover:border-background-300 hover:shadow-card"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-background-200 bg-background-100 text-foreground-700 transition-colors duration-200 group-hover:border-primary-500/25 group-hover:bg-primary-500/10 group-hover:text-primary-700 dark:group-hover:text-primary-400">
                <i aria-hidden="true" className={`${feature.icon} text-[17px]`}></i>
              </span>
              <h3 className="mt-3.5 font-heading text-[14px] font-semibold text-foreground-950">{feature.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground-500">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="w-full border-b border-background-200 bg-background-50">
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-400">
            How it works
          </p>
          <h2 className="mt-3 font-heading text-[26px] font-semibold leading-tight tracking-[-0.025em] text-foreground-950 md:text-[34px]">
            From a link to a confident purchase in four steps
          </h2>
          <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-foreground-600">
            No spreadsheets, no manual checking, no guessing whether the sale is real. Add the product once and let the
            monitoring run.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-primary-600 px-4 text-[13px] font-medium text-background-50 transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-background-950 dark:hover:bg-primary-400 cursor-pointer"
            >
              Start tracking free
              <i aria-hidden="true" className="ri-arrow-right-line text-sm"></i>
            </Link>
            <a
              href="#tracking"
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-background-300 px-4 text-[13px] font-medium text-foreground-900 transition-colors hover:bg-background-100 cursor-pointer"
            >
              See a live example
            </a>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-background-200 pt-6">
            {landingStats.slice(0, 2).map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-[22px] font-semibold tracking-tight text-foreground-950">{stat.value}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-foreground-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-[19px] top-3 bottom-3 hidden w-px bg-background-300 sm:block"></div>
          <ol className="space-y-3">
            {steps.map((item) => (
              <li
                key={item.step}
                className="relative flex gap-4 rounded-xl border border-background-200 bg-background-100/60 p-4 transition-colors duration-200 hover:border-background-300 hover:bg-background-100 sm:gap-5"
              >
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-background-200 bg-background-50 font-label text-[12px] font-semibold text-foreground-700">
                  {item.step}
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading text-[14px] font-semibold text-foreground-950">{item.title}</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-foreground-500">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}