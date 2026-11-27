CREATE TYPE "public"."listing_stock" AS ENUM('in-stock', 'out-of-stock', 'unknown');--> statement-breakpoint
ALTER TYPE "public"."tracked_product_statu" ADD VALUE 'UNAVAILABLE';--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"watch_id" uuid,
	"listing_id" uuid,
	"event_key" text NOT NULL,
	"source" "source" NOT NULL,
	"type" varchar(20) NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"old_price" integer,
	"new_price" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auth_challenges" (
	"user_id" uuid NOT NULL,
	"kind" varchar(12) NOT NULL,
	"digest" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 5 NOT NULL,
	CONSTRAINT "auth_challenges_user_id_kind_pk" PRIMARY KEY("user_id","kind")
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"collection_id" uuid NOT NULL,
	"watch_id" uuid NOT NULL,
	CONSTRAINT "collection_items_collection_id_watch_id_pk" PRIMARY KEY("collection_id","watch_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "source" NOT NULL,
	"url" varchar(1000) NOT NULL,
	"details" jsonb NOT NULL,
	"price" integer,
	"previous_price" integer,
	"first_price" integer,
	"low_price" integer,
	"advertised_price" integer,
	"stock" "listing_stock" DEFAULT 'unknown' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"verdict" text DEFAULT 'Not enough price history' NOT NULL,
	"match_key" text,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone,
	"lease_until" timestamp with time zone,
	"lease_token" uuid,
	"failures" integer DEFAULT 0 NOT NULL,
	"last_error" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_listings_url_unique" UNIQUE("url"),
	CONSTRAINT "market_listing_price_positive" CHECK ("market_listings"."price" is null or "market_listings"."price" > 0),
	CONSTRAINT "market_listing_score_range" CHECK ("market_listings"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "price_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"price" integer,
	"previous_price" integer,
	"stock" "listing_stock" NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_observation_positive" CHECK ("price_observations"."price" is null or "price_observations"."price" > 0)
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_key" text NOT NULL,
	"payload" text NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_outbox_event_key_unique" UNIQUE("event_key")
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"paid" integer NOT NULL,
	"reference_price" integer,
	"request_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_paid_positive" CHECK ("purchases"."paid" > 0)
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"digest" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"agent" varchar(255),
	CONSTRAINT "auth_sessions_digest_unique" UNIQUE("digest")
);
--> statement-breakpoint
CREATE TABLE "source_budgets" (
	"source" "source" PRIMARY KEY NOT NULL,
	"next_request_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" varchar(120) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_throttles" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tracked_products" ADD COLUMN "listing_id" uuid;--> statement-breakpoint
ALTER TABLE "tracked_products" ADD COLUMN "options" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferences" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_mime" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_bytes" "bytea";--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_watch_id_tracked_products_id_fk" FOREIGN KEY ("watch_id") REFERENCES "public"."tracked_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_listing_id_market_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."market_listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_watch_id_tracked_products_id_fk" FOREIGN KEY ("watch_id") REFERENCES "public"."tracked_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_listing_id_market_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."market_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_listing_id_market_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."market_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_owner_event_uidx" ON "alerts" USING btree ("user_id","event_key");--> statement-breakpoint
CREATE INDEX "alerts_owner_recent_idx" ON "alerts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "collection_items_watch_idx" ON "collection_items" USING btree ("watch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_owner_name_uidx" ON "collections" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "market_listings_source_schedule_idx" ON "market_listings" USING btree ("source","scheduled_at");--> statement-breakpoint
CREATE INDEX "market_listings_match_idx" ON "market_listings" USING btree ("match_key");--> statement-breakpoint
CREATE INDEX "market_listings_score_idx" ON "market_listings" USING btree ("score","id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_observations_listing_time_uidx" ON "price_observations" USING btree ("listing_id","checked_at");--> statement-breakpoint
CREATE INDEX "email_outbox_schedule_idx" ON "email_outbox" USING btree ("scheduled_at") WHERE "email_outbox"."delivered_at" is null and "email_outbox"."failed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_owner_request_uidx" ON "purchases" USING btree ("user_id","request_key");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
ALTER TABLE "tracked_products" ADD CONSTRAINT "tracked_products_listing_id_market_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."market_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tracked_products_owner_listing_uidx" ON "tracked_products" USING btree ("user_id","listing_id");--> statement-breakpoint
CREATE INDEX "tracked_products_listing_status_idx" ON "tracked_products" USING btree ("listing_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_folded_uidx" ON "users" USING btree (lower("email"));