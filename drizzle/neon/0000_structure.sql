-- Canonical 0000–0023 business structure. No historical file changed.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11 (Homebrew)
-- Dumped by pg_dump version 17.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: appointment_reminder_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_reminder_deliveries (
    id text NOT NULL,
    organization_id text NOT NULL,
    appointment_id text NOT NULL,
    channel text DEFAULT 'email'::text NOT NULL,
    offset_minutes integer NOT NULL,
    recipient_email_hash text,
    sent_at timestamp with time zone,
    status text NOT NULL,
    provider_message_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT appointment_reminders_channel_check CHECK ((channel = 'email'::text)),
    CONSTRAINT appointment_reminders_sent_at_check CHECK ((((status = 'sent'::text) AND (sent_at IS NOT NULL)) OR ((status = ANY (ARRAY['pending'::text, 'failed'::text])) AND (sent_at IS NULL)))),
    CONSTRAINT appointment_reminders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: appointment_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_types (
    id text NOT NULL,
    organization_id text NOT NULL,
    name text NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    buffer_before_minutes integer DEFAULT 0 NOT NULL,
    buffer_after_minutes integer DEFAULT 0 NOT NULL,
    slot_step_minutes integer DEFAULT 15 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT appointment_types_buffer_after_check CHECK (((buffer_after_minutes >= 0) AND (buffer_after_minutes <= 240))),
    CONSTRAINT appointment_types_buffer_before_check CHECK (((buffer_before_minutes >= 0) AND (buffer_before_minutes <= 240))),
    CONSTRAINT appointment_types_duration_check CHECK (((duration_minutes >= 5) AND (duration_minutes <= 480))),
    CONSTRAINT appointment_types_slot_step_check CHECK (((slot_step_minutes >= 5) AND (slot_step_minutes <= 120)))
);


--
-- Name: appointment_waitlist_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointment_waitlist_entries (
    id text NOT NULL,
    organization_id text NOT NULL,
    patient_id text NOT NULL,
    appointment_type_id text NOT NULL,
    location_id text NOT NULL,
    practitioner_id text,
    preferred_date_from date NOT NULL,
    preferred_date_until date,
    preferred_start_time time without time zone,
    preferred_end_time time without time zone,
    timezone text NOT NULL,
    status text DEFAULT 'waiting'::text NOT NULL,
    resolution_code text,
    resolved_at timestamp with time zone,
    resolved_appointment_id text,
    created_by_user_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT waitlist_date_check CHECK (((preferred_date_until IS NULL) OR (preferred_date_until >= preferred_date_from))),
    CONSTRAINT waitlist_resolution_code_check CHECK (((resolution_code IS NULL) OR (resolution_code = ANY (ARRAY['booked'::text, 'withdrawn'::text, 'not_needed'::text, 'other'::text])))),
    CONSTRAINT waitlist_state_check CHECK ((((status = 'waiting'::text) AND (resolution_code IS NULL) AND (resolved_at IS NULL) AND (resolved_appointment_id IS NULL)) OR ((status = 'resolved'::text) AND (resolution_code = 'booked'::text) AND (resolved_at IS NOT NULL) AND (resolved_appointment_id IS NOT NULL)) OR ((status = 'resolved'::text) AND (resolution_code = ANY (ARRAY['withdrawn'::text, 'not_needed'::text, 'other'::text])) AND (resolved_at IS NOT NULL) AND (resolved_appointment_id IS NULL)))),
    CONSTRAINT waitlist_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'resolved'::text]))),
    CONSTRAINT waitlist_time_check CHECK ((((preferred_start_time IS NULL) AND (preferred_end_time IS NULL)) OR ((preferred_start_time IS NOT NULL) AND (preferred_end_time IS NOT NULL) AND (preferred_start_time < preferred_end_time))))
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id text NOT NULL,
    organization_id text NOT NULL,
    patient_id text NOT NULL,
    practitioner_id text NOT NULL,
    appointment_type_id text NOT NULL,
    location_id text NOT NULL,
    room_id text,
    created_by_user_id text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    occupancy_starts_at timestamp with time zone NOT NULL,
    occupancy_ends_at timestamp with time zone NOT NULL,
    timezone text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cancellation_reason_code text,
    cancelled_at timestamp with time zone,
    no_show_at timestamp with time zone,
    CONSTRAINT appointments_cancellation_reason_check CHECK (((cancellation_reason_code IS NULL) OR (cancellation_reason_code = ANY (ARRAY['patient_request'::text, 'practitioner_request'::text, 'practice_unavailable'::text, 'scheduling_error'::text, 'duplicate'::text, 'other'::text])))),
    CONSTRAINT appointments_occupancy_ends_check CHECK ((occupancy_ends_at >= ends_at)),
    CONSTRAINT appointments_occupancy_order_check CHECK ((occupancy_starts_at < occupancy_ends_at)),
    CONSTRAINT appointments_occupancy_starts_check CHECK ((occupancy_starts_at <= starts_at)),
    CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'cancelled'::text, 'no_show'::text]))),
    CONSTRAINT appointments_status_metadata_check CHECK ((((status = 'scheduled'::text) AND (cancellation_reason_code IS NULL) AND (cancelled_at IS NULL) AND (no_show_at IS NULL)) OR ((status = 'cancelled'::text) AND (cancellation_reason_code IS NOT NULL) AND (cancelled_at IS NOT NULL) AND (no_show_at IS NULL)) OR ((status = 'no_show'::text) AND (cancellation_reason_code IS NULL) AND (cancelled_at IS NULL) AND (no_show_at IS NOT NULL)))),
    CONSTRAINT appointments_time_check CHECK ((starts_at < ends_at))
);


--
-- Name: archived_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archived_documents (
    id text NOT NULL,
    document_id text NOT NULL,
    document_type text,
    organization_id text NOT NULL,
    retention_date timestamp without time zone NOT NULL,
    archived_at timestamp without time zone DEFAULT now(),
    anonymized boolean DEFAULT false,
    expiration_status text,
    notes text
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    user_id text,
    organization_id text,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    old_values text,
    new_values text,
    ip text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: billing_document_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_document_sequences (
    organization_id text NOT NULL,
    document_type text NOT NULL,
    year integer NOT NULL,
    last_sequence integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT billing_document_sequences_seq_check CHECK ((last_sequence >= 0)),
    CONSTRAINT billing_document_sequences_type_check CHECK ((document_type = ANY (ARRAY['invoice'::text, 'quote'::text])))
);


--
-- Name: breach_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.breach_notifications (
    id text NOT NULL,
    organization_id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    discovery_date timestamp without time zone NOT NULL,
    start_date timestamp without time zone,
    data_categories text,
    affected_individuals integer,
    risk_level text,
    corrective_actions text,
    notified_authority boolean DEFAULT false,
    notification_date timestamp without time zone,
    notified_individuals boolean DEFAULT false,
    status text DEFAULT 'open'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: care_episodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.care_episodes (
    id text NOT NULL,
    organization_id text NOT NULL,
    patient_id text NOT NULL,
    practitioner_id text NOT NULL,
    title text,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT care_episodes_status_check CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text]))),
    CONSTRAINT care_episodes_status_metadata_check CHECK ((((status = 'active'::text) AND (closed_at IS NULL)) OR ((status = 'closed'::text) AND (closed_at IS NOT NULL)))),
    CONSTRAINT care_episodes_title_length_check CHECK (((title IS NULL) OR ((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(title) <= 160))))
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id text NOT NULL,
    organization_id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    city text,
    zip_code text,
    country text,
    website text,
    industry text,
    custom_industry text,
    contact_first_name text,
    contact_last_name text,
    contact_email text,
    contact_phone text,
    contact_position text,
    company text,
    notes text,
    created_at text NOT NULL,
    updated_at text NOT NULL,
    user_id text,
    legal_entity_id text
);


--
-- Name: clinical_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_documents (
    id text NOT NULL,
    organization_id text NOT NULL,
    patient_id text NOT NULL,
    practitioner_id text NOT NULL,
    care_episode_id text,
    encounter_id text,
    title text NOT NULL,
    category text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL,
    storage_path text NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    patient_visible boolean DEFAULT false NOT NULL,
    CONSTRAINT clinical_documents_category_check CHECK ((category = ANY (ARRAY['report'::text, 'assessment'::text, 'prescription'::text, 'referral'::text, 'result'::text, 'consent'::text, 'correspondence'::text, 'administrative'::text, 'other'::text]))),
    CONSTRAINT clinical_documents_file_name_check CHECK (((char_length(TRIM(BOTH FROM file_name)) >= 1) AND (char_length(file_name) <= 255))),
    CONSTRAINT clinical_documents_mime_type_check CHECK ((mime_type = ANY (ARRAY['application/pdf'::text, 'image/jpeg'::text, 'image/png'::text, 'image/webp'::text]))),
    CONSTRAINT clinical_documents_size_check CHECK (((size_bytes > 0) AND (size_bytes <= 10485760))),
    CONSTRAINT clinical_documents_title_check CHECK (((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(title) <= 200)))
);


--
-- Name: clinical_encounters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_encounters (
    id text NOT NULL,
    organization_id text NOT NULL,
    care_episode_id text NOT NULL,
    patient_id text NOT NULL,
    practitioner_id text NOT NULL,
    appointment_id text,
    occurred_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clinical_form_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_form_responses (
    id text NOT NULL,
    organization_id text NOT NULL,
    template_id text NOT NULL,
    patient_id text NOT NULL,
    practitioner_id text NOT NULL,
    care_episode_id text,
    encounter_id text,
    answers_json jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    finalized_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clinical_form_responses_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'finalized'::text]))),
    CONSTRAINT clinical_form_responses_status_metadata_check CHECK ((((status = 'draft'::text) AND (finalized_at IS NULL)) OR ((status = 'finalized'::text) AND (finalized_at IS NOT NULL))))
);


--
-- Name: clinical_form_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_form_templates (
    id text NOT NULL,
    organization_id text NOT NULL,
    practitioner_id text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    description text,
    schema_json jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clinical_form_templates_kind_check CHECK ((kind = ANY (ARRAY['assessment'::text, 'questionnaire'::text, 'intake'::text, 'follow_up'::text, 'outcome'::text, 'other'::text]))),
    CONSTRAINT clinical_form_templates_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(name) <= 200)))
);


--
-- Name: clinical_measurements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_measurements (
    id text NOT NULL,
    organization_id text NOT NULL,
    patient_id text NOT NULL,
    practitioner_id text NOT NULL,
    care_episode_id text,
    encounter_id text,
    code text NOT NULL,
    label text NOT NULL,
    value_numeric numeric,
    value_text text,
    unit text,
    observed_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clinical_measurements_code_format_check CHECK ((code ~ '^[a-z0-9][a-z0-9_.-]{0,99}$'::text)),
    CONSTRAINT clinical_measurements_label_check CHECK (((char_length(TRIM(BOTH FROM label)) >= 1) AND (char_length(label) <= 160))),
    CONSTRAINT clinical_measurements_unit_check CHECK (((unit IS NULL) OR (char_length(unit) <= 40))),
    CONSTRAINT clinical_measurements_value_text_check CHECK (((value_text IS NULL) OR (char_length(value_text) <= 500))),
    CONSTRAINT clinical_measurements_value_xor_check CHECK ((((value_numeric IS NOT NULL) AND (value_text IS NULL)) OR ((value_numeric IS NULL) AND (value_text IS NOT NULL))))
);


