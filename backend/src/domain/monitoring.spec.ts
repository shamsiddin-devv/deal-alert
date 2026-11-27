import {
  DEFAULT_PREFERENCES,
  evaluateAlerts,
  evaluateDeal,
  matchKey,
  type ListingDetails,
  type Observation,
  type WatchOptions,
} from './monitoring';
import { listingUrl } from './marketplace';
import { Email } from './value-objects/Email';

const details: ListingDetails = {
  title: 'Phone 256 GB',
  brand: 'Brand',
  model: 'Model',
  category: null,
  seller: null,
  sellerRating: null,
  condition: 'New',
  description: null,
  images: [],
  specs: [{ label: 'Storage', value: '256 GB' }],
  delivery: 10000,
  warranty: null,
  returns: null,
  gtin: null,
  mpn: null,
};
const snapshot: Observation = {
  details,
  stock: 'in-stock',
  price: 800000,
  advertisedPrice: 1500000,
};
const watch: WatchOptions = {
  targetPrice: 850000,
  dropPercent: 5,
  watchStock: true,
  watchIncreases: false,
  frequency: '6h',
};

describe('monitoring rules', () => {
  it('uses recorded prices to detect an inflated discount', () => {
    expect(
      evaluateDeal({ ...snapshot, price: 1000000 }, 980000, 1000000).verdict,
    ).toBe('Inflated discount');
    expect(evaluateDeal(snapshot, 980000, 1000000).verdict).toBe(
      'Historical low',
    );
    expect(evaluateDeal(snapshot, null, null).score).toBe(0);
  });

  it('fires target on a crossing and does not repeat it for unchanged prices', () => {
    const before = {
      price: 1000000,
      low_price: 900000,
      stock: 'in-stock',
    } as const;
    expect(
      evaluateAlerts(before, snapshot, watch, DEFAULT_PREFERENCES),
    ).toEqual(['target', 'historic-low', 'price-drop']);
    expect(
      evaluateAlerts(
        { ...before, price: 800000, low_price: 800000 },
        snapshot,
        watch,
        DEFAULT_PREFERENCES,
      ),
    ).toEqual([]);
    expect(
      evaluateAlerts(
        before,
        { ...snapshot, price: null, stock: 'out-of-stock' },
        watch,
        DEFAULT_PREFERENCES,
      ),
    ).toEqual(['unavailable']);
  });

  it('matches an exact configuration and distinguishes storage variants', () => {
    expect(matchKey(details)).not.toBeNull();
    expect(matchKey(details)).not.toEqual(
      matchKey({ ...details, specs: [{ label: 'Storage', value: '128 GB' }] }),
    );
    expect(matchKey({ ...details, specs: [] })).toBeNull();
  });

  it('normalizes listing links and email input', () => {
    expect(
      listingUrl(
        'https://asaxiy.uz/product/phone/?utm_source=demo&sku=abc#images',
      ).url.href,
    ).toEqual('https://asaxiy.uz/product/phone?sku=abc');
    expect(() =>
      listingUrl('https://asaxiy.uz.example.test/product/a'),
    ).toThrow();
    expect(() => listingUrl('https://asaxiy.uz/account')).toThrow();
    expect(new Email(' CUSTOMER@EXAMPLE.TEST ').toString()).toBe(
      'customer@example.test',
    );
  });
});
