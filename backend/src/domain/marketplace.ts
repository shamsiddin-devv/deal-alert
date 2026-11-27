import { BadRequestError } from './errors/BadRequestError';

const productPaths = '(?:uz/|ru/)?(?:product|products|tovar)/';
export const MARKETPLACES = {
  asaxiy: {
    name: 'Asaxiy',
    hosts: ['asaxiy.uz', 'www.asaxiy.uz'],
    path: new RegExp('^/' + productPaths + '.+'),
    interval: 5000,
  },
  mediapark: {
    name: 'Mediapark',
    hosts: ['mediapark.uz', 'www.mediapark.uz'],
    path: /^\/(?:(?:uz|ru)\/)?(?:[a-z-]+\/)?(?:product|products\/view)\/[^/]+\/?$/,
    interval: 6000,
  },
  texnomart: {
    name: 'Texnomart',
    hosts: ['texnomart.uz', 'www.texnomart.uz'],
    path: new RegExp('^/' + productPaths + '.+'),
    interval: 6000,
  },
  ishonch: {
    name: 'ISHONCH',
    hosts: ['ecom.ishonchsavdo.uz', 'ishonchsavdo.uz', 'www.ishonchsavdo.uz'],
    path: new RegExp('^/' + productPaths + '.+'),
    interval: 6000,
  },
  olx: {
    name: 'OLX.uz',
    hosts: ['olx.uz', 'www.olx.uz'],
    path: /^\/(?:uz\/|ru\/)?(?:d\/)?obyavlenie\/.+/i,
    interval: 10000,
  },
  uzum: {
    name: 'Uzum Market',
    hosts: ['uzum.uz', 'www.uzum.uz'],
    path: /^\/(?:uz\/|ru\/)?product\/.+/,
    interval: 10000,
  },
  nout: {
    name: 'NOUT.uz',
    hosts: ['nout.uz', 'www.nout.uz'],
    path: /^\/(?:uz\/|ru\/)?(?:product|products|shop)\/.+/,
    interval: 6000,
  },
  computerhouse: {
    name: 'ComputerHouse',
    hosts: ['computerhouse.uz', 'www.computerhouse.uz'],
    path: /^\/(?:uz\/|ru\/)?(?:product|products|noutbuk|monitor|monoblok|printer|videokarta|ssd|hdd|blok-pitaniya|materinskaya-plata|protsessor|korpus|kuler|operativnaya-pamyat)\/[^/]+\/?$/,
    interval: 6000,
  },
  upg: {
    name: 'UPG',
    hosts: ['upg.uz', 'www.upg.uz'],
    path: /^\/(?:uz\/|ru\/)?(?:product|products|shop)\/.+/,
    interval: 6000,
  },
} as const;
export type Source = keyof typeof MARKETPLACES;
export const SOURCES = Object.keys(MARKETPLACES) as Source[];

export function sourceForHost(host: string): Source | undefined {
  return SOURCES.find((source) =>
    (MARKETPLACES[source].hosts as readonly string[]).includes(host),
  );
}

export function listingUrl(input: string): { source: Source; url: URL } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new BadRequestError('Enter a valid marketplace product URL');
  }
  const source = sourceForHost(url.hostname);
  if (
    !source ||
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    !MARKETPLACES[source].path.test(url.pathname) ||
    /%2f|%5c|%00/i.test(url.pathname)
  ) {
    throw new BadRequestError(
      'Enter a supported HTTPS marketplace product URL',
    );
  }
  url.hash = '';
  const variants = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (
      ['sku', 'skuId', 'variant', 'variantId'].includes(key) &&
      /^[a-z0-9_-]{1,64}$/i.test(value)
    ) {
      variants.set(key, value);
    }
  }
  variants.sort();
  url.search = variants.toString();
  url.pathname = url.pathname.replace(/\/+$/, '');
  if (url.href.length > 1000)
    throw new BadRequestError('Product URL is too long');
  return { source, url };
}