--
-- Name: clinical_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_notes (
    id text NOT NULL,
    organization_id text NOT NULL,
    encounter_id text NOT NULL,
    patient_id text NOT NULL,
    author_practitioner_id text NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    finalized_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clinical_notes_content_length_check CHECK (((char_length(TRIM(BOTH FROM content)) >= 1) AND (char_length(content) <= 50000))),
    CONSTRAINT clinical_notes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'finalized'::text]))),
    CONSTRAINT clinical_notes_status_metadata_check CHECK ((((status = 'draft'::text) AND (finalized_at IS NULL)) OR ((status = 'finalized'::text) AND (finalized_at IS NOT NULL))))
);


--
-- Name: consent_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consent_events (
    id text NOT NULL,
    user_id text,
    organization_id text,
    consent_type text NOT NULL,
    consent_value text NOT NULL,
    legal_basis text,
    source text,
    ip text,
    user_agent text,
    policy_version text,
    "timestamp" timestamp without time zone DEFAULT now()
);


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id text NOT NULL,
    organization_id text NOT NULL,
    client_id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    "position" text NOT NULL,
    created_at text NOT NULL,
    updated_at text NOT NULL
);


--
-- Name: country_compliance_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.country_compliance_profiles (
    id text NOT NULL,
    country text NOT NULL,
    version text NOT NULL,
    effective_from timestamp without time zone NOT NULL,
    vat_standard numeric(14,2) NOT NULL,
    vat_reduced numeric(14,2),
    vat_reduced_2 numeric(14,2),
    vat_reduced_3 numeric(14,2),
    retention_years integer NOT NULL,
    einvoice_mandatory boolean DEFAULT false,
    einvoice_format text,
    einvoice_network text,
    legal_mentions text,
    marketing_rule text,
    privacy_authority text,
    dpo_threshold integer,
    archiving_requirements text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: data_subject_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_subject_requests (
    id text NOT NULL,
    user_id text,
    organization_id text,
    request_type text NOT NULL,
    status text NOT NULL,
    request_details text,
    response text,
    deadline timestamp without time zone,
    received_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    processed_by text
);


--
-- Name: deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deals (
    id text NOT NULL,
    organization_id text NOT NULL,
    client_id text NOT NULL,
    name text NOT NULL,
    value numeric(14,2) NOT NULL,
    status text NOT NULL,
    expected_close_date text NOT NULL,
    description text,
    signature text,
    signed_at text,
    signature_token text,
    created_at text NOT NULL,
    updated_at text NOT NULL
);


--
-- Name: field_service_sites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_service_sites (
    id text NOT NULL,
    organization_id text NOT NULL,
    client_id text NOT NULL,
    label text NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text,
    postal_code text NOT NULL,
    city text NOT NULL,
    country text DEFAULT 'FR'::text NOT NULL,
    latitude double precision,
    longitude double precision,
    access_instructions text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT field_service_sites_country_check CHECK (((country = upper(country)) AND (char_length(country) = 2))),
    CONSTRAINT field_service_sites_label_check CHECK (((char_length(TRIM(BOTH FROM label)) >= 1) AND (char_length(TRIM(BOTH FROM label)) <= 160))),
    CONSTRAINT field_service_sites_latitude_check CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)))),
    CONSTRAINT field_service_sites_longitude_check CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))))
);


--
-- Name: field_service_work_order_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_service_work_order_assignments (
    id text NOT NULL,
    organization_id text NOT NULL,
    work_order_id text NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'technician'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    removed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT field_service_assignments_active_removed_check CHECK ((((is_active = true) AND (removed_at IS NULL)) OR ((is_active = false) AND (removed_at IS NOT NULL)))),
    CONSTRAINT field_service_assignments_role_check CHECK ((role = ANY (ARRAY['lead'::text, 'technician'::text, 'assistant'::text, 'observer'::text])))
);


--
-- Name: field_service_work_order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_service_work_order_status_history (
    id text NOT NULL,
    organization_id text NOT NULL,
    work_order_id text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    changed_by_user_id text,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT field_service_status_history_from_status_check CHECK (((from_status IS NULL) OR (from_status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'in_progress'::text, 'paused'::text, 'completed'::text, 'cancelled'::text])))),
    CONSTRAINT field_service_status_history_to_status_check CHECK ((to_status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'in_progress'::text, 'paused'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: field_service_work_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_service_work_orders (
    id text NOT NULL,
    organization_id text NOT NULL,
    client_id text NOT NULL,
    site_id text,
    created_by_user_id text NOT NULL,
    reference text NOT NULL,
    title text NOT NULL,
    description text,
    work_type text DEFAULT 'intervention'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    scheduled_start timestamp with time zone,
    scheduled_end timestamp with time zone,
    actual_start timestamp with time zone,
    actual_end timestamp with time zone,
    cancellation_reason_code text,
    cancellation_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source_quote_id text,
    CONSTRAINT field_service_work_orders_actual_dates_check CHECK (((actual_end IS NULL) OR ((actual_start IS NOT NULL) AND (actual_end >= actual_start)))),
    CONSTRAINT field_service_work_orders_cancellation_reason_check CHECK ((((status <> 'cancelled'::text) AND (cancellation_reason_code IS NULL)) OR ((status = 'cancelled'::text) AND (cancellation_reason_code = ANY (ARRAY['customer_request'::text, 'unavailable'::text, 'duplicate'::text, 'quote_not_accepted'::text, 'scheduling_issue'::text, 'technical_impossibility'::text, 'other'::text]))))),
    CONSTRAINT field_service_work_orders_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT field_service_work_orders_reference_check CHECK (((char_length(TRIM(BOTH FROM reference)) >= 1) AND (char_length(TRIM(BOTH FROM reference)) <= 64))),
    CONSTRAINT field_service_work_orders_schedule_dates_check CHECK (((scheduled_start IS NULL) OR (scheduled_end IS NULL) OR (scheduled_end > scheduled_start))),
    CONSTRAINT field_service_work_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'in_progress'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT field_service_work_orders_title_check CHECK (((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 200))),
    CONSTRAINT field_service_work_orders_work_type_check CHECK ((work_type = ANY (ARRAY['job'::text, 'intervention'::text, 'installation'::text, 'maintenance'::text, 'repair'::text, 'inspection'::text, 'project'::text, 'other'::text])))
);


--
-- Name: field_service_work_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_service_work_reports (
    id text NOT NULL,
    organization_id text NOT NULL,
    work_order_id text NOT NULL,
    author_user_id text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    summary text NOT NULL,
    work_performed text,
    issues_found text,
    recommendations text,
    customer_notes text,
    finalized_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT field_service_reports_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'finalized'::text]))),
    CONSTRAINT field_service_reports_status_metadata_check CHECK ((((status = 'draft'::text) AND (finalized_at IS NULL)) OR ((status = 'finalized'::text) AND (finalized_at IS NOT NULL)))),
    CONSTRAINT field_service_reports_summary_check CHECK (((char_length(TRIM(BOTH FROM summary)) >= 1) AND (char_length(TRIM(BOTH FROM summary)) <= 2000)))
);


