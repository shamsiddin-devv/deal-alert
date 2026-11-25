INSERT INTO market_listings(source,url,details,price,first_price,low_price,last_checked_at)
SELECT DISTINCT ON(t.product_url) upper(t.source)::source,t.product_url,
  jsonb_build_object('title',coalesce(nullif(t.product_name,''),t.product_url),'brand',null,'model',null,
    'category',null,'seller',null,'sellerRating',null,'condition','Unknown','description',null,
    'images','[]'::jsonb,'specs','[]'::jsonb,'delivery',null,'warranty',null,'returns',null,'gtin',null,'mpn',null),
  CASE WHEN t.current_price>0 THEN t.current_price END,
  CASE WHEN t.current_price>0 THEN t.current_price END,
  CASE WHEN t.current_price>0 THEN t.current_price END,
  CASE WHEN t.current_price>0 THEN t."updatedAt" AT TIME ZONE 'UTC' END
FROM tracked_products t
WHERE t.listing_id IS NULL AND t.product_url LIKE 'https://%'
  AND upper(t.source) IN ('OLX','UZUM','ASAXIY','MEDIAPARK','TEXNOMART','ISHONCH','NOUT','COMPUTERHOUSE','UPG')
ORDER BY t.product_url,t."updatedAt" DESC,t.id
ON CONFLICT(url) DO NOTHING;
--> statement-breakpoint
WITH legacy AS (
  SELECT DISTINCT ON (t.user_id,l.id) t.id, l.id listing_id, t.target_price
  FROM tracked_products t JOIN market_listings l ON l.url=t.product_url AND l.source::text=upper(t.source)
  WHERE t.listing_id IS NULL
  ORDER BY t.user_id,l.id,t."updatedAt" DESC,t.id
)
UPDATE tracked_products t
SET listing_id=legacy.listing_id,
  status=coalesce(t.status,'ACTIVE'),
  options=jsonb_build_object('targetPrice',greatest(legacy.target_price,1),'dropPercent',5,
    'watchStock',true,'watchIncreases',false,'frequency','6h')
FROM legacy WHERE t.id=legacy.id
  AND NOT EXISTS(SELECT 1 FROM tracked_products old WHERE old.user_id=t.user_id AND old.listing_id=legacy.listing_id);
--> statement-breakpoint
WITH sample AS (
  SELECT DISTINCT ON(l.id,h."checkedAt") l.id AS listing_id,h.price,h."checkedAt" AT TIME ZONE 'UTC' AS checked_at
  FROM price_history h JOIN tracked_products t ON t.id=h.tracked_product_id
  JOIN market_listings l ON l.url=t.product_url AND l.source::text=upper(t.source)
  WHERE h.price>0
  ORDER BY l.id,h."checkedAt",h.id
)
INSERT INTO price_observations(listing_id,price,previous_price,stock,checked_at)
SELECT listing_id,price,lag(price) OVER(PARTITION BY listing_id ORDER BY checked_at),'unknown',checked_at
FROM sample ON CONFLICT(listing_id,checked_at) DO NOTHING;
--> statement-breakpoint
WITH stats AS (
  SELECT listing_id,min(price) AS low,
    (array_agg(price ORDER BY checked_at))[1] AS first,
    (array_agg(price ORDER BY checked_at DESC))[1] AS latest,max(checked_at) AS latest_at
  FROM price_observations GROUP BY listing_id
)
UPDATE market_listings l SET first_price=stats.first,low_price=least(l.low_price,stats.low),
  price=coalesce(l.price,stats.latest),last_checked_at=greatest(l.last_checked_at,stats.latest_at)
FROM stats WHERE l.id=stats.listing_id;
