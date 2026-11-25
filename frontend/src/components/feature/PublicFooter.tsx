import { Link } from 'react-router-dom';
import { footerLinks } from '@/mocks/landing';

export default function PublicFooter() {
  return (
    <footer className="w-full border-t border-background-200 bg-background-100">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 cursor-pointer">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground-950 text-background-50">
                <i aria-hidden="true" className="ri-price-tag-3-line text-[15px]"></i>
              </span>
              <span className="font-heading text-[17px] font-semibold tracking-tight text-foreground-950">Deal Alert</span>
            </Link>
            <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-foreground-500">
              Price intelligence for online shopping in Uzbekistan. Transparent price history, honest deal detection and
              alerts that only arrive when they matter.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-background-200 bg-background-50 px-2.5 py-1 text-[11px] font-medium text-foreground-600">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500"></span>
                Demo data
              </span>
              <span className="text-[11.5px] text-foreground-400">Tashkent, Uzbekistan</span>
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground-400">{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.links.map((label) => (
                  <li key={label}>
                    <a
                      href="#top"
                      className="text-[12.5px] text-foreground-600 transition-colors hover:text-foreground-950 cursor-pointer"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-background-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11.5px] text-foreground-400">© 2026 Deal Alert. Public preview prices are illustrative.</p>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#top" className="text-[11.5px] text-foreground-500 hover:text-foreground-900 cursor-pointer">
              Privacy
            </a>
            <a href="#top" className="text-[11.5px] text-foreground-500 hover:text-foreground-900 cursor-pointer">
              Terms
            </a>
            <a href="#top" className="text-[11.5px] text-foreground-500 hover:text-foreground-900 cursor-pointer">
              Status
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}