--
-- Name: invoice_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_lines (
    id text NOT NULL,
    invoice_id text NOT NULL,
    product_id text,
    description text NOT NULL,
    quantity numeric(14,3) NOT NULL,
    unit_price numeric(14,2) NOT NULL,
    tax_rate numeric(14,2) NOT NULL,
    total_ht numeric(14,2) NOT NULL,
    total_ttc numeric(14,2) NOT NULL,
    organization_id text NOT NULL,
    section_id text,
    source_line_id text,
    line_type text DEFAULT 'service'::text NOT NULL,
    unit_code text DEFAULT 'unit'::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    discount_rate numeric(14,2) DEFAULT 0 NOT NULL,
    unit_cost numeric(14,2),
    tax_amount numeric(14,2) DEFAULT 0 NOT NULL,
    CONSTRAINT invoice_lines_discount_rate_check CHECK (((discount_rate >= (0)::numeric) AND (discount_rate <= (100)::numeric))),
    CONSTRAINT invoice_lines_line_type_check CHECK ((line_type = ANY (ARRAY['service'::text, 'labor'::text, 'material'::text, 'equipment'::text, 'travel'::text, 'subcontracting'::text, 'other'::text]))),
    CONSTRAINT invoice_lines_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT invoice_lines_tax_rate_check CHECK (((tax_rate >= (0)::numeric) AND (tax_rate <= (100)::numeric))),
    CONSTRAINT invoice_lines_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: invoice_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_sections (
    id text NOT NULL,
    organization_id text NOT NULL,
    invoice_id text NOT NULL,
    parent_section_id text,
    kind text DEFAULT 'section'::text NOT NULL,
    title text NOT NULL,
    description text,
    "position" integer DEFAULT 0 NOT NULL,
    is_optional boolean DEFAULT false NOT NULL,
    option_group_key text,
    is_selected boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoice_sections_kind_check CHECK ((kind = ANY (ARRAY['lot'::text, 'tranche'::text, 'section'::text, 'option'::text, 'variant'::text])))
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    organization_id text NOT NULL,
    client_id text NOT NULL,
    type text NOT NULL,
    number text NOT NULL,
    date text NOT NULL,
    due_date text,
    paid_at text,
    payment_link text,
    stripe_payment_intent_id text,
    payment_intent_id text,
    request_id text,
    professional_id text,
    message text,
    status text NOT NULL,
    total_ht numeric(14,2) NOT NULL,
    tax_amount numeric(14,2) NOT NULL,
    total_ttc numeric(14,2) NOT NULL,
    signature text,
    signature_date text,
    signature_ip text,
    signed_at text,
    created_at text NOT NULL,
    updated_at text NOT NULL,
    recipient_user_id text,
    legal_entity_id text,
    supplier_country text,
    supplier_vat_id text,
    customer_country text,
    customer_vat_id text,
    customer_type text,
    vat_treatment text,
    vat_rate numeric(14,2),
    vat_exemption_code text,
    reverse_charge boolean DEFAULT false,
    einvoice_required boolean DEFAULT false,
    einvoice_format text,
    einvoice_profile text,
    einvoice_network text,
    structured_invoice_hash text,
    structured_invoice_path text,
    pdf_hash text,
    pdf_path text,
    locked_at text,
    locked_by text,
    retention_until text,
    legal_rule_version text,
    delivery_status text,
    delivery_channel text,
    delivery_tracking_id text,
    delivery_response text,
    delivery_attempts integer DEFAULT 0,
    delivery_sent_at timestamp without time zone,
    delivery_last_attempt_at timestamp without time zone,
    created_by_user_id text,
    deal_id text,
    site_id text,
    work_order_id text,
    source_quote_id text,
    title text,
    valid_until text,
    accepted_at text,
    accepted_by_user_id text,
    rejected_at text,
    rejected_by_user_id text,
    revision_number integer DEFAULT 1 NOT NULL,
    supersedes_document_id text,
    invoice_subtype text DEFAULT 'standard'::text NOT NULL,
    deposit_mode text DEFAULT 'none'::text NOT NULL,
    deposit_rate numeric(14,2),
    deposit_fixed_amount numeric(14,2),
    deposit_amount numeric(14,2) DEFAULT 0 NOT NULL,
    prepaid_amount numeric(14,2) DEFAULT 0 NOT NULL,
    amount_due numeric(14,2) DEFAULT 0 NOT NULL,
    CONSTRAINT invoices_amount_due_check CHECK ((amount_due >= (0)::numeric)),
    CONSTRAINT invoices_deposit_amount_check CHECK ((deposit_amount >= (0)::numeric)),
    CONSTRAINT invoices_deposit_fixed_amount_check CHECK (((deposit_fixed_amount IS NULL) OR (deposit_fixed_amount >= (0)::numeric))),
    CONSTRAINT invoices_deposit_mode_check CHECK ((deposit_mode = ANY (ARRAY['none'::text, 'percentage'::text, 'fixed'::text]))),
    CONSTRAINT invoices_deposit_rate_check CHECK (((deposit_rate IS NULL) OR ((deposit_rate >= (0)::numeric) AND (deposit_rate <= (100)::numeric)))),
    CONSTRAINT invoices_prepaid_amount_check CHECK ((prepaid_amount >= (0)::numeric)),
    CONSTRAINT invoices_subtype_check CHECK ((invoice_subtype = ANY (ARRAY['standard'::text, 'deposit'::text, 'final'::text])))
);


--
-- Name: legal_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_entities (
    id text NOT NULL,
    organization_id text NOT NULL,
    name text NOT NULL,
    legal_form text,
    country text NOT NULL,
    establishment_country text,
    registration_number text,
    vat_number text,
    vat_scheme text,
    address text,
    city text,
    postal_code text,
    phone text,
    email text,
    website text,
    representative text,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_templates (
    id text NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    type text NOT NULL,
    organization_id text NOT NULL,
    created_at text NOT NULL,
    updated_at text NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id text NOT NULL,
    sender_id text NOT NULL,
    receiver_id text NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    request_id text,
    organization_id text NOT NULL,
    created_at text NOT NULL,
    updated_at text NOT NULL,
    patient_id text
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id text NOT NULL,
    name text NOT NULL,
    slug text,
    sector text,
    profile_type text DEFAULT 'professional'::text,
    is_public boolean DEFAULT false,
    description text,
    logo text,
    address text,
    city text,
    postal_code text,
    country text,
    phone text,
    legal_notice text,
    payment_terms text,
    bank_details text,
    created_at text NOT NULL,
    updated_at text NOT NULL,
    email text,
    currency text DEFAULT 'EUR'::text,
    industry text,
    stripe_account_id text,
    stripe_account_status text,
    secondary_skills text,
    profession text,
    CONSTRAINT organizations_sector_profession_check CHECK (((((sector = 'health'::text) AND (profession = ANY (ARRAY['physiotherapist'::text, 'osteopath'::text, 'speech_therapist'::text, 'podiatrist'::text, 'occupational_therapist'::text, 'psychomotor_therapist'::text, 'dietitian'::text]))) OR ((sector = ANY (ARRAY['field_services'::text, 'artisan'::text])) AND (profession = ANY (ARRAY['mason'::text, 'plumber'::text, 'electrician'::text, 'heating_technician'::text, 'hvac_technician'::text, 'roofer'::text, 'carpenter'::text, 'joiner'::text, 'painter'::text, 'plasterer'::text, 'insulation_specialist'::text, 'tiler'::text, 'earthworks_contractor'::text, 'facade_specialist'::text, 'locksmith'::text, 'glazier'::text, 'sanitation_specialist'::text, 'renovation_contractor'::text, 'pool_specialist'::text, 'architect'::text, 'construction_project_manager'::text, 'engineering_office'::text, 'quantity_surveyor'::text, 'maintenance_technician'::text, 'technical_installer'::text, 'auto_mechanic'::text, 'auto_body_repairer'::text, 'auto_service_center'::text, 'phone_repairer'::text, 'computer_repairer'::text, 'appliance_repairer'::text, 'electronics_repairer'::text, 'landscaper'::text, 'custom_manufacturer'::text, 'artisan_retailer'::text, 'technical_service_provider'::text]))) OR (profession IS NULL)) AND (NOT ((sector IS NULL) AND (profession IS NOT NULL)))))
);


--
-- Name: patient_billing_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_billing_links (
    id text NOT NULL,
    organization_id text NOT NULL,
    patient_id text NOT NULL,
    client_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: patient_portal_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_portal_access (
    id text NOT NULL,
    organization_id text NOT NULL,
    patient_id text NOT NULL,
    user_id text NOT NULL,
    access_type text NOT NULL,
    representative_id text,
    is_active boolean DEFAULT true NOT NULL,
    created_by_user_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT patient_portal_access_type_check CHECK ((access_type = ANY (ARRAY['patient'::text, 'representative'::text]))),
    CONSTRAINT patient_portal_access_type_representative_check CHECK ((((access_type = 'patient'::text) AND (representative_id IS NULL)) OR ((access_type = 'representative'::text) AND (representative_id IS NOT NULL))))
);


--
-- Name: patient_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_profiles (
    id text NOT NULL,
    organization_id text NOT NULL,
    birth_name text NOT NULL,
    first_birth_name text NOT NULL,
    birth_first_names text,
    used_name text,
    used_first_name text,
    birth_date date NOT NULL,
    sex text NOT NULL,
    birth_place text,
    birth_place_code text,
    birth_country text,
    email text,
    phone text,
    address text,
    city text,
    postal_code text,
    country text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT patient_profiles_sex_check CHECK ((sex = ANY (ARRAY['female'::text, 'male'::text, 'indeterminate'::text, 'unknown'::text])))
);


--
-- Name: patient_questionnaire_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_questionnaire_assignments (
    id text NOT NULL,
    organization_id text NOT NULL,
    patient_id text NOT NULL,
    practitioner_id text NOT NULL,
    template_id text NOT NULL,
    care_episode_id text,
    status text DEFAULT 'assigned'::text NOT NULL,
    answers_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    due_at timestamp with time zone,
    submitted_at timestamp with time zone,
    clinical_response_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT patient_questionnaires_status_check CHECK ((status = ANY (ARRAY['assigned'::text, 'submitted'::text, 'cancelled'::text]))),
    CONSTRAINT patient_questionnaires_submission_check CHECK ((((status = 'submitted'::text) AND (submitted_at IS NOT NULL) AND (clinical_response_id IS NOT NULL)) OR (status <> 'submitted'::text)))
);


--
-- Name: patient_representative_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_representative_links (
    id text NOT NULL,
    organization_id text NOT NULL,
    patient_id text NOT NULL,
    representative_id text NOT NULL,
    relationship text NOT NULL,
    is_legal_representative boolean DEFAULT false NOT NULL,
    is_primary_contact boolean DEFAULT false NOT NULL,
    is_emergency_contact boolean DEFAULT false NOT NULL,
    is_billing_contact boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT patient_rep_links_relationship_check CHECK ((relationship = ANY (ARRAY['parent'::text, 'legal_guardian'::text, 'spouse_partner'::text, 'adult_child'::text, 'sibling'::text, 'caregiver'::text, 'other'::text])))
);


--
-- Name: patient_representatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_representatives (
    id text NOT NULL,
    organization_id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    address text,
    city text,
    postal_code text,
    country text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    resource text NOT NULL,
    action text NOT NULL
);


--
-- Name: practice_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_locations (
    id text NOT NULL,
    organization_id text NOT NULL,
    name text NOT NULL,
    address text,
    city text,
    postal_code text,
    country text,
    timezone text NOT NULL,
    phone text,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: practice_practitioners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_practitioners (
    id text NOT NULL,
    organization_id text NOT NULL,
    user_id text,
    display_name text NOT NULL,
    profession text NOT NULL,
    email text,
    phone text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT practice_practitioners_profession_check CHECK ((profession = ANY (ARRAY['physiotherapist'::text, 'osteopath'::text, 'speech_therapist'::text, 'podiatrist'::text, 'occupational_therapist'::text, 'psychomotor_therapist'::text, 'dietitian'::text])))
);


--
-- Name: practice_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_resources (
    id text NOT NULL,
    organization_id text NOT NULL,
    location_id text NOT NULL,
    room_id text,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: practice_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_rooms (
    id text NOT NULL,
    organization_id text NOT NULL,
    location_id text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: practitioner_availability_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practitioner_availability_exceptions (
    id text NOT NULL,
    organization_id text NOT NULL,
    practitioner_id text NOT NULL,
    location_id text NOT NULL,
    local_date date NOT NULL,
    kind text NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT availability_exceptions_kind_check CHECK ((kind = ANY (ARRAY['open'::text, 'closed'::text]))),
    CONSTRAINT availability_exceptions_time_check CHECK ((((start_time IS NULL) AND (end_time IS NULL)) OR ((start_time IS NOT NULL) AND (end_time IS NOT NULL) AND (start_time < end_time))))
);


--
-- Name: practitioner_availability_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practitioner_availability_rules (
    id text NOT NULL,
    organization_id text NOT NULL,
    practitioner_id text NOT NULL,
    location_id text NOT NULL,
    weekday integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    valid_from date NOT NULL,
    valid_until date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT availability_rules_time_check CHECK ((start_time < end_time)),
    CONSTRAINT availability_rules_valid_until_check CHECK (((valid_until IS NULL) OR (valid_until >= valid_from))),
    CONSTRAINT availability_rules_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6)))
);


--
-- Name: practitioner_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practitioner_locations (
    id text NOT NULL,
    organization_id text NOT NULL,
    practitioner_id text NOT NULL,
    location_id text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: processing_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processing_activities (
    id text NOT NULL,
    organization_id text NOT NULL,
    name text NOT NULL,
    purpose text NOT NULL,
    data_categories text,
    legal_basis text,
    retention_period text,
    data_subjects text,
    transfers text,
    security_measures text,
    responsible text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id text NOT NULL,
    organization_id text NOT NULL,
    name text NOT NULL,
    description text,
    unit_price numeric(14,2) NOT NULL,
    tax_rate numeric(14,2) DEFAULT 20,
    type text DEFAULT 'service'::text,
    created_at text NOT NULL,
    updated_at text NOT NULL
);


--
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id text NOT NULL,
    client_id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    budget text,
    deadline text,
    status text DEFAULT 'open'::text,
    visibility text DEFAULT 'public'::text,
    created_at text NOT NULL,
    updated_at text NOT NULL,
    location text
);


--
-- Name: retention_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.retention_policies (
    id text NOT NULL,
    country text NOT NULL,
    years integer NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id text NOT NULL,
    role_id text NOT NULL,
    permission_id text NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: stripe_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_events (
    id text NOT NULL,
    type text NOT NULL,
    processed_at text NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id text NOT NULL,
    organization_id text NOT NULL,
    entity_type text,
    entity_id text,
    title text NOT NULL,
    description text,
    due_date text,
    status text NOT NULL,
    priority text DEFAULT 'medium'::text,
    assigned_to text,
    created_at text NOT NULL,
    updated_at text NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id text NOT NULL,
    user_id text NOT NULL,
    role_id text NOT NULL,
    organization_id text NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text,
    name text,
    profile_type text NOT NULL,
    organization_id text,
    onboarding_completed boolean DEFAULT false,
    onboarding_step integer DEFAULT 0,
    subscription_tier text DEFAULT 'free'::text,
    subscription_status text DEFAULT 'inactive'::text,
    created_at text NOT NULL,
    updated_at text NOT NULL,
    stripe_customer_id text,
    legal_entity_id text,
    account_closed_at timestamp with time zone
);


--
-- Name: appointment_reminder_deliveries appointment_reminder_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_reminder_deliveries
    ADD CONSTRAINT appointment_reminder_deliveries_pkey PRIMARY KEY (id);


--
-- Name: appointment_types appointment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_pkey PRIMARY KEY (id);


--
-- Name: appointment_waitlist_entries appointment_waitlist_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_waitlist_entries
    ADD CONSTRAINT appointment_waitlist_entries_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_patient_no_overlap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_no_overlap EXCLUDE USING gist (organization_id WITH =, patient_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE ((status = 'scheduled'::text));


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_practitioner_no_overlap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_practitioner_no_overlap EXCLUDE USING gist (organization_id WITH =, practitioner_id WITH =, tstzrange(occupancy_starts_at, occupancy_ends_at, '[)'::text) WITH &&) WHERE ((status = 'scheduled'::text));


--
-- Name: appointments appointments_room_no_overlap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_room_no_overlap EXCLUDE USING gist (organization_id WITH =, room_id WITH =, tstzrange(occupancy_starts_at, occupancy_ends_at, '[)'::text) WITH &&) WHERE (((status = 'scheduled'::text) AND (room_id IS NOT NULL)));


--
-- Name: archived_documents archived_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_documents
    ADD CONSTRAINT archived_documents_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: breach_notifications breach_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.breach_notifications
    ADD CONSTRAINT breach_notifications_pkey PRIMARY KEY (id);


--
-- Name: care_episodes care_episodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_episodes
    ADD CONSTRAINT care_episodes_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: clinical_documents clinical_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_documents
    ADD CONSTRAINT clinical_documents_pkey PRIMARY KEY (id);


--
-- Name: clinical_encounters clinical_encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_encounters
    ADD CONSTRAINT clinical_encounters_pkey PRIMARY KEY (id);


--
-- Name: clinical_form_responses clinical_form_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_form_responses
    ADD CONSTRAINT clinical_form_responses_pkey PRIMARY KEY (id);


--
-- Name: clinical_form_templates clinical_form_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_form_templates
    ADD CONSTRAINT clinical_form_templates_pkey PRIMARY KEY (id);


--
-- Name: clinical_measurements clinical_measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_measurements
    ADD CONSTRAINT clinical_measurements_pkey PRIMARY KEY (id);


--
-- Name: clinical_notes clinical_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_notes
    ADD CONSTRAINT clinical_notes_pkey PRIMARY KEY (id);


--
-- Name: consent_events consent_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_events
    ADD CONSTRAINT consent_events_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: country_compliance_profiles country_compliance_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_compliance_profiles
    ADD CONSTRAINT country_compliance_profiles_pkey PRIMARY KEY (id);


--
-- Name: data_subject_requests data_subject_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_subject_requests
    ADD CONSTRAINT data_subject_requests_pkey PRIMARY KEY (id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: field_service_sites field_service_sites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_sites
    ADD CONSTRAINT field_service_sites_pkey PRIMARY KEY (id);


--
-- Name: field_service_work_order_assignments field_service_work_order_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_order_assignments
    ADD CONSTRAINT field_service_work_order_assignments_pkey PRIMARY KEY (id);


--
-- Name: field_service_work_order_status_history field_service_work_order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_order_status_history
    ADD CONSTRAINT field_service_work_order_status_history_pkey PRIMARY KEY (id);


--
-- Name: field_service_work_orders field_service_work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_orders
    ADD CONSTRAINT field_service_work_orders_pkey PRIMARY KEY (id);


--
-- Name: field_service_work_reports field_service_work_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_reports
    ADD CONSTRAINT field_service_work_reports_pkey PRIMARY KEY (id);


--
-- Name: invoice_lines invoice_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_pkey PRIMARY KEY (id);


--
-- Name: invoice_sections invoice_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_sections
    ADD CONSTRAINT invoice_sections_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: legal_entities legal_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entities
    ADD CONSTRAINT legal_entities_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);


--
-- Name: patient_billing_links patient_billing_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_billing_links
    ADD CONSTRAINT patient_billing_links_pkey PRIMARY KEY (id);


--
-- Name: patient_portal_access patient_portal_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_portal_access
    ADD CONSTRAINT patient_portal_access_pkey PRIMARY KEY (id);


--
-- Name: patient_profiles patient_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_profiles
    ADD CONSTRAINT patient_profiles_pkey PRIMARY KEY (id);


--
-- Name: patient_questionnaire_assignments patient_questionnaire_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_questionnaire_assignments
    ADD CONSTRAINT patient_questionnaire_assignments_pkey PRIMARY KEY (id);


--
-- Name: patient_representative_links patient_representative_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_representative_links
    ADD CONSTRAINT patient_representative_links_pkey PRIMARY KEY (id);


--
-- Name: patient_representatives patient_representatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_representatives
    ADD CONSTRAINT patient_representatives_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_unique UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: practice_locations practice_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_locations
    ADD CONSTRAINT practice_locations_pkey PRIMARY KEY (id);


--
-- Name: practice_practitioners practice_practitioners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_practitioners
    ADD CONSTRAINT practice_practitioners_pkey PRIMARY KEY (id);


--
-- Name: practice_resources practice_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_resources
    ADD CONSTRAINT practice_resources_pkey PRIMARY KEY (id);


--
-- Name: practice_rooms practice_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_rooms
    ADD CONSTRAINT practice_rooms_pkey PRIMARY KEY (id);


--
-- Name: practitioner_availability_exceptions practitioner_availability_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_availability_exceptions
    ADD CONSTRAINT practitioner_availability_exceptions_pkey PRIMARY KEY (id);


--
-- Name: practitioner_availability_rules practitioner_availability_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_availability_rules
    ADD CONSTRAINT practitioner_availability_rules_pkey PRIMARY KEY (id);


--
-- Name: practitioner_locations practitioner_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_locations
    ADD CONSTRAINT practitioner_locations_pkey PRIMARY KEY (id);


--
-- Name: processing_activities processing_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_activities
    ADD CONSTRAINT processing_activities_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: retention_policies retention_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retention_policies
    ADD CONSTRAINT retention_policies_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: stripe_events stripe_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_events
    ADD CONSTRAINT stripe_events_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: appointment_reminders_delivery_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX appointment_reminders_delivery_unique ON public.appointment_reminder_deliveries USING btree (appointment_id, channel, offset_minutes);


--
-- Name: appointment_reminders_org_sent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointment_reminders_org_sent_idx ON public.appointment_reminder_deliveries USING btree (organization_id, sent_at);


--
-- Name: appointment_types_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX appointment_types_org_id_unique ON public.appointment_types USING btree (id, organization_id);


--
-- Name: appointment_types_org_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX appointment_types_org_name_unique ON public.appointment_types USING btree (organization_id, name);


--
-- Name: appointment_types_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointment_types_organization_id_idx ON public.appointment_types USING btree (organization_id);


--
-- Name: appointment_waitlist_entries_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX appointment_waitlist_entries_org_id_unique ON public.appointment_waitlist_entries USING btree (id, organization_id);


--
-- Name: appointments_id_org_patient_practitioner_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX appointments_id_org_patient_practitioner_unique ON public.appointments USING btree (id, organization_id, patient_id, practitioner_id);


--
-- Name: appointments_location_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_location_start_idx ON public.appointments USING btree (organization_id, location_id, starts_at);


--
-- Name: appointments_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX appointments_org_id_unique ON public.appointments USING btree (id, organization_id);


--
-- Name: appointments_organization_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_organization_start_idx ON public.appointments USING btree (organization_id, starts_at);


--
-- Name: appointments_patient_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_patient_start_idx ON public.appointments USING btree (organization_id, patient_id, starts_at);


--
-- Name: appointments_practitioner_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_practitioner_start_idx ON public.appointments USING btree (organization_id, practitioner_id, starts_at);


--
-- Name: appointments_room_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_room_start_idx ON public.appointments USING btree (organization_id, room_id, starts_at);


--
-- Name: availability_exceptions_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX availability_exceptions_org_id_unique ON public.practitioner_availability_exceptions USING btree (id, organization_id);


--
-- Name: availability_exceptions_org_location_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_exceptions_org_location_date_idx ON public.practitioner_availability_exceptions USING btree (organization_id, location_id, local_date);


--
-- Name: availability_exceptions_org_practitioner_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_exceptions_org_practitioner_date_idx ON public.practitioner_availability_exceptions USING btree (organization_id, practitioner_id, local_date);


--
-- Name: availability_rules_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_rules_lookup_idx ON public.practitioner_availability_rules USING btree (organization_id, practitioner_id, location_id, weekday);


--
-- Name: availability_rules_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX availability_rules_org_id_unique ON public.practitioner_availability_rules USING btree (id, organization_id);


--
-- Name: availability_rules_org_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_rules_org_location_idx ON public.practitioner_availability_rules USING btree (organization_id, location_id);


--
-- Name: availability_rules_org_practitioner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX availability_rules_org_practitioner_idx ON public.practitioner_availability_rules USING btree (organization_id, practitioner_id);


--
-- Name: availability_rules_unique_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX availability_rules_unique_slot ON public.practitioner_availability_rules USING btree (organization_id, practitioner_id, location_id, weekday, valid_from, start_time, end_time);


--
-- Name: billing_sequences_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX billing_sequences_pk ON public.billing_document_sequences USING btree (organization_id, document_type, year);


--
-- Name: care_episodes_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX care_episodes_org_id_unique ON public.care_episodes USING btree (id, organization_id);


--
-- Name: care_episodes_org_patient_practitioner_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX care_episodes_org_patient_practitioner_id_unique ON public.care_episodes USING btree (id, organization_id, patient_id, practitioner_id);


--
-- Name: care_episodes_org_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX care_episodes_org_status_idx ON public.care_episodes USING btree (organization_id, status);


--
-- Name: care_episodes_organization_patient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX care_episodes_organization_patient_idx ON public.care_episodes USING btree (organization_id, patient_id);


--
-- Name: care_episodes_organization_practitioner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX care_episodes_organization_practitioner_idx ON public.care_episodes USING btree (organization_id, practitioner_id);


--
-- Name: clients_id_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clients_id_org_unique ON public.clients USING btree (id, organization_id);


--
-- Name: clients_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_organization_id_idx ON public.clients USING btree (organization_id);


--
-- Name: clients_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_user_id_idx ON public.clients USING btree (user_id);


--
-- Name: clinical_documents_org_encounter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_documents_org_encounter_idx ON public.clinical_documents USING btree (organization_id, encounter_id);


--
-- Name: clinical_documents_org_episode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_documents_org_episode_idx ON public.clinical_documents USING btree (organization_id, care_episode_id);


--
-- Name: clinical_documents_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinical_documents_org_id_unique ON public.clinical_documents USING btree (id, organization_id);


--
-- Name: clinical_documents_org_patient_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_documents_org_patient_created_idx ON public.clinical_documents USING btree (organization_id, patient_id, created_at);


--
-- Name: clinical_documents_org_practitioner_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_documents_org_practitioner_created_idx ON public.clinical_documents USING btree (organization_id, practitioner_id, created_at);


--
-- Name: clinical_encounters_id_org_episode_patient_practitioner_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinical_encounters_id_org_episode_patient_practitioner_unique ON public.clinical_encounters USING btree (id, organization_id, care_episode_id, patient_id, practitioner_id);


--
-- Name: clinical_encounters_org_appointment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_encounters_org_appointment_idx ON public.clinical_encounters USING btree (organization_id, appointment_id);


--
-- Name: clinical_encounters_org_appointment_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinical_encounters_org_appointment_unique ON public.clinical_encounters USING btree (organization_id, appointment_id) WHERE (appointment_id IS NOT NULL);


--
-- Name: clinical_encounters_org_episode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_encounters_org_episode_idx ON public.clinical_encounters USING btree (organization_id, care_episode_id);


--
-- Name: clinical_encounters_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinical_encounters_org_id_unique ON public.clinical_encounters USING btree (id, organization_id);


--
-- Name: clinical_encounters_org_patient_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_encounters_org_patient_occurred_idx ON public.clinical_encounters USING btree (organization_id, patient_id, occurred_at);


--
-- Name: clinical_encounters_org_patient_practitioner_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinical_encounters_org_patient_practitioner_id_unique ON public.clinical_encounters USING btree (id, organization_id, patient_id, practitioner_id);


--
-- Name: clinical_encounters_org_practitioner_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_encounters_org_practitioner_occurred_idx ON public.clinical_encounters USING btree (organization_id, practitioner_id, occurred_at);


--
-- Name: clinical_form_responses_org_encounter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_form_responses_org_encounter_idx ON public.clinical_form_responses USING btree (organization_id, encounter_id);


--
-- Name: clinical_form_responses_org_episode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_form_responses_org_episode_idx ON public.clinical_form_responses USING btree (organization_id, care_episode_id);


--
-- Name: clinical_form_responses_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinical_form_responses_org_id_unique ON public.clinical_form_responses USING btree (id, organization_id);


--
-- Name: clinical_form_responses_org_patient_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_form_responses_org_patient_created_idx ON public.clinical_form_responses USING btree (organization_id, patient_id, created_at);


--
-- Name: clinical_form_responses_org_practitioner_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_form_responses_org_practitioner_created_idx ON public.clinical_form_responses USING btree (organization_id, practitioner_id, created_at);


--
-- Name: clinical_form_responses_org_template_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_form_responses_org_template_idx ON public.clinical_form_responses USING btree (organization_id, template_id);


--
-- Name: clinical_form_templates_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinical_form_templates_org_id_unique ON public.clinical_form_templates USING btree (id, organization_id);


--
-- Name: clinical_form_templates_org_practitioner_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinical_form_templates_org_practitioner_id_unique ON public.clinical_form_templates USING btree (id, organization_id, practitioner_id);


--
-- Name: clinical_form_templates_org_practitioner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_form_templates_org_practitioner_idx ON public.clinical_form_templates USING btree (organization_id, practitioner_id);


--
-- Name: clinical_measurements_org_encounter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_measurements_org_encounter_idx ON public.clinical_measurements USING btree (organization_id, encounter_id);


--
-- Name: clinical_measurements_org_episode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_measurements_org_episode_idx ON public.clinical_measurements USING btree (organization_id, care_episode_id);


--
-- Name: clinical_measurements_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinical_measurements_org_id_unique ON public.clinical_measurements USING btree (id, organization_id);


--
-- Name: clinical_measurements_org_patient_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_measurements_org_patient_code_idx ON public.clinical_measurements USING btree (organization_id, patient_id, code, observed_at);


--
-- Name: clinical_measurements_org_patient_observed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_measurements_org_patient_observed_idx ON public.clinical_measurements USING btree (organization_id, patient_id, observed_at);


--
-- Name: clinical_measurements_org_practitioner_observed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_measurements_org_practitioner_observed_idx ON public.clinical_measurements USING btree (organization_id, practitioner_id, observed_at);


--
-- Name: clinical_notes_org_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_notes_org_author_idx ON public.clinical_notes USING btree (organization_id, author_practitioner_id);


--
-- Name: clinical_notes_org_encounter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_notes_org_encounter_idx ON public.clinical_notes USING btree (organization_id, encounter_id);


--
-- Name: clinical_notes_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clinical_notes_org_id_unique ON public.clinical_notes USING btree (id, organization_id);


--
-- Name: clinical_notes_org_patient_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clinical_notes_org_patient_created_idx ON public.clinical_notes USING btree (organization_id, patient_id, created_at);


--
-- Name: contacts_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contacts_client_id_idx ON public.contacts USING btree (client_id);


--
-- Name: contacts_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contacts_organization_id_idx ON public.contacts USING btree (organization_id);


--
-- Name: deals_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_client_id_idx ON public.deals USING btree (client_id);


--
-- Name: deals_id_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX deals_id_org_unique ON public.deals USING btree (id, organization_id);


--
-- Name: deals_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_organization_id_idx ON public.deals USING btree (organization_id);


--
-- Name: field_service_assignments_active_user_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX field_service_assignments_active_user_unique ON public.field_service_work_order_assignments USING btree (work_order_id, user_id) WHERE (is_active = true);


--
-- Name: field_service_assignments_org_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_assignments_org_user_idx ON public.field_service_work_order_assignments USING btree (organization_id, user_id);


--
-- Name: field_service_assignments_org_wo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_assignments_org_wo_idx ON public.field_service_work_order_assignments USING btree (organization_id, work_order_id);


--
-- Name: field_service_assignments_wo_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_assignments_wo_active_idx ON public.field_service_work_order_assignments USING btree (work_order_id, is_active);


--
-- Name: field_service_reports_org_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_reports_org_author_idx ON public.field_service_work_reports USING btree (organization_id, author_user_id);


--
-- Name: field_service_reports_org_wo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_reports_org_wo_idx ON public.field_service_work_reports USING btree (organization_id, work_order_id);


--
-- Name: field_service_reports_wo_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_reports_wo_status_idx ON public.field_service_work_reports USING btree (work_order_id, status);


--
-- Name: field_service_sites_id_org_client_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX field_service_sites_id_org_client_unique ON public.field_service_sites USING btree (id, organization_id, client_id);


--
-- Name: field_service_sites_org_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_sites_org_active_idx ON public.field_service_sites USING btree (organization_id, is_active);


--
-- Name: field_service_sites_org_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_sites_org_city_idx ON public.field_service_sites USING btree (organization_id, city);


--
-- Name: field_service_sites_org_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_sites_org_client_idx ON public.field_service_sites USING btree (organization_id, client_id);


--
-- Name: field_service_status_history_org_wo_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_status_history_org_wo_created_idx ON public.field_service_work_order_status_history USING btree (organization_id, work_order_id, created_at);


--
-- Name: field_service_work_orders_id_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX field_service_work_orders_id_org_unique ON public.field_service_work_orders USING btree (id, organization_id);


--
-- Name: field_service_work_orders_org_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_work_orders_org_client_idx ON public.field_service_work_orders USING btree (organization_id, client_id);


--
-- Name: field_service_work_orders_org_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_work_orders_org_priority_idx ON public.field_service_work_orders USING btree (organization_id, priority);


--
-- Name: field_service_work_orders_org_ref_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX field_service_work_orders_org_ref_unique ON public.field_service_work_orders USING btree (organization_id, reference);


--
-- Name: field_service_work_orders_org_sched_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_work_orders_org_sched_start_idx ON public.field_service_work_orders USING btree (organization_id, scheduled_start);


--
-- Name: field_service_work_orders_org_site_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_work_orders_org_site_idx ON public.field_service_work_orders USING btree (organization_id, site_id);


--
-- Name: field_service_work_orders_org_source_quote_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_work_orders_org_source_quote_idx ON public.field_service_work_orders USING btree (organization_id, source_quote_id);


--
-- Name: field_service_work_orders_org_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_service_work_orders_org_status_idx ON public.field_service_work_orders USING btree (organization_id, status);


--
-- Name: invoice_lines_id_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoice_lines_id_org_unique ON public.invoice_lines USING btree (id, organization_id);


--
-- Name: invoice_lines_invoice_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_lines_invoice_id_idx ON public.invoice_lines USING btree (invoice_id);


--
-- Name: invoice_lines_org_inv_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_lines_org_inv_idx ON public.invoice_lines USING btree (organization_id, invoice_id);


--
-- Name: invoice_lines_org_section_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_lines_org_section_idx ON public.invoice_lines USING btree (organization_id, section_id);


--
-- Name: invoice_sections_id_org_inv_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoice_sections_id_org_inv_unique ON public.invoice_sections USING btree (id, organization_id, invoice_id);


--
-- Name: invoice_sections_id_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoice_sections_id_org_unique ON public.invoice_sections USING btree (id, organization_id);


--
-- Name: invoice_sections_org_inv_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_sections_org_inv_idx ON public.invoice_sections USING btree (organization_id, invoice_id);


--
-- Name: invoice_sections_org_pos_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoice_sections_org_pos_idx ON public.invoice_sections USING btree (organization_id, "position");


--
-- Name: invoices_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_client_id_idx ON public.invoices USING btree (client_id);


--
-- Name: invoices_deal_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_deal_id_idx ON public.invoices USING btree (deal_id);


--
-- Name: invoices_id_org_client_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoices_id_org_client_unique ON public.invoices USING btree (id, organization_id, client_id);


--
-- Name: invoices_id_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoices_id_org_unique ON public.invoices USING btree (id, organization_id);


--
-- Name: invoices_org_number_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoices_org_number_unique ON public.invoices USING btree (organization_id, number);


--
-- Name: invoices_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_organization_id_idx ON public.invoices USING btree (organization_id);


--
-- Name: invoices_recipient_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_recipient_user_id_idx ON public.invoices USING btree (recipient_user_id);


--
-- Name: invoices_site_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_site_id_idx ON public.invoices USING btree (site_id);


--
-- Name: invoices_source_quote_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_source_quote_id_idx ON public.invoices USING btree (source_quote_id);


--
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (organization_id, status);


--
-- Name: invoices_work_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_work_order_id_idx ON public.invoices USING btree (work_order_id);


--
-- Name: message_templates_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_templates_organization_id_idx ON public.message_templates USING btree (organization_id);


--
-- Name: messages_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_patient_id_idx ON public.messages USING btree (patient_id);


--
-- Name: messages_receiver_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_receiver_id_idx ON public.messages USING btree (receiver_id);


--
-- Name: messages_request_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_request_id_idx ON public.messages USING btree (request_id);


--
-- Name: messages_sender_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_sender_id_idx ON public.messages USING btree (sender_id);


--
-- Name: patient_billing_links_org_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_billing_links_org_client_idx ON public.patient_billing_links USING btree (organization_id, client_id);


--
-- Name: patient_billing_links_org_patient_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX patient_billing_links_org_patient_unique ON public.patient_billing_links USING btree (organization_id, patient_id);


--
-- Name: patient_portal_access_org_patient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_portal_access_org_patient_idx ON public.patient_portal_access USING btree (organization_id, patient_id);


--
-- Name: patient_portal_access_org_patient_user_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX patient_portal_access_org_patient_user_unique ON public.patient_portal_access USING btree (organization_id, patient_id, user_id);


--
-- Name: patient_portal_access_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_portal_access_user_idx ON public.patient_portal_access USING btree (user_id);


--
-- Name: patient_profiles_org_birth_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_profiles_org_birth_date_idx ON public.patient_profiles USING btree (organization_id, birth_date);


--
-- Name: patient_profiles_org_birth_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_profiles_org_birth_name_idx ON public.patient_profiles USING btree (organization_id, birth_name);


--
-- Name: patient_profiles_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX patient_profiles_org_id_unique ON public.patient_profiles USING btree (id, organization_id);


--
-- Name: patient_profiles_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_profiles_organization_id_idx ON public.patient_profiles USING btree (organization_id);


--
-- Name: patient_questionnaires_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX patient_questionnaires_org_id_unique ON public.patient_questionnaire_assignments USING btree (id, organization_id);


--
-- Name: patient_questionnaires_org_patient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_questionnaires_org_patient_idx ON public.patient_questionnaire_assignments USING btree (organization_id, patient_id);


--
-- Name: patient_questionnaires_org_practitioner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_questionnaires_org_practitioner_idx ON public.patient_questionnaire_assignments USING btree (organization_id, practitioner_id);


--
-- Name: patient_questionnaires_org_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_questionnaires_org_status_idx ON public.patient_questionnaire_assignments USING btree (organization_id, status);


--
-- Name: patient_rep_links_assignment_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX patient_rep_links_assignment_unique ON public.patient_representative_links USING btree (organization_id, patient_id, representative_id);


--
-- Name: patient_rep_links_org_patient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_rep_links_org_patient_idx ON public.patient_representative_links USING btree (organization_id, patient_id);


--
-- Name: patient_rep_links_org_representative_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_rep_links_org_representative_idx ON public.patient_representative_links USING btree (organization_id, representative_id);


--
-- Name: patient_rep_links_primary_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX patient_rep_links_primary_active_idx ON public.patient_representative_links USING btree (organization_id, patient_id) WHERE ((is_primary_contact = true) AND (is_active = true));


--
-- Name: patient_representatives_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX patient_representatives_org_id_unique ON public.patient_representatives USING btree (id, organization_id);


--
-- Name: patient_representatives_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_representatives_organization_id_idx ON public.patient_representatives USING btree (organization_id);


--
-- Name: practice_locations_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX practice_locations_org_id_unique ON public.practice_locations USING btree (id, organization_id);


--
-- Name: practice_locations_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX practice_locations_organization_id_idx ON public.practice_locations USING btree (organization_id);


--
-- Name: practice_locations_primary_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX practice_locations_primary_active_idx ON public.practice_locations USING btree (organization_id) WHERE ((is_primary = true) AND (is_active = true));


--
-- Name: practice_practitioners_org_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX practice_practitioners_org_id_unique ON public.practice_practitioners USING btree (id, organization_id);


--
-- Name: practice_practitioners_org_user_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX practice_practitioners_org_user_unique ON public.practice_practitioners USING btree (organization_id, user_id);


--
-- Name: practice_practitioners_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX practice_practitioners_organization_id_idx ON public.practice_practitioners USING btree (organization_id);


--
-- Name: practice_resources_location_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX practice_resources_location_id_idx ON public.practice_resources USING btree (location_id);


--
-- Name: practice_resources_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX practice_resources_organization_id_idx ON public.practice_resources USING btree (organization_id);


--
-- Name: practice_resources_room_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX practice_resources_room_id_idx ON public.practice_resources USING btree (room_id);


--
-- Name: practice_rooms_location_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX practice_rooms_location_id_idx ON public.practice_rooms USING btree (location_id);


--
-- Name: practice_rooms_location_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX practice_rooms_location_name_unique ON public.practice_rooms USING btree (location_id, name);


--
-- Name: practice_rooms_org_location_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX practice_rooms_org_location_id_unique ON public.practice_rooms USING btree (id, location_id, organization_id);


--
-- Name: practice_rooms_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX practice_rooms_organization_id_idx ON public.practice_rooms USING btree (organization_id);


--
-- Name: practitioner_locations_assignment_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX practitioner_locations_assignment_unique ON public.practitioner_locations USING btree (organization_id, practitioner_id, location_id);


--
-- Name: practitioner_locations_org_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX practitioner_locations_org_location_idx ON public.practitioner_locations USING btree (organization_id, location_id);


--
-- Name: practitioner_locations_org_practitioner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX practitioner_locations_org_practitioner_idx ON public.practitioner_locations USING btree (organization_id, practitioner_id);


--
-- Name: practitioner_locations_primary_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX practitioner_locations_primary_active_idx ON public.practitioner_locations USING btree (organization_id, practitioner_id) WHERE ((is_primary = true) AND (is_active = true));


--
-- Name: products_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_organization_id_idx ON public.products USING btree (organization_id);


--
-- Name: requests_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX requests_client_id_idx ON public.requests USING btree (client_id);


--
-- Name: tasks_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_organization_id_idx ON public.tasks USING btree (organization_id);


--
-- Name: users_id_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_id_org_unique ON public.users USING btree (id, organization_id);


--
-- Name: users_organization_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_organization_id_idx ON public.users USING btree (organization_id);


--
-- Name: waitlist_match_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_match_idx ON public.appointment_waitlist_entries USING btree (organization_id, location_id, appointment_type_id, status, preferred_date_from);


--
-- Name: waitlist_org_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_org_status_idx ON public.appointment_waitlist_entries USING btree (organization_id, status);


--
-- Name: waitlist_patient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_patient_idx ON public.appointment_waitlist_entries USING btree (organization_id, patient_id);


--
-- Name: waitlist_practitioner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_practitioner_idx ON public.appointment_waitlist_entries USING btree (organization_id, practitioner_id);


--
-- Name: appointment_waitlist_entries appointment_waitlist_status_transition_guard; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: appointments appointments_status_transition_guard; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: care_episodes care_episodes_transition_trigger; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: clinical_documents clinical_documents_mutation_guard; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: clinical_encounters clinical_encounters_insert_trigger; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: clinical_form_responses clinical_form_responses_transition_guard; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: clinical_measurements clinical_measurements_insert_guard; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: clinical_notes clinical_notes_transition_trigger; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: messages messages_patient_mutation_guard; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: invoices trg_enforce_invoice_invariants; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: invoice_lines trg_enforce_invoice_lines_immutability; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: invoice_sections trg_enforce_invoice_sections_immutability; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: field_service_work_order_assignments trg_field_service_assignment_invariants; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: field_service_sites trg_field_service_site_immutability; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: field_service_work_order_status_history trg_field_service_status_history_append_only; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: field_service_work_orders trg_field_service_work_order_status_history; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: field_service_work_orders trg_field_service_work_order_transition; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: field_service_work_reports trg_field_service_work_report_transition; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: users users_account_lifecycle_guard; Type: TRIGGER; Schema: public; Owner: -
--




--
-- Name: appointment_reminder_deliveries appointment_reminder_deliveries_organization_id_organizations_i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_reminder_deliveries
    ADD CONSTRAINT appointment_reminder_deliveries_organization_id_organizations_i FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: appointment_reminder_deliveries appointment_reminders_appointment_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_reminder_deliveries
    ADD CONSTRAINT appointment_reminders_appointment_fk FOREIGN KEY (appointment_id, organization_id) REFERENCES public.appointments(id, organization_id);


--
-- Name: appointment_types appointment_types_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_types
    ADD CONSTRAINT appointment_types_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: appointment_waitlist_entries appointment_waitlist_entries_organization_id_organizations_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_waitlist_entries
    ADD CONSTRAINT appointment_waitlist_entries_organization_id_organizations_id_f FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: appointments appointments_appointment_type_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_appointment_type_fk FOREIGN KEY (appointment_type_id, organization_id) REFERENCES public.appointment_types(id, organization_id);


--
-- Name: appointments appointments_created_by_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_created_by_user_fk FOREIGN KEY (created_by_user_id, organization_id) REFERENCES public.users(id, organization_id);


--
-- Name: appointments appointments_location_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_location_fk FOREIGN KEY (location_id, organization_id) REFERENCES public.practice_locations(id, organization_id);


--
-- Name: appointments appointments_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: appointments appointments_patient_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_fk FOREIGN KEY (patient_id, organization_id) REFERENCES public.patient_profiles(id, organization_id);


--
-- Name: appointments appointments_practitioner_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_practitioner_fk FOREIGN KEY (practitioner_id, organization_id) REFERENCES public.practice_practitioners(id, organization_id);


--
-- Name: appointments appointments_practitioner_location_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_practitioner_location_fk FOREIGN KEY (organization_id, practitioner_id, location_id) REFERENCES public.practitioner_locations(organization_id, practitioner_id, location_id);


--
-- Name: appointments appointments_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_room_fk FOREIGN KEY (room_id, location_id, organization_id) REFERENCES public.practice_rooms(id, location_id, organization_id);


--
-- Name: archived_documents archived_documents_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_documents
    ADD CONSTRAINT archived_documents_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: audit_logs audit_logs_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: audit_logs audit_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: practitioner_availability_exceptions availability_exceptions_practitioner_location_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_availability_exceptions
    ADD CONSTRAINT availability_exceptions_practitioner_location_fk FOREIGN KEY (organization_id, practitioner_id, location_id) REFERENCES public.practitioner_locations(organization_id, practitioner_id, location_id);


--
-- Name: practitioner_availability_rules availability_rules_practitioner_location_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_availability_rules
    ADD CONSTRAINT availability_rules_practitioner_location_fk FOREIGN KEY (organization_id, practitioner_id, location_id) REFERENCES public.practitioner_locations(organization_id, practitioner_id, location_id);


--
-- Name: billing_document_sequences billing_document_sequences_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_document_sequences
    ADD CONSTRAINT billing_document_sequences_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: breach_notifications breach_notifications_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.breach_notifications
    ADD CONSTRAINT breach_notifications_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: care_episodes care_episodes_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_episodes
    ADD CONSTRAINT care_episodes_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: care_episodes care_episodes_patient_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_episodes
    ADD CONSTRAINT care_episodes_patient_fk FOREIGN KEY (patient_id, organization_id) REFERENCES public.patient_profiles(id, organization_id);


--
-- Name: care_episodes care_episodes_practitioner_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_episodes
    ADD CONSTRAINT care_episodes_practitioner_fk FOREIGN KEY (practitioner_id, organization_id) REFERENCES public.practice_practitioners(id, organization_id);


--
-- Name: clinical_documents clinical_documents_encounter_episode_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_documents
    ADD CONSTRAINT clinical_documents_encounter_episode_fk FOREIGN KEY (encounter_id, organization_id, care_episode_id, patient_id, practitioner_id) REFERENCES public.clinical_encounters(id, organization_id, care_episode_id, patient_id, practitioner_id);


--
-- Name: clinical_documents clinical_documents_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_documents
    ADD CONSTRAINT clinical_documents_encounter_fk FOREIGN KEY (encounter_id, organization_id, patient_id, practitioner_id) REFERENCES public.clinical_encounters(id, organization_id, patient_id, practitioner_id);


--
-- Name: clinical_documents clinical_documents_episode_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_documents
    ADD CONSTRAINT clinical_documents_episode_fk FOREIGN KEY (care_episode_id, organization_id, patient_id, practitioner_id) REFERENCES public.care_episodes(id, organization_id, patient_id, practitioner_id);


--
-- Name: clinical_documents clinical_documents_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_documents
    ADD CONSTRAINT clinical_documents_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: clinical_documents clinical_documents_patient_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_documents
    ADD CONSTRAINT clinical_documents_patient_fk FOREIGN KEY (patient_id, organization_id) REFERENCES public.patient_profiles(id, organization_id);


--
-- Name: clinical_documents clinical_documents_practitioner_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_documents
    ADD CONSTRAINT clinical_documents_practitioner_fk FOREIGN KEY (practitioner_id, organization_id) REFERENCES public.practice_practitioners(id, organization_id);


--
-- Name: clinical_encounters clinical_encounters_appointment_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_encounters
    ADD CONSTRAINT clinical_encounters_appointment_fk FOREIGN KEY (appointment_id, organization_id, patient_id, practitioner_id) REFERENCES public.appointments(id, organization_id, patient_id, practitioner_id);


--
-- Name: clinical_encounters clinical_encounters_episode_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_encounters
    ADD CONSTRAINT clinical_encounters_episode_fk FOREIGN KEY (care_episode_id, organization_id, patient_id, practitioner_id) REFERENCES public.care_episodes(id, organization_id, patient_id, practitioner_id);


--
-- Name: clinical_encounters clinical_encounters_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_encounters
    ADD CONSTRAINT clinical_encounters_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: clinical_form_responses clinical_form_responses_encounter_episode_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_form_responses
    ADD CONSTRAINT clinical_form_responses_encounter_episode_fk FOREIGN KEY (encounter_id, organization_id, care_episode_id, patient_id, practitioner_id) REFERENCES public.clinical_encounters(id, organization_id, care_episode_id, patient_id, practitioner_id);


--
-- Name: clinical_form_responses clinical_form_responses_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_form_responses
    ADD CONSTRAINT clinical_form_responses_encounter_fk FOREIGN KEY (encounter_id, organization_id, patient_id, practitioner_id) REFERENCES public.clinical_encounters(id, organization_id, patient_id, practitioner_id);


--
-- Name: clinical_form_responses clinical_form_responses_episode_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_form_responses
    ADD CONSTRAINT clinical_form_responses_episode_fk FOREIGN KEY (care_episode_id, organization_id, patient_id, practitioner_id) REFERENCES public.care_episodes(id, organization_id, patient_id, practitioner_id);


--
-- Name: clinical_form_responses clinical_form_responses_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_form_responses
    ADD CONSTRAINT clinical_form_responses_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: clinical_form_responses clinical_form_responses_patient_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_form_responses
    ADD CONSTRAINT clinical_form_responses_patient_fk FOREIGN KEY (patient_id, organization_id) REFERENCES public.patient_profiles(id, organization_id);


--
-- Name: clinical_form_responses clinical_form_responses_practitioner_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_form_responses
    ADD CONSTRAINT clinical_form_responses_practitioner_fk FOREIGN KEY (practitioner_id, organization_id) REFERENCES public.practice_practitioners(id, organization_id);


--
-- Name: clinical_form_responses clinical_form_responses_template_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_form_responses
    ADD CONSTRAINT clinical_form_responses_template_fk FOREIGN KEY (template_id, organization_id, practitioner_id) REFERENCES public.clinical_form_templates(id, organization_id, practitioner_id);


--
-- Name: clinical_form_templates clinical_form_templates_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_form_templates
    ADD CONSTRAINT clinical_form_templates_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: clinical_form_templates clinical_form_templates_practitioner_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_form_templates
    ADD CONSTRAINT clinical_form_templates_practitioner_fk FOREIGN KEY (practitioner_id, organization_id) REFERENCES public.practice_practitioners(id, organization_id);


--
-- Name: clinical_measurements clinical_measurements_encounter_episode_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_measurements
    ADD CONSTRAINT clinical_measurements_encounter_episode_fk FOREIGN KEY (encounter_id, organization_id, care_episode_id, patient_id, practitioner_id) REFERENCES public.clinical_encounters(id, organization_id, care_episode_id, patient_id, practitioner_id);


--
-- Name: clinical_measurements clinical_measurements_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_measurements
    ADD CONSTRAINT clinical_measurements_encounter_fk FOREIGN KEY (encounter_id, organization_id, patient_id, practitioner_id) REFERENCES public.clinical_encounters(id, organization_id, patient_id, practitioner_id);


--
-- Name: clinical_measurements clinical_measurements_episode_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_measurements
    ADD CONSTRAINT clinical_measurements_episode_fk FOREIGN KEY (care_episode_id, organization_id, patient_id, practitioner_id) REFERENCES public.care_episodes(id, organization_id, patient_id, practitioner_id);


--
-- Name: clinical_measurements clinical_measurements_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_measurements
    ADD CONSTRAINT clinical_measurements_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: clinical_measurements clinical_measurements_patient_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_measurements
    ADD CONSTRAINT clinical_measurements_patient_fk FOREIGN KEY (patient_id, organization_id) REFERENCES public.patient_profiles(id, organization_id);


--
-- Name: clinical_measurements clinical_measurements_practitioner_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_measurements
    ADD CONSTRAINT clinical_measurements_practitioner_fk FOREIGN KEY (practitioner_id, organization_id) REFERENCES public.practice_practitioners(id, organization_id);


--
-- Name: clinical_notes clinical_notes_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_notes
    ADD CONSTRAINT clinical_notes_encounter_fk FOREIGN KEY (encounter_id, organization_id, patient_id, author_practitioner_id) REFERENCES public.clinical_encounters(id, organization_id, patient_id, practitioner_id);


--
-- Name: clinical_notes clinical_notes_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_notes
    ADD CONSTRAINT clinical_notes_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: consent_events consent_events_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_events
    ADD CONSTRAINT consent_events_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: consent_events consent_events_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_events
    ADD CONSTRAINT consent_events_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: data_subject_requests data_subject_requests_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_subject_requests
    ADD CONSTRAINT data_subject_requests_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: data_subject_requests data_subject_requests_processed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_subject_requests
    ADD CONSTRAINT data_subject_requests_processed_by_users_id_fk FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- Name: data_subject_requests data_subject_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_subject_requests
    ADD CONSTRAINT data_subject_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: field_service_work_order_assignments field_service_assignments_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_order_assignments
    ADD CONSTRAINT field_service_assignments_user_fk FOREIGN KEY (user_id, organization_id) REFERENCES public.users(id, organization_id);


--
-- Name: field_service_work_order_assignments field_service_assignments_work_order_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_order_assignments
    ADD CONSTRAINT field_service_assignments_work_order_fk FOREIGN KEY (work_order_id, organization_id) REFERENCES public.field_service_work_orders(id, organization_id);


--
-- Name: field_service_work_reports field_service_reports_author_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_reports
    ADD CONSTRAINT field_service_reports_author_user_fk FOREIGN KEY (author_user_id, organization_id) REFERENCES public.users(id, organization_id);


--
-- Name: field_service_work_reports field_service_reports_work_order_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_reports
    ADD CONSTRAINT field_service_reports_work_order_fk FOREIGN KEY (work_order_id, organization_id) REFERENCES public.field_service_work_orders(id, organization_id);


--
-- Name: field_service_sites field_service_sites_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_sites
    ADD CONSTRAINT field_service_sites_client_fk FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id);


--
-- Name: field_service_sites field_service_sites_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_sites
    ADD CONSTRAINT field_service_sites_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: field_service_work_order_status_history field_service_status_history_changed_by_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_order_status_history
    ADD CONSTRAINT field_service_status_history_changed_by_user_fk FOREIGN KEY (changed_by_user_id, organization_id) REFERENCES public.users(id, organization_id);


--
-- Name: field_service_work_order_status_history field_service_status_history_work_order_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_order_status_history
    ADD CONSTRAINT field_service_status_history_work_order_fk FOREIGN KEY (work_order_id, organization_id) REFERENCES public.field_service_work_orders(id, organization_id);


--
-- Name: field_service_work_order_assignments field_service_work_order_assignments_organization_id_organizati; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_order_assignments
    ADD CONSTRAINT field_service_work_order_assignments_organization_id_organizati FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: field_service_work_order_status_history field_service_work_order_status_history_organization_id_organiz; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_order_status_history
    ADD CONSTRAINT field_service_work_order_status_history_organization_id_organiz FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: field_service_work_orders field_service_work_orders_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_orders
    ADD CONSTRAINT field_service_work_orders_client_fk FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id);


--
-- Name: field_service_work_orders field_service_work_orders_created_by_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_orders
    ADD CONSTRAINT field_service_work_orders_created_by_user_fk FOREIGN KEY (created_by_user_id, organization_id) REFERENCES public.users(id, organization_id);


--
-- Name: field_service_work_orders field_service_work_orders_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_orders
    ADD CONSTRAINT field_service_work_orders_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: field_service_work_orders field_service_work_orders_site_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_orders
    ADD CONSTRAINT field_service_work_orders_site_fk FOREIGN KEY (site_id, organization_id, client_id) REFERENCES public.field_service_sites(id, organization_id, client_id);


--
-- Name: field_service_work_orders field_service_work_orders_source_quote_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_orders
    ADD CONSTRAINT field_service_work_orders_source_quote_fk FOREIGN KEY (source_quote_id, organization_id) REFERENCES public.invoices(id, organization_id);


--
-- Name: field_service_work_reports field_service_work_reports_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_service_work_reports
    ADD CONSTRAINT field_service_work_reports_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: invoice_lines invoice_lines_invoice_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_invoice_fk FOREIGN KEY (invoice_id, organization_id) REFERENCES public.invoices(id, organization_id) ON DELETE CASCADE;


--
-- Name: invoice_lines invoice_lines_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: invoice_lines invoice_lines_section_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_section_fk FOREIGN KEY (section_id, organization_id, invoice_id) REFERENCES public.invoice_sections(id, organization_id, invoice_id) ON DELETE SET NULL;


--
-- Name: invoice_lines invoice_lines_source_line_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_source_line_fk FOREIGN KEY (source_line_id, organization_id) REFERENCES public.invoice_lines(id, organization_id);


--
-- Name: invoice_sections invoice_sections_invoice_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_sections
    ADD CONSTRAINT invoice_sections_invoice_fk FOREIGN KEY (invoice_id, organization_id) REFERENCES public.invoices(id, organization_id) ON DELETE CASCADE;


--
-- Name: invoice_sections invoice_sections_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_sections
    ADD CONSTRAINT invoice_sections_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: invoice_sections invoice_sections_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_sections
    ADD CONSTRAINT invoice_sections_parent_fk FOREIGN KEY (parent_section_id, organization_id, invoice_id) REFERENCES public.invoice_sections(id, organization_id, invoice_id) ON DELETE CASCADE;


--
-- Name: invoices invoices_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_fk FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id);


--
-- Name: invoices invoices_deal_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_deal_fk FOREIGN KEY (deal_id, organization_id) REFERENCES public.deals(id, organization_id);


--
-- Name: invoices invoices_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: invoices invoices_site_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_site_fk FOREIGN KEY (site_id, organization_id, client_id) REFERENCES public.field_service_sites(id, organization_id, client_id);


--
-- Name: invoices invoices_source_quote_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_source_quote_fk FOREIGN KEY (source_quote_id, organization_id) REFERENCES public.invoices(id, organization_id);


--
-- Name: invoices invoices_supersedes_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_supersedes_fk FOREIGN KEY (supersedes_document_id, organization_id) REFERENCES public.invoices(id, organization_id);


--
-- Name: legal_entities legal_entities_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_entities
    ADD CONSTRAINT legal_entities_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: messages messages_patient_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_patient_fk FOREIGN KEY (patient_id, organization_id) REFERENCES public.patient_profiles(id, organization_id);


--
-- Name: patient_billing_links patient_billing_links_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_billing_links
    ADD CONSTRAINT patient_billing_links_client_fk FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id);


--
-- Name: patient_billing_links patient_billing_links_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_billing_links
    ADD CONSTRAINT patient_billing_links_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: patient_billing_links patient_billing_links_patient_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_billing_links
    ADD CONSTRAINT patient_billing_links_patient_fk FOREIGN KEY (patient_id, organization_id) REFERENCES public.patient_profiles(id, organization_id);


--
-- Name: patient_portal_access patient_portal_access_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_portal_access
    ADD CONSTRAINT patient_portal_access_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: patient_portal_access patient_portal_access_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_portal_access
    ADD CONSTRAINT patient_portal_access_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: patient_portal_access patient_portal_access_patient_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_portal_access
    ADD CONSTRAINT patient_portal_access_patient_fk FOREIGN KEY (patient_id, organization_id) REFERENCES public.patient_profiles(id, organization_id);


--
-- Name: patient_portal_access patient_portal_access_rep_link_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_portal_access
    ADD CONSTRAINT patient_portal_access_rep_link_fk FOREIGN KEY (organization_id, patient_id, representative_id) REFERENCES public.patient_representative_links(organization_id, patient_id, representative_id);


--
-- Name: patient_portal_access patient_portal_access_representative_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_portal_access
    ADD CONSTRAINT patient_portal_access_representative_fk FOREIGN KEY (representative_id, organization_id) REFERENCES public.patient_representatives(id, organization_id);


--
-- Name: patient_portal_access patient_portal_access_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_portal_access
    ADD CONSTRAINT patient_portal_access_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: patient_profiles patient_profiles_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_profiles
    ADD CONSTRAINT patient_profiles_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: patient_questionnaire_assignments patient_questionnaire_assignments_organization_id_organizations; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_questionnaire_assignments
    ADD CONSTRAINT patient_questionnaire_assignments_organization_id_organizations FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: patient_questionnaire_assignments patient_questionnaires_episode_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_questionnaire_assignments
    ADD CONSTRAINT patient_questionnaires_episode_fk FOREIGN KEY (care_episode_id, organization_id, patient_id, practitioner_id) REFERENCES public.care_episodes(id, organization_id, patient_id, practitioner_id);


--
-- Name: patient_questionnaire_assignments patient_questionnaires_patient_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_questionnaire_assignments
    ADD CONSTRAINT patient_questionnaires_patient_fk FOREIGN KEY (patient_id, organization_id) REFERENCES public.patient_profiles(id, organization_id);


--
-- Name: patient_questionnaire_assignments patient_questionnaires_practitioner_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_questionnaire_assignments
    ADD CONSTRAINT patient_questionnaires_practitioner_fk FOREIGN KEY (practitioner_id, organization_id) REFERENCES public.practice_practitioners(id, organization_id);


--
-- Name: patient_questionnaire_assignments patient_questionnaires_response_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_questionnaire_assignments
    ADD CONSTRAINT patient_questionnaires_response_fk FOREIGN KEY (clinical_response_id, organization_id) REFERENCES public.clinical_form_responses(id, organization_id);


--
-- Name: patient_questionnaire_assignments patient_questionnaires_template_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_questionnaire_assignments
    ADD CONSTRAINT patient_questionnaires_template_fk FOREIGN KEY (template_id, organization_id, practitioner_id) REFERENCES public.clinical_form_templates(id, organization_id, practitioner_id);


--
-- Name: patient_representative_links patient_rep_links_patient_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_representative_links
    ADD CONSTRAINT patient_rep_links_patient_fk FOREIGN KEY (patient_id, organization_id) REFERENCES public.patient_profiles(id, organization_id);


--
-- Name: patient_representative_links patient_rep_links_representative_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_representative_links
    ADD CONSTRAINT patient_rep_links_representative_fk FOREIGN KEY (representative_id, organization_id) REFERENCES public.patient_representatives(id, organization_id);


--
-- Name: patient_representative_links patient_representative_links_organization_id_organizations_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_representative_links
    ADD CONSTRAINT patient_representative_links_organization_id_organizations_id_f FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: patient_representatives patient_representatives_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_representatives
    ADD CONSTRAINT patient_representatives_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: practice_locations practice_locations_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_locations
    ADD CONSTRAINT practice_locations_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: practice_practitioners practice_practitioners_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_practitioners
    ADD CONSTRAINT practice_practitioners_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: practice_practitioners practice_practitioners_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_practitioners
    ADD CONSTRAINT practice_practitioners_user_fk FOREIGN KEY (user_id, organization_id) REFERENCES public.users(id, organization_id);


--
-- Name: practice_resources practice_resources_location_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_resources
    ADD CONSTRAINT practice_resources_location_fk FOREIGN KEY (location_id, organization_id) REFERENCES public.practice_locations(id, organization_id);


--
-- Name: practice_resources practice_resources_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_resources
    ADD CONSTRAINT practice_resources_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: practice_resources practice_resources_room_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_resources
    ADD CONSTRAINT practice_resources_room_fk FOREIGN KEY (room_id, location_id, organization_id) REFERENCES public.practice_rooms(id, location_id, organization_id);


--
-- Name: practice_rooms practice_rooms_location_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_rooms
    ADD CONSTRAINT practice_rooms_location_fk FOREIGN KEY (location_id, organization_id) REFERENCES public.practice_locations(id, organization_id);


--
-- Name: practice_rooms practice_rooms_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_rooms
    ADD CONSTRAINT practice_rooms_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: practitioner_availability_exceptions practitioner_availability_exceptions_organization_id_organizati; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_availability_exceptions
    ADD CONSTRAINT practitioner_availability_exceptions_organization_id_organizati FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: practitioner_availability_rules practitioner_availability_rules_organization_id_organizations_i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_availability_rules
    ADD CONSTRAINT practitioner_availability_rules_organization_id_organizations_i FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: practitioner_locations practitioner_locations_location_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_locations
    ADD CONSTRAINT practitioner_locations_location_fk FOREIGN KEY (location_id, organization_id) REFERENCES public.practice_locations(id, organization_id);


--
-- Name: practitioner_locations practitioner_locations_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_locations
    ADD CONSTRAINT practitioner_locations_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: practitioner_locations practitioner_locations_practitioner_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practitioner_locations
    ADD CONSTRAINT practitioner_locations_practitioner_fk FOREIGN KEY (practitioner_id, organization_id) REFERENCES public.practice_practitioners(id, organization_id);


--
-- Name: processing_activities processing_activities_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_activities
    ADD CONSTRAINT processing_activities_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: role_permissions role_permissions_permission_id_permissions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_permissions_id_fk FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: role_permissions role_permissions_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: user_roles user_roles_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: appointment_waitlist_entries waitlist_appointment_type_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_waitlist_entries
    ADD CONSTRAINT waitlist_appointment_type_fk FOREIGN KEY (appointment_type_id, organization_id) REFERENCES public.appointment_types(id, organization_id);


--
-- Name: appointment_waitlist_entries waitlist_created_by_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_waitlist_entries
    ADD CONSTRAINT waitlist_created_by_user_fk FOREIGN KEY (created_by_user_id, organization_id) REFERENCES public.users(id, organization_id);


--
-- Name: appointment_waitlist_entries waitlist_location_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_waitlist_entries
    ADD CONSTRAINT waitlist_location_fk FOREIGN KEY (location_id, organization_id) REFERENCES public.practice_locations(id, organization_id);


--
-- Name: appointment_waitlist_entries waitlist_patient_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_waitlist_entries
    ADD CONSTRAINT waitlist_patient_fk FOREIGN KEY (patient_id, organization_id) REFERENCES public.patient_profiles(id, organization_id);


--
-- Name: appointment_waitlist_entries waitlist_practitioner_location_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_waitlist_entries
    ADD CONSTRAINT waitlist_practitioner_location_fk FOREIGN KEY (organization_id, practitioner_id, location_id) REFERENCES public.practitioner_locations(organization_id, practitioner_id, location_id);


--
-- Name: appointment_waitlist_entries waitlist_resolved_appointment_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_waitlist_entries
    ADD CONSTRAINT waitlist_resolved_appointment_fk FOREIGN KEY (resolved_appointment_id, organization_id) REFERENCES public.appointments(id, organization_id);


