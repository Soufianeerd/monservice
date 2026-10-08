-- Reviewed canonical function: allocate_billing_document_number
CREATE OR REPLACE FUNCTION public.allocate_billing_document_number(p_organization_id text, p_document_type text, p_year integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next_seq integer;
  v_prefix text;
BEGIN
  IF p_organization_id IS DISTINCT FROM public.current_organization_id() OR public.current_profile_type() IS DISTINCT FROM 'professional' THEN RAISE EXCEPTION 'Billing number authority denied' USING ERRCODE='42501'; END IF;
IF p_document_type NOT IN ('invoice', 'quote') THEN
    RAISE EXCEPTION 'Invalid document type: %', p_document_type;
  END IF;

  INSERT INTO public.billing_document_sequences (organization_id, document_type, year, last_sequence, updated_at)
  VALUES (p_organization_id, p_document_type, p_year, 1, now())
  ON CONFLICT (organization_id, document_type, year)
  DO UPDATE SET
    last_sequence = public.billing_document_sequences.last_sequence + 1,
    updated_at = now()
  RETURNING last_sequence INTO v_next_seq;

  IF p_document_type = 'invoice' THEN
    v_prefix := 'F-';
  ELSE
    v_prefix := 'D-';
  END IF;

  RETURN v_prefix || p_year::text || '-' || lpad(v_next_seq::text, 4, '0');
END;
$function$
;

-- Reviewed canonical function: can_insert_patient_message
CREATE OR REPLACE FUNCTION public.can_insert_patient_message(p_sender_id text, p_receiver_id text, p_patient_id text, p_organization_id text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_practitioner_id text;
  v_org_id text;
BEGIN
  IF p_patient_id IS NULL THEN
    RETURN true;
  END IF;

  -- Case 1: Sender is a patient client sending to an active practitioner with an active care episode
  IF EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = p_sender_id AND u.profile_type = 'client'
  ) THEN
    RETURN EXISTS (
      SELECT 1 
      FROM public.patient_portal_access ppa
      JOIN public.practice_practitioners pp 
        ON pp.organization_id = ppa.organization_id 
       AND pp.user_id = p_receiver_id 
       AND pp.is_active = true
      JOIN public.care_episodes ce 
        ON ce.organization_id = ppa.organization_id 
       AND ce.patient_id = ppa.patient_id 
       AND ce.practitioner_id = pp.id 
       AND ce.status = 'active'
      WHERE ppa.user_id = p_sender_id
        AND ppa.patient_id = p_patient_id
        AND (p_organization_id IS NULL OR ppa.organization_id = p_organization_id)
        AND ppa.is_active = true
    );
  END IF;

  -- Case 2: Sender is an active clinical practitioner in the practice sending to a client patient with active portal access and active care episode
  v_practitioner_id := public.current_clinical_practitioner_id();
  IF v_practitioner_id IS NOT NULL THEN
    -- Verify sender user is the practitioner user
    IF NOT EXISTS (
      SELECT 1 FROM public.practice_practitioners pp
      WHERE pp.id = v_practitioner_id AND pp.user_id = p_sender_id AND pp.is_active = true
    ) THEN
      RETURN false;
    END IF;

    -- Verify receiver is a client user
    IF NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_receiver_id AND u.profile_type = 'client'
    ) THEN
      RETURN false;
    END IF;

    v_org_id := COALESCE(p_organization_id, public.current_organization_id());

    RETURN EXISTS (
      SELECT 1 
      FROM public.patient_portal_access ppa
      JOIN public.care_episodes ce 
        ON ce.organization_id = ppa.organization_id 
       AND ce.patient_id = ppa.patient_id 
       AND ce.practitioner_id = v_practitioner_id 
       AND ce.status = 'active'
      WHERE ppa.user_id = p_receiver_id
        AND ppa.patient_id = p_patient_id
        AND (v_org_id IS NULL OR ppa.organization_id = v_org_id)
        AND ppa.is_active = true
    );
  END IF;

  RETURN false;
END;
$function$
;

-- Reviewed canonical function: current_account_is_active
CREATE OR REPLACE FUNCTION public.current_account_is_active()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$ SELECT EXISTS (SELECT 1 FROM public.users WHERE id = public.current_app_user_id()::text AND account_closed_at IS NULL); $function$
;

