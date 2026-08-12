CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"zip_code" text,
	"country" text,
	"website" text,
	"industry" text,
	"custom_industry" text,
	"contact_first_name" text,
	"contact_last_name" text,
	"contact_email" text,
	"contact_phone" text,
	"contact_position" text,
	"company" text,
	"notes" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"position" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"value" real NOT NULL,
	"status" text NOT NULL,
	"expected_close_date" text NOT NULL,
	"description" text,
	"signature" text,
	"signed_at" text,
	"signature_token" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"product_id" text,
	"description" text NOT NULL,
	"quantity" real NOT NULL,
	"unit_price" real NOT NULL,
	"tax_rate" real NOT NULL,
	"total_ht" real NOT NULL,
	"total_ttc" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"type" text NOT NULL,
	"number" text NOT NULL,
	"date" text NOT NULL,
	"due_date" text,
	"paid_at" text,
	"payment_link" text,
	"stripe_payment_intent_id" text,
	"payment_intent_id" text,
	"request_id" text,
	"professional_id" text,
	"message" text,
	"status" text NOT NULL,
	"total_ht" real NOT NULL,
	"tax_amount" real NOT NULL,
	"total_ttc" real NOT NULL,
	"signature" text,
	"signature_date" text,
	"signature_ip" text,
	"signed_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"type" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"request_id" text,
	"organization_id" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"sector" text,
	"profile_type" text DEFAULT 'professional',
	"is_public" boolean DEFAULT false,
	"description" text,
	"logo" text,
	"address" text,
	"city" text,
	"postal_code" text,
	"country" text,
	"phone" text,
	"legal_notice" text,
	"payment_terms" text,
	"bank_details" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit_price" real NOT NULL,
	"tax_rate" real DEFAULT 20,
	"type" text DEFAULT 'service',
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"budget" text,
	"deadline" text,
	"status" text DEFAULT 'open',
	"visibility" text DEFAULT 'public',
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"title" text NOT NULL,
	"description" text,
	"due_date" text,
	"status" text NOT NULL,
	"priority" text DEFAULT 'medium',
	"assigned_to" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"name" text,
	"profile_type" text NOT NULL,
	"organization_id" text,
	"onboarding_completed" boolean DEFAULT false,
	"onboarding_step" integer DEFAULT 0,
	"subscription_tier" text DEFAULT 'free',
	"subscription_status" text DEFAULT 'inactive',
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
