import { useState } from 'react';
import { Link } from 'react-router-dom';

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Price tracking', href: '#tracking' },
  { label: 'Compare stores', href: '#compare' },
  { label: 'FAQ', href: '#faq' },
];

export default function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-background-200 bg-background-100/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-6 px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 cursor-pointer">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground-950 text-background-50">
            <i aria-hidden="true" className="ri-price-tag-3-line text-[15px]"></i>
          </span>
          <span className="font-heading text-[17px] font-semibold tracking-tight text-foreground-950">Deal Alert</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-[13px] font-medium text-foreground-600 transition-colors duration-150 hover:text-foreground-950 cursor-pointer"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/login"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium text-foreground-700 transition-colors hover:bg-background-200/70 hover:text-foreground-950 cursor-pointer"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-600 px-4 text-[13px] font-medium text-background-50 transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-background-950 dark:hover:bg-primary-400 cursor-pointer"
          >
            Get started
            <i aria-hidden="true" className="ri-arrow-right-line text-sm"></i>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-800 transition-colors hover:bg-background-200 md:hidden cursor-pointer"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <i aria-hidden="true" className={`${open ? 'ri-close-line' : 'ri-menu-3-line'} text-xl`}></i>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-background-200 bg-background-50 px-4 pb-4 pt-2 anim-fade">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-2.5 text-[13.5px] font-medium text-foreground-700 hover:bg-background-100 cursor-pointer"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/login"
              className="flex h-10 items-center justify-center rounded-lg border border-background-200 text-[13px] font-medium text-foreground-900 cursor-pointer"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="flex h-10 items-center justify-center rounded-lg bg-primary-600 text-[13px] font-medium text-background-50 cursor-pointer"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}