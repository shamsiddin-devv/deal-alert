import { MARKETPLACES, SOURCES } from '../../domain/marketplace';
import { parseListing, amount } from './adapters';

describe('marketplace adapters', () => {
  it.each(SOURCES)(
    'normalizes the %s HTML product representation',
    (source) => {
      const path = source === 'olx' ? '/obyavlenie/phone' : '/product/phone';
      const url = new URL('https://' + MARKETPLACES[source].hosts[0] + path);
      const json = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Phone 256 GB',
        url: url.href,
        model: 'P-256',
        brand: { name: 'Example' },
        gtin13: '1234567890123',
        image: ['https://cdn.example.test/phone.webp'],
        description: 'A phone',
        additionalProperty: [{ name: 'Storage', value: '256 GB' }],
        offers: {
          price: '1 299 000',
          priceCurrency: 'UZS',
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            name: 'Example Store',
            aggregateRating: { ratingValue: 4.8 },
          },
          shippingDetails: { shippingRate: { currency: 'UZS', value: 20000 } },
        },
      };
      const result = parseListing(
        source,
        url,
        '<h1>Phone 256 GB</h1><script type="application/ld+json">' +
          JSON.stringify(json) +
          '</script>',
      );
      expect(result.price).toBe(1299000);
      expect(result.stock).toBe('in-stock');
      expect(result.details).toMatchObject({
        condition: 'New',
        seller: 'Example Store',
        sellerRating: 4.8,
        delivery: 20000,
        specs: [{ label: 'Storage', value: '256 GB' }],
      });
    },
  );

  it('reads a source selector when structured data is absent and ignores installment displays', () => {
    const url = new URL('https://asaxiy.uz/product/phone');
    expect(
      parseListing(
        'asaxiy',
        url,
        '<h1>Phone</h1><div class="product__price"><span class="price">5 499 000 UZS</span><del>6 000 000 UZS</del></div>',
      ),
    ).toMatchObject({ price: 5499000, advertisedPrice: 6000000 });
    expect(amount("520 000 so'm x 12 oy")).toBeNull();
    expect(amount('100 USD')).toBeNull();
  });

  it('does not substitute a different variant or treat an empty page as a valid listing', () => {
    expect(() =>
      parseListing(
        'uzum',
        new URL('https://uzum.uz/uz/product/phone?skuId=1'),
        '<h1>Phone</h1><div itemprop="price" content="2000"></div>',
      ),
    ).toThrow('VARIANT_UNRESOLVED');
    expect(() =>
      parseListing(
        'uzum',
        new URL('https://uzum.uz/uz/product/phone'),
        '<h1>Checking your browser</h1>',
      ),
    ).toThrow('PRODUCT_NOT_EXTRACTED');
  });
});
