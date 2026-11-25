CREATE TYPE "public"."source" AS ENUM('OLX', 'UZUM', 'ASAXIY', 'MEDIAPARK', 'TEXNOMART', 'ISHONCH', 'NOUT', 'COMPUTERHOUSE', 'UPG');--> statement-breakpoint
CREATE TYPE "public"."tracked_product_statu" AS ENUM('ACTIVE', 'TRIGGERED', 'PAUSED');--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracked_product_id" uuid NOT NULL,
	"price" integer NOT NULL,
	"checkedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_url" varchar(1000) NOT NULL,
	"product_name" varchar(500),
	"source" varchar NOT NULL,
	"target_price" integer NOT NULL,
	"current_price" integer,
	"status" "tracked_product_statu" DEFAULT 'ACTIVE',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone_number" varchar(255) NOT NULL,
	"chat_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_tracked_product_id_tracked_products_id_fk" FOREIGN KEY ("tracked_product_id") REFERENCES "public"."tracked_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_products" ADD CONSTRAINT "tracked_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;