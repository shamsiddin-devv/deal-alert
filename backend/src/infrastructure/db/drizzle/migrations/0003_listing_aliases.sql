CREATE TABLE "market_listing_aliases" (
	"url" varchar(1000) PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "market_listings" ADD COLUMN "unavailable_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "market_listing_aliases" ADD CONSTRAINT "market_listing_aliases_listing_id_market_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."market_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "market_listing_aliases_listing_idx" ON "market_listing_aliases" USING btree ("listing_id");