-- Reviewed canonical function: current_clinical_practitioner_id
CREATE OR REPLACE FUNCTION public.current_clinical_practitioner_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT pp.id
  FROM public.practice_practitioners pp
  JOIN public.users u ON u.id = pp.user_id AND u.organization_id = pp.organization_id
  WHERE pp.user_id = public.current_app_user_id()::text
    AND pp.organization_id = public.current_organization_id()
    AND pp.is_active = true
    AND u.profile_type = 'professional'
  LIMIT 1;
$function$
;

-- Reviewed canonical function: current_organization_id
CREATE OR REPLACE FUNCTION public.current_organization_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM public.users WHERE id = public.current_app_user_id()::text;
$function$
;

-- Reviewed canonical function: enforce_appointment_status_transition
CREATE OR REPLACE FUNCTION public.enforce_appointment_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'scheduled' THEN
      RAISE EXCEPTION 'Appointments must be inserted with status scheduled'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.cancellation_reason_code IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.no_show_at IS NOT NULL THEN
      RAISE EXCEPTION 'New appointments cannot contain cancellation or no_show metadata'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If already terminal, reject any update
    IF OLD.status IN ('cancelled', 'no_show') THEN
      RAISE EXCEPTION 'Terminal appointment status is immutable'
        USING ERRCODE = '23514';
    END IF;

    -- scheduled -> cancelled
    IF OLD.status = 'scheduled' AND NEW.status = 'cancelled' THEN
      -- Guard against structural mutation during terminal transition
      IF NEW.id <> OLD.id
         OR NEW.organization_id <> OLD.organization_id
         OR NEW.patient_id <> OLD.patient_id
         OR NEW.practitioner_id <> OLD.practitioner_id
         OR NEW.appointment_type_id <> OLD.appointment_type_id
         OR NEW.location_id <> OLD.location_id
         OR NEW.room_id IS DISTINCT FROM OLD.room_id
         OR NEW.created_by_user_id <> OLD.created_by_user_id
         OR NEW.starts_at <> OLD.starts_at
         OR NEW.ends_at <> OLD.ends_at
         OR NEW.occupancy_starts_at <> OLD.occupancy_starts_at
         OR NEW.occupancy_ends_at <> OLD.occupancy_ends_at
         OR NEW.timezone <> OLD.timezone
         OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Structural mutation is not allowed during terminal status transition'
          USING ERRCODE = '23514';
      END IF;

      IF NEW.cancellation_reason_code IS NULL THEN
        RAISE EXCEPTION 'Cancellation reason code is required when cancelling appointment'
          USING ERRCODE = '23514';
      END IF;
      NEW.cancelled_at := now();
      NEW.no_show_at := NULL;
      RETURN NEW;
    END IF;

    -- scheduled -> no_show
    IF OLD.status = 'scheduled' AND NEW.status = 'no_show' THEN
      -- P0 Invariant: OLD.starts_at must be in the past or current time
      IF OLD.starts_at > now() THEN
        RAISE EXCEPTION 'Cannot mark a future appointment as no_show'
          USING ERRCODE = '23514';
      END IF;

      -- Guard against structural mutation during terminal transition
      IF NEW.id <> OLD.id
         OR NEW.organization_id <> OLD.organization_id
         OR NEW.patient_id <> OLD.patient_id
         OR NEW.practitioner_id <> OLD.practitioner_id
         OR NEW.appointment_type_id <> OLD.appointment_type_id
         OR NEW.location_id <> OLD.location_id
         OR NEW.room_id IS DISTINCT FROM OLD.room_id
         OR NEW.created_by_user_id <> OLD.created_by_user_id
         OR NEW.starts_at <> OLD.starts_at
         OR NEW.ends_at <> OLD.ends_at
         OR NEW.occupancy_starts_at <> OLD.occupancy_starts_at
         OR NEW.occupancy_ends_at <> OLD.occupancy_ends_at
         OR NEW.timezone <> OLD.timezone
         OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Structural mutation is not allowed during terminal status transition'
          USING ERRCODE = '23514';
      END IF;

      NEW.no_show_at := now();
      NEW.cancelled_at := NULL;
      NEW.cancellation_reason_code := NULL;
      RETURN NEW;
    END IF;

    -- scheduled -> scheduled (rescheduling, room/practitioner/type update)
    IF OLD.status = 'scheduled' AND NEW.status = 'scheduled' THEN
      IF NEW.cancellation_reason_code IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.no_show_at IS NOT NULL THEN
        RAISE EXCEPTION 'Scheduled appointments cannot contain cancellation or no_show metadata'
          USING ERRCODE = '23514';
      END IF;
      NEW.cancellation_reason_code := NULL;
      NEW.cancelled_at := NULL;
      NEW.no_show_at := NULL;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid appointment status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_care_episode_transition
