import { load, type CheerioAPI } from 'cheerio';
import { ScrapeError } from '../../domain/errors/ScrapeError';
import {
  MARKETPLACES,
  listingUrl,
  type Source,
} from '../../domain/marketplace';
import type {
  Condition,
  Observation,
  Spec,
  Stock,
} from '../../domain/monitoring';

type Json = Record<string, unknown>;
type Profile = {
  title: string;
  price: string;
  old: string;
  stock: string;
  specs: string;
  gallery: string;
};

const profiles: Record<Source, Profile> = {
  asaxiy: {
    title: 'h1.product-title,h1',
    price:
      '.product__price .price,.product-price .current-price,[itemprop=price]',
    old: '.product__price del,.product-price del',
    stock: '.product__availability,.product-status',
    specs: '.product__specifications tr,.product-specs tr',
    gallery: '.product__images img,.product-gallery img',
  },
  mediapark: {
    title: 'main h1,h1',
    price: '[data-testid=product-price],.product-info__price,[itemprop=price]',
    old: '.product-info__old-price,[data-testid=old-price]',
    stock: '[data-testid=product-availability],.product-info__stock',
    specs: '[data-testid=characteristics] tr,.product-characteristics tr',
    gallery: '[data-testid=product-gallery] img,.product-gallery img',
  },
  texnomart: {
    title: '.product__title,h1',
    price:
      '.product-info__price .price,.product-price__current,[itemprop=price]',
    old: '.product-price__old,.product-info__price del',
    stock: '.product-info__availability,.product-stock',
    specs: '.product-specifications tr,.product-characteristics tr',
    gallery: '.product-gallery img,.product-image img',
  },
  ishonch: {
    title: '.product-detail h1,h1',
    price:
      '.product-detail__price .price,.product-price__current,[itemprop=price]',
    old: '.product-detail__price del,.product-price__old',
    stock: '.product-detail__availability,.product-status',
    specs: '.product-detail__characteristics tr,.product-specs tr',
    gallery: '.product-detail__gallery img,.product-gallery img',
  },
  olx: {
    title: '[data-testid=ad_title] h1,[data-testid=ad_title] h4,h1',
    price: '[data-testid=ad-price-container] h3,[itemprop=price]',
    old: '[data-testid=ad-price-container] del',
    stock: '[data-testid=ad-status]',
    specs: '[data-testid=ad-parameters] tr',
    gallery: '[data-testid=swiper-image] img,[data-testid=ad-gallery] img',
  },
  uzum: {
    title: 'main h1,h1',
    price:
      '[data-test-id=product-price],[data-testid=product-price],[itemprop=price]',
    old: '[data-test-id=old-price],[data-testid=old-price]',
    stock: '[data-test-id=product-stock],[data-testid=product-stock]',
    specs:
      '[data-test-id=product-characteristics] tr,.product-characteristics tr',
    gallery: '[data-test-id=product-gallery] img,.product-gallery img',
  },
  nout: {
    title: '.product-info h1,h1',
    price: '.product-info .price-new,.product-price .price,[itemprop=price]',
    old: '.product-info .price-old,.product-price del',
    stock: '.product-info .stock,.product-stock',
    specs: '#tab-specification tr,.product-specifications tr',
    gallery: '.product-info .thumbnails img,.product-gallery img',
  },
  computerhouse: {
    title: '.product-info h1,h1',
    price: '.product-info .price-new,.product-price .current,[itemprop=price]',
    old: '.product-info .price-old,.product-price del',
    stock: '.product-info .stock,.product-availability',
    specs: '#tab-specification tr,.product-attributes tr',
    gallery: '.product-info .thumbnails img,.product-gallery img',
  },
  upg: {
    title: '.product-detail h1,h1',
    price: '.product-info .price-new,.product__price .price,[itemprop=price]',
    old: '.product-info .price-old,.product__price del',
    stock: '.product-info .stock,.product-availability',
    specs: '#tab-specification tr,.product-specs tr',
    gallery: '.product-info .thumbnails img,.product-gallery img',
  },
};

const obj = (value: unknown): Json =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Json)
    : {};
const array = (value: unknown): unknown[] =>
  Array.isArray(value)
    ? value
    : value === undefined || value === null
      ? []
      : [value];
const clean = (value: unknown, max = 500) =>
  typeof value === 'string'
    ? value
        .replace(/\p{Cc}+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max) || null
    : null;
const name = (value: unknown) =>
  clean(typeof value === 'string' ? value : obj(value).name);
const content = ($: CheerioAPI, selector: string) => {
  const element = $(selector).first();
  return clean(
    element.attr('content') ??
      element.attr('data-price') ??
      element.attr('value') ??
      (element.is('link') ? element.attr('href') : undefined) ??
      element.text(),
    1200,
  );
};

