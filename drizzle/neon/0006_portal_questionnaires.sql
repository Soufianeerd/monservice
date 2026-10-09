CREATE FUNCTION public.can_read_current_questionnaire_template(p_template text,p_org text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT EXISTS(SELECT 1 FROM public.patient_questionnaire_assignments q WHERE q.template_id=p_template AND q.organization_id=p_org AND q.status IN ('assigned','submitted') AND public.has_current_portal_access(q.organization_id,q.patient_id)) $$;
REVOKE ALL ON FUNCTION public.can_read_current_questionnaire_template(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_current_questionnaire_template(text,text) TO monservice_runtime;
CREATE POLICY portal_questionnaire_template_read ON public.clinical_form_templates FOR SELECT TO monservice_runtime USING(public.can_read_current_questionnaire_template(id,organization_id));

CREATE FUNCTION public.write_current_questionnaire(p_assignment_id text,p_answers jsonb,p_submit boolean)
RETURNS SETOF public.patient_questionnaire_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ DECLARE assignment public.patient_questionnaire_assignments; template public.clinical_form_templates; response_id text; field jsonb;
BEGIN
  SELECT * INTO assignment FROM public.patient_questionnaire_assignments WHERE id=p_assignment_id FOR UPDATE;
  IF NOT FOUND OR NOT public.has_current_portal_access(assignment.organization_id,assignment.patient_id) THEN RAISE EXCEPTION 'Portal assignment authority denied' USING ERRCODE='42501'; END IF;
  IF assignment.status='submitted' AND p_submit THEN RETURN NEXT assignment; RETURN; END IF;
  IF assignment.status<>'assigned' OR jsonb_typeof(p_answers)<>'object' THEN RAISE EXCEPTION 'Questionnaire unavailable' USING ERRCODE='42501'; END IF;
  SELECT * INTO template FROM public.clinical_form_templates WHERE id=assignment.template_id AND organization_id=assignment.organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501'; END IF;
  IF p_submit THEN
    FOR field IN SELECT value FROM jsonb_array_elements(coalesce(template.schema_json->'fields','[]'::jsonb)) LOOP
      IF coalesce((field->>'required')::boolean,false) AND (p_answers->(field->>'id') IS NULL OR p_answers->(field->>'id')='null'::jsonb OR p_answers->>(field->>'id')='') THEN RAISE EXCEPTION 'Required questionnaire answer missing'; END IF;
    END LOOP;
    response_id:=gen_random_uuid()::text;
    INSERT INTO public.clinical_form_responses(id,organization_id,patient_id,practitioner_id,template_id,care_episode_id,encounter_id,status,answers_json,created_at,updated_at)
    VALUES(response_id,assignment.organization_id,assignment.patient_id,assignment.practitioner_id,assignment.template_id,assignment.care_episode_id,NULL,'draft',p_answers,now(),now());
    UPDATE public.patient_questionnaire_assignments SET status='submitted',answers_json=p_answers,submitted_at=now(),clinical_response_id=response_id,updated_at=now() WHERE id=p_assignment_id RETURNING * INTO assignment;
  ELSE
    UPDATE public.patient_questionnaire_assignments SET answers_json=p_answers,updated_at=now() WHERE id=p_assignment_id RETURNING * INTO assignment;
  END IF;
  RETURN NEXT assignment;
END $$;
REVOKE ALL ON FUNCTION public.write_current_questionnaire(text,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_current_questionnaire(text,jsonb,boolean) TO monservice_runtime;