CREATE OR REPLACE FUNCTION public.enforce_care_episode_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'active' OR NEW.closed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Care episodes must be created as active without closed_at'
        USING ERRCODE = '23514';
    END IF;
    NEW.started_at := COALESCE(NEW.started_at, now());
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'closed' THEN
      RAISE EXCEPTION 'Closed care episodes cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.practitioner_id IS DISTINCT FROM OLD.practitioner_id
       OR NEW.started_at IS DISTINCT FROM OLD.started_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Structural fields of care episode are immutable'
        USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'active' AND NEW.status = 'active' THEN
      IF NEW.closed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Active care episode cannot have closed_at set'
          USING ERRCODE = '23514';
      END IF;
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    IF OLD.status = 'active' AND NEW.status = 'closed' THEN
      IF EXISTS (
        SELECT 1
        FROM public.clinical_encounters ce
        JOIN public.clinical_notes cn ON cn.encounter_id = ce.id AND cn.organization_id = ce.organization_id
        WHERE ce.care_episode_id = OLD.id
          AND ce.organization_id = OLD.organization_id
          AND cn.status = 'draft'
      ) THEN
        RAISE EXCEPTION 'Cannot close care episode with draft clinical notes'
          USING ERRCODE = '23514';
      END IF;
      NEW.closed_at := now();
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid care episode status transition'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_clinical_document_mutation
CREATE OR REPLACE FUNCTION public.enforce_clinical_document_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id <> OLD.id
       OR NEW.organization_id <> OLD.organization_id
       OR NEW.patient_id <> OLD.patient_id
       OR NEW.practitioner_id <> OLD.practitioner_id
       OR NEW.care_episode_id IS DISTINCT FROM OLD.care_episode_id
       OR NEW.encounter_id IS DISTINCT FROM OLD.encounter_id
       OR NEW.storage_path <> OLD.storage_path
       OR NEW.file_name <> OLD.file_name
       OR NEW.mime_type <> OLD.mime_type
       OR NEW.size_bytes <> OLD.size_bytes
       OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Structural mutation is not allowed on clinical documents'
        USING ERRCODE = '23514';
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_clinical_encounter_insert
CREATE OR REPLACE FUNCTION public.enforce_clinical_encounter_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ep_status text;
  v_appt_starts_at timestamptz;
  v_appt_status text;
