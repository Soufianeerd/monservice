-- Scheduled delivery needs contact and appointment logistics, never the full
-- patient identity/clinical registry or unrelated financial/customer fields.
REVOKE SELECT ON public.organizations,public.invoices,public.clients,public.appointments,public.appointment_types,public.practice_locations,public.practice_rooms,public.practice_practitioners,public.patient_profiles,public.patient_representatives,public.patient_representative_links FROM monservice_reminders;
GRANT SELECT(id,name,email) ON public.organizations TO monservice_reminders;
GRANT SELECT(id,number,due_date,total_ttc,organization_id,type,status) ON public.invoices TO monservice_reminders;
GRANT SELECT(id,name,email) ON public.clients TO monservice_reminders;
GRANT SELECT(id,organization_id,starts_at,timezone,status,patient_id,appointment_type_id,practitioner_id,location_id,room_id) ON public.appointments TO monservice_reminders;
GRANT SELECT(id,organization_id,name) ON public.appointment_types TO monservice_reminders;
GRANT SELECT(id,organization_id,name,address,city) ON public.practice_locations TO monservice_reminders;
GRANT SELECT(id,organization_id,name) ON public.practice_rooms TO monservice_reminders;
GRANT SELECT(id,organization_id,display_name) ON public.practice_practitioners TO monservice_reminders;
GRANT SELECT(id,organization_id,email,used_first_name,first_birth_name,used_name,birth_name) ON public.patient_profiles TO monservice_reminders;
GRANT SELECT(id,organization_id,email,first_name,last_name,is_active) ON public.patient_representatives TO monservice_reminders;
GRANT SELECT(patient_id,organization_id,representative_id,is_active) ON public.patient_representative_links TO monservice_reminders;