export function amount(value: unknown): number | null {
  if (typeof value === 'number')
    return Number.isSafeInteger(value) && value > 0 && value <= 2147483647
      ? value
      : null;
  if (typeof value !== 'string') return null;
  const word = value
    .trim()
    .replace(/(?:UZS|сум(?:ов)?|so[‘’ʻ'ʼ]m)\.?$/iu, '')
    .trim();
  if (!/^(?:\d+|\d{1,3}(?:[ \u00a0\u202f,.]\d{3})+)(?:[,.]0{1,2})?$/.test(word))
    return null;
  return amount(
    Number(word.replace(/[,.]0{1,2}$/, '').replace(/[ \u00a0\u202f,.]/g, '')),
  );
}

function stockOf(input: unknown): Stock {
  const value = (clean(input) ?? '').toLowerCase();
  if (
    /outofstock|soldout|discontinued|нет в наличии|не в наличии|sotuvda yo|mavjud emas|out of stock|sold out/.test(
      value,
    )
  )
    return 'out-of-stock';
  if (
    /instock|limitedavailability|in stock|в наличии|omborda bor|mavjud/.test(
      value,
    )
  )
    return 'in-stock';
  return 'unknown';
}

function conditionOf(input: unknown, source: Source): Condition {
  const value = (clean(input) ?? '').toLowerCase();
  if (/refurbished|восстановлен|qayta tiklangan/.test(value))
    return 'Refurbished';
  if (/like new|как нов|yangi kabi/.test(value)) return 'Used — like new';
  if (/usedcondition|used|б\/у|ishlatilgan/.test(value)) return 'Used';
  if (/newcondition|^new$|^yangi$|^новый$/.test(value)) return 'New';
  return source === 'olx' ? 'Unknown' : 'New';
}

function productNodes(json: unknown): Json[] {
  return array(json).flatMap((value) => {
    const item = obj(value);
    const type = array(item['@type']);
    return [
      ...(type.some(
        (t) => t === 'Product' || t === 'https://schema.org/Product',
      )
        ? [item]
        : []),
      ...array(item['@graph']).flatMap((entry) => {
        const node = obj(entry);
        return array(node['@type']).includes('Product') ? [node] : [];
      }),
      ...(array(obj(item.mainEntity)['@type']).includes('Product')
        ? [obj(item.mainEntity)]
        : []),
    ];
  });
}

function sameListing(input: unknown, url: URL) {
  if (typeof input !== 'string') return false;
  try {
    const parsed = listingUrl(new URL(input, url).href);
    return (
      parsed.url.pathname === url.pathname &&
      parsed.source === listingUrl(url.href).source
    );
  } catch {
    return false;
  }
}

function findStructured($: CheerioAPI, url: URL, title: string | null) {
  const products: Json[] = [];
  $('script[type="application/ld+json"]')
    .slice(0, 30)
    .each((_, script) => {
      const source = $(script).text();
      if (source.length > 350000) return;
      try {
        products.push(...productNodes(JSON.parse(source)));
      } catch {
        /* Reject invalid JSON-LD without executing it */
      }
    });
  return (
    products.find((product) =>
      sameListing(product.url ?? product['@id'], url),
    ) ??
    products.find(
      (product) => Boolean(title) && clean(product.name) === title,
    ) ??
    (products.length === 1 ? products[0] : {})
  );
}

function imagesOf($: CheerioAPI, profile: Profile, product: Json, url: URL) {
  const candidates = array(product.image).map((value) =>
    typeof value === 'string'
      ? value
      : (obj(value).contentUrl ?? obj(value).url),
  );
  candidates.push(content($, 'meta[property="og:image"]'));
  $(profile.gallery)
    .slice(0, 24)
    .each((_, node) => {
      candidates.push($(node).attr('data-src') ?? $(node).attr('src'));
    });
  const images = new Set<string>();
  for (const value of candidates) {
    if (typeof value !== 'string' || !value.trim() || value.length > 1200)
      continue;
    try {
      const resolved = new URL(value, url);
      if (
        resolved.protocol === 'https:' &&
        !resolved.username &&
        !resolved.password &&
        !resolved.port
      )
        images.add(resolved.href);
    } catch {
      /* Bad image URLs are ignored */
    }
  }
  return [...images].slice(0, 15);
}

function specsOf($: CheerioAPI, profile: Profile, product: Json) {
  const specs: Spec[] = [];
  const add = (a: unknown, b: unknown) => {
    const label = clean(a, 120),
      value = clean(b, 400);
    if (
      label &&
      value &&
      !specs.some((spec) => spec.label.toLowerCase() === label.toLowerCase())
    )
      specs.push({ label, value });
  };
  for (const entry of array(product.additionalProperty).slice(0, 60)) {
    const property = obj(entry);
    add(
      property.name,
      typeof property.value === 'number'
        ? String(property.value)
        : property.value,
    );
  }
  $(profile.specs)
    .slice(0, 50)
    .each((_, node) => {
      const fields = $(node).find('th,td');
      if (fields.length === 2) add(fields.eq(0).text(), fields.eq(1).text());
    });
  return specs.slice(0, 60);
}

function offerFor(product: Json, url: URL) {
  const offers = array(product.offers).map(obj);
  const selected =
    url.searchParams.get('skuId') ??
    url.searchParams.get('sku') ??
    url.searchParams.get('variant') ??
    url.searchParams.get('variantId');
  if (selected) {
    return (
      offers.find(
        (offer) =>
          sku(offer.sku ?? offer.productID) === selected ||
          (typeof offer.url === 'string' &&
            (() => {
              try {
                const target = new URL(offer.url, url);
                return [...target.searchParams].some(
                  ([key, value]) =>
                    ['sku', 'skuId', 'variant', 'variantId'].includes(key) &&
                    value === selected,
                );
              } catch {
                return false;
              }
            })()),
      ) ?? null
    );
  }
  if (offers.length === 1) return offers[0];
  if (offers.length > 1)
    return offers.find((offer) => sameListing(offer.url, url)) ?? null;
  return {};
}

function sku(value: unknown) {
  return typeof value === 'number' ? String(value) : clean(value, 64);
}

export function parseListing(
  source: Source,
  url: URL,
  html: string,
): Observation {
  const $ = load(html);
  const profile = profiles[source];
  const heading = content($, profile.title);
  const product = findStructured($, url, heading);
  const offer = offerFor(product, url);
  if (!offer) throw new ScrapeError('VARIANT_UNRESOLVED', 86400000);
  const specification = obj(offer.priceSpecification);
  const seller = obj(offer.seller ?? product.seller);
  const currency = clean(
    offer.priceCurrency ??
      specification.priceCurrency ??
      content(
        $,
        'meta[property="product:price:currency"],[itemprop=priceCurrency]',
      ),
  );
  if (currency && currency.toUpperCase() !== 'UZS')
    throw new ScrapeError('UNSUPPORTED_CURRENCY', 86400000);
  const price = amount(
    offer.price ??
      specification.price ??
      content(
        $,
        'meta[property="product:price:amount"],meta[itemprop=price]',
      ) ??
      content($, profile.price),
  );
  const stock = stockOf(
    offer.availability ??
      content($, '[itemprop=availability]') ??
      content($, profile.stock),
  );
  const title = clean(product.name) ?? heading;
  if (!title || (price === null && stock !== 'out-of-stock'))
    throw new ScrapeError('PRODUCT_NOT_EXTRACTED');
  const description =
    clean(product.description, 8000) ??
    content($, 'meta[name=description],meta[property="og:description"]');
  const rating = Number(obj(seller.aggregateRating).ratingValue);
  const shipping = obj(obj(offer.shippingDetails).shippingRate);
  const delivery =
    shipping.currency === 'UZS'
      ? String(shipping.value) === '0'
        ? 0
        : amount(shipping.value)
      : null;
  const advertisedPrice = amount(content($, profile.old));
  let canonicalUrl: string | undefined;
  const canonical = $('link[rel=canonical]').attr('href');
  if (canonical && !url.search) {
    try {
      const input = listingUrl(new URL(canonical, url).href);
      if (input.source === source) canonicalUrl = input.url.href;
    } catch {
      /* Only canonical product URLs on the same source are accepted */
    }
  }
  return {
    price,
    stock,
    advertisedPrice:
      advertisedPrice !== null && price !== null && advertisedPrice > price
        ? advertisedPrice
        : null,
    canonicalUrl,
    details: {
      title,
      brand: name(product.brand ?? product.manufacturer),
      model: name(product.model),
      category: name(product.category),
      seller:
        name(seller) ??
        (source !== 'olx' && source !== 'uzum'
          ? MARKETPLACES[source].name
          : null),
      sellerRating:
        Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : null,
      condition: conditionOf(
        offer.itemCondition ?? product.itemCondition,
        source,
      ),
      description: description ? clean(load(description).text(), 5000) : null,
      images: imagesOf($, profile, product, url),
      specs: specsOf($, profile, product),
      delivery,
      warranty: name(offer.warranty ?? product.warranty),
      returns: name(offer.hasMerchantReturnPolicy),
      gtin: clean(
        product.gtin ??
          product.gtin13 ??
          product.gtin12 ??
          product.gtin14 ??
          product.gtin8,
        20,
      ),
      mpn: clean(product.mpn, 120),
    },
  };
}
