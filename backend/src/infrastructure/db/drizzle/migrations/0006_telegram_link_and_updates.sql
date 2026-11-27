CREATE TABLE "telegram_link_challenges" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"digest" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "telegram_link_challenges_digest_unique" UNIQUE("digest")
);
--> statement-breakpoint
CREATE TABLE "telegram_updates" (
	"id" integer PRIMARY KEY NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_link_challenges" ADD CONSTRAINT "telegram_link_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "telegram_updates_received_at_idx" ON "telegram_updates" USING btree ("received_at");