BEGIN
  IF NEW.occurred_at > now() THEN
    RAISE EXCEPTION 'Clinical encounter cannot occur in the future'
      USING ERRCODE = '23514';
  END IF;

  SELECT status INTO v_ep_status
  FROM public.care_episodes
  WHERE id = NEW.care_episode_id
    AND organization_id = NEW.organization_id
    AND patient_id = NEW.patient_id
    AND practitioner_id = NEW.practitioner_id;

  IF v_ep_status IS NOT NULL AND v_ep_status != 'active' THEN
    RAISE EXCEPTION 'Cannot create encounter on a closed care episode'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.appointment_id IS NOT NULL THEN
    SELECT starts_at, status INTO v_appt_starts_at, v_appt_status
    FROM public.appointments
    WHERE id = NEW.appointment_id
      AND organization_id = NEW.organization_id
      AND patient_id = NEW.patient_id
      AND practitioner_id = NEW.practitioner_id;

    IF v_appt_status IS NOT NULL THEN
      IF v_appt_starts_at > now() THEN
        RAISE EXCEPTION 'Cannot link encounter to future appointment'
          USING ERRCODE = '23514';
      END IF;
      IF v_appt_status != 'scheduled' THEN
        RAISE EXCEPTION 'Cannot link encounter to non-scheduled appointment'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  NEW.created_at := COALESCE(NEW.created_at, now());
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_clinical_form_response_transition
CREATE OR REPLACE FUNCTION public.enforce_clinical_form_response_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'draft' OR NEW.finalized_at IS NOT NULL THEN
      RAISE EXCEPTION 'Clinical form responses must be created as draft without finalized_at'
        USING ERRCODE = '23514';
    END IF;
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'finalized' THEN
      RAISE EXCEPTION 'Finalized clinical form responses are immutable'
        USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'draft' AND NEW.status = 'draft' THEN
      IF NEW.id <> OLD.id
         OR NEW.organization_id <> OLD.organization_id
         OR NEW.patient_id <> OLD.patient_id
         OR NEW.practitioner_id <> OLD.practitioner_id
         OR NEW.template_id <> OLD.template_id
         OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Structural mutation is not allowed on draft clinical form responses'
          USING ERRCODE = '23514';
      END IF;
      NEW.finalized_at := NULL;
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    IF OLD.status = 'draft' AND NEW.status = 'finalized' THEN
      IF NEW.id <> OLD.id
         OR NEW.organization_id <> OLD.organization_id
         OR NEW.patient_id <> OLD.patient_id
         OR NEW.practitioner_id <> OLD.practitioner_id
         OR NEW.template_id <> OLD.template_id
         OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Structural mutation is not allowed during form response finalization'
          USING ERRCODE = '23514';
      END IF;
      NEW.finalized_at := now();
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid form response status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_clinical_measurement_insert
CREATE OR REPLACE FUNCTION public.enforce_clinical_measurement_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.observed_at > now() THEN
    RAISE EXCEPTION 'Cannot record a clinical measurement in the future'
      USING ERRCODE = '23514';
  END IF;
  NEW.created_at := COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_clinical_note_transition
CREATE OR REPLACE FUNCTION public.enforce_clinical_note_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ep_status text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'draft' OR NEW.finalized_at IS NOT NULL THEN
      RAISE EXCEPTION 'Clinical notes must be created as draft without finalized_at'
        USING ERRCODE = '23514';
    END IF;

    SELECT ep.status INTO v_ep_status
    FROM public.clinical_encounters ce
    JOIN public.care_episodes ep ON ep.id = ce.care_episode_id AND ep.organization_id = ce.organization_id
    WHERE ce.id = NEW.encounter_id
      AND ce.organization_id = NEW.organization_id;

    IF v_ep_status IS NOT NULL AND v_ep_status != 'active' THEN
      RAISE EXCEPTION 'Cannot create clinical note on encounter belonging to a closed care episode'
        USING ERRCODE = '23514';
    END IF;

    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'finalized' THEN
      RAISE EXCEPTION 'Finalized clinical notes are immutable'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.encounter_id IS DISTINCT FROM OLD.encounter_id
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.author_practitioner_id IS DISTINCT FROM OLD.author_practitioner_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Structural fields of clinical note are immutable'
        USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'draft' AND NEW.status = 'draft' THEN
      IF NEW.finalized_at IS NOT NULL THEN
        RAISE EXCEPTION 'Draft note cannot have finalized_at timestamp'
          USING ERRCODE = '23514';
      END IF;
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    IF OLD.status = 'draft' AND NEW.status = 'finalized' THEN
      NEW.finalized_at := now();
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid clinical note status transition'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_field_service_assignment_invariants
CREATE OR REPLACE FUNCTION public.enforce_field_service_assignment_invariants()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_org text;
  v_profile_type text;
  v_wo_status text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.id IS DISTINCT FROM NEW.id
       OR OLD.organization_id IS DISTINCT FROM NEW.organization_id
       OR OLD.work_order_id IS DISTINCT FROM NEW.work_order_id
       OR OLD.user_id IS DISTINCT FROM NEW.user_id
       OR OLD.assigned_at IS DISTINCT FROM NEW.assigned_at
       OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
      RAISE EXCEPTION 'Work order assignment core attributes are immutable' USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT u.organization_id, u.profile_type
  INTO v_user_org, v_profile_type
  FROM public.users u
  WHERE u.id = NEW.user_id;

  IF v_profile_type IS NULL OR v_profile_type != 'professional' OR v_user_org != NEW.organization_id THEN
    RAISE EXCEPTION 'Assigned user must be an active professional in the same organization' USING ERRCODE = '23514';
  END IF;

  SELECT wo.status INTO v_wo_status
  FROM public.field_service_work_orders wo
  WHERE wo.id = NEW.work_order_id AND wo.organization_id = NEW.organization_id;

  IF v_wo_status IN ('completed', 'cancelled') AND NEW.is_active = true THEN
    RAISE EXCEPTION 'Cannot assign technician to completed or cancelled work order' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_field_service_site_immutability
