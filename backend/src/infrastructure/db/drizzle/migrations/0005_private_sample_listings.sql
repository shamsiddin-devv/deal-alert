ALTER TABLE "market_listings" ADD COLUMN "sample_owner_id" uuid;--> statement-breakpoint
ALTER TABLE "market_listings" ADD CONSTRAINT "market_listings_sample_owner_id_users_id_fk" FOREIGN KEY ("sample_owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "market_listings_sample_owner_idx" ON "market_listings" USING btree ("sample_owner_id") WHERE "market_listings"."sample_owner_id" is not null;
--> statement-breakpoint
WITH demo_accounts AS (
  SELECT DISTINCT t.user_id
  FROM tracked_products t
  JOIN market_listings l ON l.id = t.listing_id
  WHERE l.url LIKE 'https://deal-alert-demo.invalid/uz/%'
), demo_owner AS (
  SELECT min(user_id::text)::uuid AS user_id
  FROM demo_accounts
  HAVING count(*) = 1
)
UPDATE market_listings l
SET sample_owner_id = demo_owner.user_id,
    scheduled_at = 'infinity',
    details = jsonb_set(l.details, '{images}', coalesce((
      SELECT jsonb_agg(
        CASE WHEN image.url ~ '^/images/da-[a-z0-9-]+[.]jpg$'
          THEN '/images/products/' || split_part(image.url, '/', 3)
          ELSE image.url END ORDER BY image.position
      )
      FROM jsonb_array_elements_text(l.details->'images') WITH ORDINALITY AS image(url, position)
    ), '[]'::jsonb))
FROM demo_owner
WHERE l.url LIKE 'https://deal-alert-demo.invalid/uz/%';