CREATE OR REPLACE FUNCTION public.enforce_field_service_site_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.id IS DISTINCT FROM NEW.id
       OR OLD.organization_id IS DISTINCT FROM NEW.organization_id
       OR OLD.client_id IS DISTINCT FROM NEW.client_id
       OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
      RAISE EXCEPTION 'Site core identity (id, organization_id, client_id, created_at) is immutable' USING ERRCODE = '23514';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_field_service_status_history_append_only
CREATE OR REPLACE FUNCTION public.enforce_field_service_status_history_append_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RAISE EXCEPTION 'field_service_work_order_status_history is append-only' USING ERRCODE = '23514';
END;
$function$
;

-- Reviewed canonical function: enforce_field_service_work_order_transition
CREATE OR REPLACE FUNCTION public.enforce_field_service_work_order_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'scheduled') THEN
      RAISE EXCEPTION 'New work order must be created in draft or scheduled status' USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'draft' THEN
      NEW.actual_start := NULL;
      NEW.actual_end := NULL;
      NEW.cancellation_reason_code := NULL;
    ELSIF NEW.status = 'scheduled' THEN
      NEW.actual_start := NULL;
      NEW.actual_end := NULL;
      NEW.cancellation_reason_code := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Structural immutability
    IF OLD.id IS DISTINCT FROM NEW.id
       OR OLD.organization_id IS DISTINCT FROM NEW.organization_id
       OR OLD.client_id IS DISTINCT FROM NEW.client_id
       OR OLD.created_by_user_id IS DISTINCT FROM NEW.created_by_user_id
       OR OLD.reference IS DISTINCT FROM NEW.reference
       OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
      RAISE EXCEPTION 'Work order core identity (id, organization_id, client_id, created_by_user_id, reference, created_at) is immutable' USING ERRCODE = '23514';
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF OLD.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot transition from terminal status %', OLD.status USING ERRCODE = '23514';
      END IF;

      IF OLD.status = 'draft' AND NEW.status NOT IN ('scheduled', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from draft to %', NEW.status USING ERRCODE = '23514';
      END IF;

      IF OLD.status = 'scheduled' AND NEW.status NOT IN ('draft', 'in_progress', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from scheduled to %', NEW.status USING ERRCODE = '23514';
      END IF;

      IF OLD.status = 'in_progress' AND NEW.status NOT IN ('paused', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from in_progress to %', NEW.status USING ERRCODE = '23514';
      END IF;

      IF OLD.status = 'paused' AND NEW.status NOT IN ('in_progress', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from paused to %', NEW.status USING ERRCODE = '23514';
      END IF;

      IF NEW.status = 'in_progress' THEN
        IF NEW.actual_start IS NULL THEN
          NEW.actual_start := now();
        END IF;
      END IF;

      IF NEW.status = 'completed' THEN
        IF NEW.actual_start IS NULL THEN
          NEW.actual_start := COALESCE(OLD.actual_start, now());
        END IF;
        NEW.actual_end := now();
      END IF;

      IF NEW.status = 'cancelled' THEN
        IF NEW.cancellation_reason_code IS NULL THEN
          RAISE EXCEPTION 'Cancellation reason code is required when cancelling a work order' USING ERRCODE = '23514';
        END IF;
        IF NEW.actual_start IS NOT NULL AND NEW.actual_end IS NULL THEN
          NEW.actual_end := now();
        END IF;
      END IF;
    ELSE
      -- Disallow modifying business execution data on terminal work orders
      IF OLD.status IN ('completed', 'cancelled') THEN
        IF OLD.site_id IS DISTINCT FROM NEW.site_id
           OR OLD.title IS DISTINCT FROM NEW.title
           OR OLD.description IS DISTINCT FROM NEW.description
           OR OLD.work_type IS DISTINCT FROM NEW.work_type
           OR OLD.priority IS DISTINCT FROM NEW.priority
           OR OLD.scheduled_start IS DISTINCT FROM NEW.scheduled_start
           OR OLD.scheduled_end IS DISTINCT FROM NEW.scheduled_end
           OR OLD.cancellation_reason_code IS DISTINCT FROM NEW.cancellation_reason_code
           OR OLD.cancellation_notes IS DISTINCT FROM NEW.cancellation_notes
           OR OLD.actual_start IS DISTINCT FROM NEW.actual_start
           OR OLD.actual_end IS DISTINCT FROM NEW.actual_end THEN
          RAISE EXCEPTION 'Terminal work order cannot be modified' USING ERRCODE = '23514';
        END IF;
      END IF;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_field_service_work_report_transition
CREATE OR REPLACE FUNCTION public.enforce_field_service_work_report_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Work reports cannot be deleted' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'draft' THEN
      RAISE EXCEPTION 'New work report must be created in draft status' USING ERRCODE = '23514';
    END IF;
    NEW.finalized_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Structural immutability of report identity
    IF OLD.id IS DISTINCT FROM NEW.id
       OR OLD.organization_id IS DISTINCT FROM NEW.organization_id
       OR OLD.work_order_id IS DISTINCT FROM NEW.work_order_id
       OR OLD.author_user_id IS DISTINCT FROM NEW.author_user_id
       OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
      RAISE EXCEPTION 'Report core attributes (id, organization_id, work_order_id, author_user_id, created_at) are immutable' USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'finalized' THEN
      RAISE EXCEPTION 'Finalized work reports are immutable' USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'draft' AND NEW.status = 'finalized' THEN
      NEW.finalized_at := now();
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_invoice_child_immutability
CREATE OR REPLACE FUNCTION public.enforce_invoice_child_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
BEGIN
  IF current_setting('session_replication_role', true) = 'replica' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT status INTO v_status FROM public.invoices WHERE id = NEW.invoice_id;
    IF v_status IN ('accepted', 'paid', 'cancelled', 'superseded') THEN
      RAISE EXCEPTION 'Cannot add items to finalized/accepted document (status: %)', v_status;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT status INTO v_status FROM public.invoices WHERE id = OLD.invoice_id;
    IF v_status IN ('accepted', 'paid', 'cancelled', 'superseded') THEN
      RAISE EXCEPTION 'Cannot modify items of finalized/accepted document (status: %)', v_status;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT status INTO v_status FROM public.invoices WHERE id = OLD.invoice_id;
    IF v_status IN ('accepted', 'paid', 'cancelled', 'superseded') THEN
      RAISE EXCEPTION 'Cannot delete items from finalized/accepted document (status: %)', v_status;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_invoice_invariants
CREATE OR REPLACE FUNCTION public.enforce_invoice_invariants()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('session_replication_role', true) = 'replica' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Prevent hard delete on non-draft or accepted quotes / paid invoices
  IF TG_OP = 'DELETE' THEN
    IF OLD.status NOT IN ('draft') THEN
      RAISE EXCEPTION 'Cannot delete non-draft document (status: %)', OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  -- Protect accepted quote immutability
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
      RAISE EXCEPTION 'Cannot change status of an accepted quote';
    END IF;

    IF OLD.status = 'accepted' THEN
      IF OLD.total_ht != NEW.total_ht OR
         OLD.total_ttc != NEW.total_ttc OR
         OLD.tax_amount != NEW.tax_amount OR
         OLD.deposit_amount != NEW.deposit_amount OR
         OLD.deposit_rate IS DISTINCT FROM NEW.deposit_rate OR
         OLD.deposit_fixed_amount IS DISTINCT FROM NEW.deposit_fixed_amount OR
         OLD.deposit_mode IS DISTINCT FROM NEW.deposit_mode OR
         OLD.client_id != NEW.client_id OR
         OLD.organization_id != NEW.organization_id OR
         OLD.signature IS DISTINCT FROM NEW.signature THEN
        RAISE EXCEPTION 'Cannot modify financial or signature fields of an accepted quote';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_patient_message_update
CREATE OR REPLACE FUNCTION public.enforce_patient_message_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF OLD.patient_id IS NOT NULL THEN
    IF NEW.id <> OLD.id
       OR NEW.organization_id <> OLD.organization_id
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.sender_id <> OLD.sender_id
       OR NEW.receiver_id <> OLD.receiver_id
       OR NEW.request_id IS DISTINCT FROM OLD.request_id
       OR NEW.content <> OLD.content
       OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Structural mutation is not allowed on patient messages'
        USING ERRCODE = '23514';
    END IF;

    -- Read state machine: true -> false is forbidden
    IF OLD.is_read = true AND NEW.is_read = false THEN
      RAISE EXCEPTION 'Read state cannot transition from true to false on patient messages'
        USING ERRCODE = '23514';
    END IF;

    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: enforce_waitlist_status_transition
CREATE OR REPLACE FUNCTION public.enforce_waitlist_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'waiting' THEN
      RAISE EXCEPTION 'Waitlist entries must be inserted with status waiting'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.resolution_code IS NOT NULL OR NEW.resolved_at IS NOT NULL OR NEW.resolved_appointment_id IS NOT NULL THEN
      RAISE EXCEPTION 'New waitlist entries cannot contain resolution metadata'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If already resolved, reject any mutation
    IF OLD.status = 'resolved' THEN
      RAISE EXCEPTION 'Resolved waitlist entries are immutable'
        USING ERRCODE = '23514';
    END IF;

    -- waiting -> resolved
    IF OLD.status = 'waiting' AND NEW.status = 'resolved' THEN
      IF NEW.resolution_code IS NULL THEN
        RAISE EXCEPTION 'Resolution code is required when resolving waitlist entry'
          USING ERRCODE = '23514';
      END IF;
      IF NEW.resolution_code = 'booked' AND NEW.resolved_appointment_id IS NULL THEN
        RAISE EXCEPTION 'Resolved appointment ID is required for booked resolution'
          USING ERRCODE = '23514';
      END IF;
      IF NEW.resolution_code <> 'booked' AND NEW.resolved_appointment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Resolved appointment ID must be null for non-booked resolution'
          USING ERRCODE = '23514';
      END IF;
      NEW.resolved_at := now();
      RETURN NEW;
    END IF;

    -- waiting -> waiting (update preferences)
    IF OLD.status = 'waiting' AND NEW.status = 'waiting' THEN
      IF NEW.resolution_code IS NOT NULL OR NEW.resolved_at IS NOT NULL OR NEW.resolved_appointment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Active waiting entries cannot contain resolution metadata'
          USING ERRCODE = '23514';
      END IF;
      NEW.resolution_code := NULL;
      NEW.resolved_at := NULL;
      NEW.resolved_appointment_id := NULL;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid waitlist status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$
;

-- Reviewed canonical function: has_patient_practitioner_relationship
CREATE OR REPLACE FUNCTION public.has_patient_practitioner_relationship(p_organization_id text, p_patient_id text, p_practitioner_id text, p_require_active boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF p_require_active THEN
    RETURN EXISTS (
      SELECT 1 FROM public.care_episodes ce
      WHERE ce.organization_id = p_organization_id
        AND ce.patient_id = p_patient_id
        AND ce.practitioner_id = p_practitioner_id
        AND ce.status = 'active'
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM public.care_episodes ce
      WHERE ce.organization_id = p_organization_id
        AND ce.patient_id = p_patient_id
        AND ce.practitioner_id = p_practitioner_id
    );
  END IF;
END;
$function$
;

-- Reviewed canonical function: is_current_field_service_professional
CREATE OR REPLACE FUNCTION public.is_current_field_service_professional(p_organization_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF public.current_app_user_id() IS NULL OR p_organization_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.organizations o ON o.id = u.organization_id
    WHERE u.id = public.current_app_user_id()::text
      AND u.profile_type = 'professional'
      AND u.organization_id = p_organization_id
      AND o.sector IN ('field_services', 'artisan')
  );
END;
$function$
;

-- Reviewed canonical function: protect_account_lifecycle
CREATE OR REPLACE FUNCTION public.protect_account_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$ BEGIN
  IF current_user = 'monservice_runtime' AND NEW.account_closed_at IS DISTINCT FROM OLD.account_closed_at THEN
    RAISE EXCEPTION 'Account lifecycle is server owned' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$
;

-- Reviewed canonical function: record_field_service_work_order_status_history
CREATE OR REPLACE FUNCTION public.record_field_service_work_order_status_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.field_service_work_order_status_history (
      id,
      organization_id,
      work_order_id,
      from_status,
      to_status,
      changed_by_user_id,
      reason,
      created_at
    ) VALUES (
      gen_random_uuid()::text,
      NEW.organization_id,
      NEW.id,
      NULL,
      NEW.status,
      NEW.created_by_user_id,
      'Initial creation',
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.field_service_work_order_status_history (
        id,
        organization_id,
        work_order_id,
        from_status,
        to_status,
        changed_by_user_id,
        reason,
        created_at
      ) VALUES (
        gen_random_uuid()::text,
        NEW.organization_id,
        NEW.id,
        OLD.status,
        NEW.status,
        COALESCE(public.current_app_user_id()::text, NEW.created_by_user_id),
        CASE WHEN NEW.status = 'cancelled' THEN NEW.cancellation_notes ELSE NULL END,
        now()
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE TRIGGER appointment_waitlist_status_transition_guard BEFORE INSERT OR UPDATE ON public.appointment_waitlist_entries FOR EACH ROW EXECUTE FUNCTION enforce_waitlist_status_transition();
CREATE TRIGGER appointments_status_transition_guard BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION enforce_appointment_status_transition();
CREATE TRIGGER care_episodes_transition_trigger BEFORE INSERT OR UPDATE ON public.care_episodes FOR EACH ROW EXECUTE FUNCTION enforce_care_episode_transition();
CREATE TRIGGER clinical_documents_mutation_guard BEFORE UPDATE ON public.clinical_documents FOR EACH ROW EXECUTE FUNCTION enforce_clinical_document_mutation();
CREATE TRIGGER clinical_encounters_insert_trigger BEFORE INSERT ON public.clinical_encounters FOR EACH ROW EXECUTE FUNCTION enforce_clinical_encounter_insert();
CREATE TRIGGER clinical_form_responses_transition_guard BEFORE INSERT OR UPDATE ON public.clinical_form_responses FOR EACH ROW EXECUTE FUNCTION enforce_clinical_form_response_transition();
CREATE TRIGGER clinical_measurements_insert_guard BEFORE INSERT ON public.clinical_measurements FOR EACH ROW EXECUTE FUNCTION enforce_clinical_measurement_insert();
CREATE TRIGGER clinical_notes_transition_trigger BEFORE INSERT OR UPDATE ON public.clinical_notes FOR EACH ROW EXECUTE FUNCTION enforce_clinical_note_transition();
CREATE TRIGGER trg_field_service_site_immutability BEFORE UPDATE ON public.field_service_sites FOR EACH ROW EXECUTE FUNCTION enforce_field_service_site_immutability();
CREATE TRIGGER trg_field_service_assignment_invariants BEFORE INSERT OR UPDATE ON public.field_service_work_order_assignments FOR EACH ROW EXECUTE FUNCTION enforce_field_service_assignment_invariants();
CREATE TRIGGER trg_field_service_status_history_append_only BEFORE DELETE OR UPDATE ON public.field_service_work_order_status_history FOR EACH ROW EXECUTE FUNCTION enforce_field_service_status_history_append_only();
CREATE TRIGGER trg_field_service_work_order_status_history AFTER INSERT OR UPDATE OF status ON public.field_service_work_orders FOR EACH ROW EXECUTE FUNCTION record_field_service_work_order_status_history();
CREATE TRIGGER trg_field_service_work_order_transition BEFORE INSERT OR UPDATE ON public.field_service_work_orders FOR EACH ROW EXECUTE FUNCTION enforce_field_service_work_order_transition();
CREATE TRIGGER trg_field_service_work_report_transition BEFORE INSERT OR DELETE OR UPDATE ON public.field_service_work_reports FOR EACH ROW EXECUTE FUNCTION enforce_field_service_work_report_transition();
CREATE TRIGGER trg_enforce_invoice_lines_immutability BEFORE INSERT OR DELETE OR UPDATE ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION enforce_invoice_child_immutability();
CREATE TRIGGER trg_enforce_invoice_sections_immutability BEFORE INSERT OR DELETE OR UPDATE ON public.invoice_sections FOR EACH ROW EXECUTE FUNCTION enforce_invoice_child_immutability();
CREATE TRIGGER trg_enforce_invoice_invariants BEFORE DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION enforce_invoice_invariants();
CREATE TRIGGER messages_patient_mutation_guard BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION enforce_patient_message_update();
CREATE TRIGGER users_account_lifecycle_guard BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION protect_account_lifecycle();