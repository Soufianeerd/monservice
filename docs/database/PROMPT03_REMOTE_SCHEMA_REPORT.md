BEGIN
 table_schema |         table_name          
--------------+-----------------------------
 public       | appointments
 public       | audit_logs
 public       | availabilities
 public       | clients
 public       | consent_events
 public       | contacts
 public       | country_compliance_profiles
 public       | data_subject_requests
 public       | deals
 public       | invoice_lines
 public       | invoices
 public       | legal_entities
 public       | message_templates
 public       | messages
 public       | organizations
 public       | products
 public       | profiles
 public       | requests
 public       | services
 public       | stripe_events
 public       | tasks
 public       | users
(22 rows)

 table_schema |         table_name          |       column_name        |          data_type          |  udt_name   | is_nullable |    column_default    | numeric_precision | numeric_scale 
--------------+-----------------------------+--------------------------+-----------------------------+-------------+-------------+----------------------+-------------------+---------------
 public       | appointments                | id                       | uuid                        | uuid        | NO          | gen_random_uuid()    |                   |              
 public       | appointments                | provider_id              | uuid                        | uuid        | NO          |                      |                   |              
 public       | appointments                | client_name              | text                        | text        | NO          |                      |                   |              
 public       | appointments                | client_email             | text                        | text        | NO          |                      |                   |              
 public       | appointments                | client_phone             | text                        | text        | YES         | ''::text             |                   |              
 public       | appointments                | service_id               | uuid                        | uuid        | YES         |                      |                   |              
 public       | appointments                | date                     | date                        | date        | NO          |                      |                   |              
 public       | appointments                | start_time               | time without time zone      | time        | NO          |                      |                   |              
 public       | appointments                | end_time                 | time without time zone      | time        | NO          |                      |                   |              
 public       | appointments                | status                   | text                        | text        | YES         | 'pending'::text      |                   |              
 public       | appointments                | notes                    | text                        | text        | YES         | ''::text             |                   |              
 public       | appointments                | stripe_session_id        | text                        | text        | YES         |                      |                   |              
 public       | appointments                | created_at               | timestamp with time zone    | timestamptz | YES         | now()                |                   |              
 public       | audit_logs                  | id                       | text                        | text        | NO          |                      |                   |              
 public       | audit_logs                  | user_id                  | text                        | text        | YES         |                      |                   |              
 public       | audit_logs                  | organization_id          | text                        | text        | YES         |                      |                   |              
 public       | audit_logs                  | action                   | text                        | text        | NO          |                      |                   |              
 public       | audit_logs                  | entity_type              | text                        | text        | NO          |                      |                   |              
 public       | audit_logs                  | entity_id                | text                        | text        | NO          |                      |                   |              
 public       | audit_logs                  | old_values               | text                        | text        | YES         |                      |                   |              
 public       | audit_logs                  | new_values               | text                        | text        | YES         |                      |                   |              
 public       | audit_logs                  | ip                       | text                        | text        | YES         |                      |                   |              
 public       | audit_logs                  | user_agent               | text                        | text        | YES         |                      |                   |              
 public       | audit_logs                  | created_at               | timestamp without time zone | timestamp   | YES         | now()                |                   |              
 public       | availabilities              | id                       | uuid                        | uuid        | NO          | gen_random_uuid()    |                   |              
 public       | availabilities              | provider_id              | uuid                        | uuid        | NO          |                      |                   |              
 public       | availabilities              | day_of_week              | integer                     | int4        | NO          |                      |                32 |             0
 public       | availabilities              | start_time               | time without time zone      | time        | NO          |                      |                   |              
 public       | availabilities              | end_time                 | time without time zone      | time        | NO          |                      |                   |              
 public       | clients                     | id                       | text                        | text        | NO          |                      |                   |              
 public       | clients                     | organization_id          | text                        | text        | NO          |                      |                   |              
 public       | clients                     | name                     | text                        | text        | NO          |                      |                   |              
 public       | clients                     | email                    | text                        | text        | YES         |                      |                   |              
 public       | clients                     | phone                    | text                        | text        | YES         |                      |                   |              
 public       | clients                     | address                  | text                        | text        | YES         |                      |                   |              
 public       | clients                     | city                     | text                        | text        | YES         |                      |                   |              
 public       | clients                     | zip_code                 | text                        | text        | YES         |                      |                   |              
 public       | clients                     | country                  | text                        | text        | YES         |                      |                   |              
 public       | clients                     | website                  | text                        | text        | YES         |                      |                   |              
 public       | clients                     | industry                 | text                        | text        | YES         |                      |                   |              
 public       | clients                     | custom_industry          | text                        | text        | YES         |                      |                   |              
 public       | clients                     | contact_first_name       | text                        | text        | YES         |                      |                   |              
 public       | clients                     | contact_last_name        | text                        | text        | YES         |                      |                   |              
 public       | clients                     | contact_email            | text                        | text        | YES         |                      |                   |              
 public       | clients                     | contact_phone            | text                        | text        | YES         |                      |                   |              
 public       | clients                     | contact_position         | text                        | text        | YES         |                      |                   |              
 public       | clients                     | company                  | text                        | text        | YES         |                      |                   |              
 public       | clients                     | notes                    | text                        | text        | YES         |                      |                   |              
 public       | clients                     | created_at               | text                        | text        | NO          |                      |                   |              
 public       | clients                     | updated_at               | text                        | text        | NO          |                      |                   |              
 public       | clients                     | user_id                  | text                        | text        | YES         |                      |                   |              
 public       | clients                     | legal_entity_id          | text                        | text        | YES         |                      |                   |              
 public       | consent_events              | id                       | text                        | text        | NO          |                      |                   |              
 public       | consent_events              | user_id                  | text                        | text        | YES         |                      |                   |              
 public       | consent_events              | organization_id          | text                        | text        | YES         |                      |                   |              
 public       | consent_events              | consent_type             | text                        | text        | NO          |                      |                   |              
 public       | consent_events              | consent_value            | text                        | text        | NO          |                      |                   |              
 public       | consent_events              | legal_basis              | text                        | text        | YES         |                      |                   |              
 public       | consent_events              | source                   | text                        | text        | YES         |                      |                   |              
 public       | consent_events              | ip                       | text                        | text        | YES         |                      |                   |              
 public       | consent_events              | user_agent               | text                        | text        | YES         |                      |                   |              
 public       | consent_events              | policy_version           | text                        | text        | YES         |                      |                   |              
 public       | consent_events              | timestamp                | timestamp without time zone | timestamp   | YES         | now()                |                   |              
 public       | contacts                    | id                       | text                        | text        | NO          |                      |                   |              
 public       | contacts                    | organization_id          | text                        | text        | NO          |                      |                   |              
 public       | contacts                    | client_id                | text                        | text        | NO          |                      |                   |              
 public       | contacts                    | first_name               | text                        | text        | NO          |                      |                   |              
 public       | contacts                    | last_name                | text                        | text        | NO          |                      |                   |              
 public       | contacts                    | email                    | text                        | text        | NO          |                      |                   |              
 public       | contacts                    | phone                    | text                        | text        | NO          |                      |                   |              
 public       | contacts                    | position                 | text                        | text        | NO          |                      |                   |              
 public       | contacts                    | created_at               | text                        | text        | NO          |                      |                   |              
 public       | contacts                    | updated_at               | text                        | text        | NO          |                      |                   |              
 public       | country_compliance_profiles | id                       | text                        | text        | NO          |                      |                   |              
 public       | country_compliance_profiles | country                  | text                        | text        | NO          |                      |                   |              
 public       | country_compliance_profiles | version                  | text                        | text        | NO          |                      |                   |              
 public       | country_compliance_profiles | effective_from           | timestamp without time zone | timestamp   | NO          |                      |                   |              
 public       | country_compliance_profiles | vat_standard             | real                        | float4      | NO          |                      |                24 |              
 public       | country_compliance_profiles | vat_reduced              | real                        | float4      | YES         |                      |                24 |              
 public       | country_compliance_profiles | vat_reduced_2            | real                        | float4      | YES         |                      |                24 |              
 public       | country_compliance_profiles | vat_reduced_3            | real                        | float4      | YES         |                      |                24 |              
 public       | country_compliance_profiles | retention_years          | integer                     | int4        | NO          |                      |                32 |             0
 public       | country_compliance_profiles | einvoice_mandatory       | boolean                     | bool        | YES         | false                |                   |              
 public       | country_compliance_profiles | einvoice_format          | text                        | text        | YES         |                      |                   |              
 public       | country_compliance_profiles | einvoice_network         | text                        | text        | YES         |                      |                   |              
 public       | country_compliance_profiles | legal_mentions           | text                        | text        | YES         |                      |                   |              
 public       | country_compliance_profiles | marketing_rule           | text                        | text        | YES         |                      |                   |              
 public       | country_compliance_profiles | privacy_authority        | text                        | text        | YES         |                      |                   |              
 public       | country_compliance_profiles | dpo_threshold            | integer                     | int4        | YES         |                      |                32 |             0
 public       | country_compliance_profiles | archiving_requirements   | text                        | text        | YES         |                      |                   |              
 public       | country_compliance_profiles | created_at               | timestamp without time zone | timestamp   | YES         | now()                |                   |              
 public       | country_compliance_profiles | updated_at               | timestamp without time zone | timestamp   | YES         | now()                |                   |              
 public       | data_subject_requests       | id                       | text                        | text        | NO          |                      |                   |              
 public       | data_subject_requests       | user_id                  | text                        | text        | YES         |                      |                   |              
 public       | data_subject_requests       | organization_id          | text                        | text        | YES         |                      |                   |              
 public       | data_subject_requests       | request_type             | text                        | text        | NO          |                      |                   |              
 public       | data_subject_requests       | status                   | text                        | text        | NO          |                      |                   |              
 public       | data_subject_requests       | request_details          | text                        | text        | YES         |                      |                   |              
 public       | data_subject_requests       | response                 | text                        | text        | YES         |                      |                   |              
 public       | data_subject_requests       | deadline                 | timestamp without time zone | timestamp   | YES         |                      |                   |              
 public       | data_subject_requests       | received_at              | timestamp without time zone | timestamp   | YES         | now()                |                   |              
 public       | data_subject_requests       | completed_at             | timestamp without time zone | timestamp   | YES         |                      |                   |              
 public       | data_subject_requests       | processed_by             | text                        | text        | YES         |                      |                   |              
 public       | deals                       | id                       | text                        | text        | NO          |                      |                   |              
 public       | deals                       | organization_id          | text                        | text        | NO          |                      |                   |              
 public       | deals                       | client_id                | text                        | text        | NO          |                      |                   |              
 public       | deals                       | name                     | text                        | text        | NO          |                      |                   |              
 public       | deals                       | value                    | real                        | float4      | NO          |                      |                24 |              
 public       | deals                       | status                   | text                        | text        | NO          |                      |                   |              
 public       | deals                       | expected_close_date      | text                        | text        | NO          |                      |                   |              
 public       | deals                       | description              | text                        | text        | YES         |                      |                   |              
 public       | deals                       | signature                | text                        | text        | YES         |                      |                   |              
 public       | deals                       | signed_at                | text                        | text        | YES         |                      |                   |              
 public       | deals                       | signature_token          | text                        | text        | YES         |                      |                   |              
 public       | deals                       | created_at               | text                        | text        | NO          |                      |                   |              
 public       | deals                       | updated_at               | text                        | text        | NO          |                      |                   |              
 public       | invoice_lines               | id                       | text                        | text        | NO          |                      |                   |              
 public       | invoice_lines               | invoice_id               | text                        | text        | NO          |                      |                   |              
 public       | invoice_lines               | product_id               | text                        | text        | YES         |                      |                   |              
 public       | invoice_lines               | description              | text                        | text        | NO          |                      |                   |              
 public       | invoice_lines               | quantity                 | real                        | float4      | NO          |                      |                24 |              
 public       | invoice_lines               | unit_price               | real                        | float4      | NO          |                      |                24 |              
 public       | invoice_lines               | tax_rate                 | real                        | float4      | NO          |                      |                24 |              
 public       | invoice_lines               | total_ht                 | real                        | float4      | NO          |                      |                24 |              
 public       | invoice_lines               | total_ttc                | real                        | float4      | NO          |                      |                24 |              
 public       | invoices                    | id                       | text                        | text        | NO          |                      |                   |              
 public       | invoices                    | organization_id          | text                        | text        | NO          |                      |                   |              
 public       | invoices                    | client_id                | text                        | text        | NO          |                      |                   |              
 public       | invoices                    | type                     | text                        | text        | NO          |                      |                   |              
 public       | invoices                    | number                   | text                        | text        | NO          |                      |                   |              
 public       | invoices                    | date                     | text                        | text        | NO          |                      |                   |              
 public       | invoices                    | due_date                 | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | paid_at                  | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | payment_link             | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | stripe_payment_intent_id | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | payment_intent_id        | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | request_id               | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | professional_id          | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | message                  | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | status                   | text                        | text        | NO          |                      |                   |              
 public       | invoices                    | total_ht                 | real                        | float4      | NO          |                      |                24 |              
 public       | invoices                    | tax_amount               | real                        | float4      | NO          |                      |                24 |              
 public       | invoices                    | total_ttc                | real                        | float4      | NO          |                      |                24 |              
 public       | invoices                    | signature                | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | signature_date           | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | signature_ip             | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | signed_at                | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | created_at               | text                        | text        | NO          |                      |                   |              
 public       | invoices                    | updated_at               | text                        | text        | NO          |                      |                   |              
 public       | invoices                    | recipient_user_id        | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | legal_entity_id          | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | supplier_country         | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | supplier_vat_id          | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | customer_country         | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | customer_vat_id          | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | customer_type            | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | vat_treatment            | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | vat_rate                 | real                        | float4      | YES         |                      |                24 |              
 public       | invoices                    | vat_exemption_code       | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | reverse_charge           | boolean                     | bool        | YES         | false                |                   |              
 public       | invoices                    | einvoice_required        | boolean                     | bool        | YES         | false                |                   |              
 public       | invoices                    | einvoice_format          | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | einvoice_profile         | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | einvoice_network         | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | structured_invoice_hash  | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | structured_invoice_path  | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | pdf_hash                 | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | pdf_path                 | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | locked_at                | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | locked_by                | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | retention_until          | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | legal_rule_version       | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | delivery_status          | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | delivery_channel         | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | delivery_tracking_id     | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | delivery_response        | text                        | text        | YES         |                      |                   |              
 public       | invoices                    | delivery_attempts        | integer                     | int4        | YES         | 0                    |                32 |             0
 public       | invoices                    | delivery_sent_at         | timestamp without time zone | timestamp   | YES         |                      |                   |              
 public       | invoices                    | delivery_last_attempt_at | timestamp without time zone | timestamp   | YES         |                      |                   |              
 public       | legal_entities              | id                       | text                        | text        | NO          |                      |                   |              
 public       | legal_entities              | organization_id          | text                        | text        | NO          |                      |                   |              
 public       | legal_entities              | name                     | text                        | text        | NO          |                      |                   |              
 public       | legal_entities              | legal_form               | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | country                  | text                        | text        | NO          |                      |                   |              
 public       | legal_entities              | establishment_country    | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | registration_number      | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | vat_number               | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | vat_scheme               | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | address                  | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | city                     | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | postal_code              | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | phone                    | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | email                    | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | website                  | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | representative           | text                        | text        | YES         |                      |                   |              
 public       | legal_entities              | is_default               | boolean                     | bool        | YES         | false                |                   |              
 public       | legal_entities              | created_at               | timestamp without time zone | timestamp   | YES         | now()                |                   |              
 public       | legal_entities              | updated_at               | timestamp without time zone | timestamp   | YES         | now()                |                   |              
 public       | message_templates           | id                       | text                        | text        | NO          |                      |                   |              
 public       | message_templates           | name                     | text                        | text        | NO          |                      |                   |              
 public       | message_templates           | subject                  | text                        | text        | NO          |                      |                   |              
 public       | message_templates           | body                     | text                        | text        | NO          |                      |                   |              
 public       | message_templates           | type                     | text                        | text        | NO          |                      |                   |              
 public       | message_templates           | organization_id          | text                        | text        | NO          |                      |                   |              
 public       | message_templates           | created_at               | text                        | text        | NO          |                      |                   |              
 public       | message_templates           | updated_at               | text                        | text        | NO          |                      |                   |              
 public       | messages                    | id                       | text                        | text        | NO          |                      |                   |              
 public       | messages                    | sender_id                | text                        | text        | NO          |                      |                   |              
 public       | messages                    | receiver_id              | text                        | text        | NO          |                      |                   |              
 public       | messages                    | content                  | text                        | text        | NO          |                      |                   |              
 public       | messages                    | is_read                  | boolean                     | bool        | YES         | false                |                   |              
 public       | messages                    | request_id               | text                        | text        | YES         |                      |                   |              
 public       | messages                    | organization_id          | text                        | text        | NO          |                      |                   |              
 public       | messages                    | created_at               | text                        | text        | NO          |                      |                   |              
 public       | messages                    | updated_at               | text                        | text        | NO          |                      |                   |              
 public       | organizations               | id                       | text                        | text        | NO          |                      |                   |              
 public       | organizations               | name                     | text                        | text        | NO          |                      |                   |              
 public       | organizations               | slug                     | text                        | text        | YES         |                      |                   |              
 public       | organizations               | sector                   | text                        | text        | YES         |                      |                   |              
 public       | organizations               | profile_type             | text                        | text        | YES         | 'professional'::text |                   |              
 public       | organizations               | is_public                | boolean                     | bool        | YES         | false                |                   |              
 public       | organizations               | description              | text                        | text        | YES         |                      |                   |              
 public       | organizations               | logo                     | text                        | text        | YES         |                      |                   |              
 public       | organizations               | address                  | text                        | text        | YES         |                      |                   |              
 public       | organizations               | city                     | text                        | text        | YES         |                      |                   |              
 public       | organizations               | postal_code              | text                        | text        | YES         |                      |                   |              
 public       | organizations               | country                  | text                        | text        | YES         |                      |                   |              
 public       | organizations               | phone                    | text                        | text        | YES         |                      |                   |              
 public       | organizations               | legal_notice             | text                        | text        | YES         |                      |                   |              
 public       | organizations               | payment_terms            | text                        | text        | YES         |                      |                   |              
 public       | organizations               | bank_details             | text                        | text        | YES         |                      |                   |              
 public       | organizations               | created_at               | text                        | text        | NO          |                      |                   |              
 public       | organizations               | updated_at               | text                        | text        | NO          |                      |                   |              
 public       | organizations               | email                    | text                        | text        | YES         |                      |                   |              
 public       | organizations               | currency                 | text                        | text        | YES         | 'EUR'::text          |                   |              
 public       | organizations               | industry                 | text                        | text        | YES         |                      |                   |              
 public       | organizations               | stripe_account_id        | text                        | text        | YES         |                      |                   |              
 public       | organizations               | stripe_account_status    | text                        | text        | YES         |                      |                   |              
 public       | organizations               | secondary_skills         | text                        | text        | YES         |                      |                   |              
 public       | products                    | id                       | text                        | text        | NO          |                      |                   |              
 public       | products                    | organization_id          | text                        | text        | NO          |                      |                   |              
 public       | products                    | name                     | text                        | text        | NO          |                      |                   |              
 public       | products                    | description              | text                        | text        | YES         |                      |                   |              
 public       | products                    | unit_price               | real                        | float4      | NO          |                      |                24 |              
 public       | products                    | tax_rate                 | real                        | float4      | YES         | 20                   |                24 |              
 public       | products                    | type                     | text                        | text        | YES         | 'service'::text      |                   |              
 public       | products                    | created_at               | text                        | text        | NO          |                      |                   |              
 public       | products                    | updated_at               | text                        | text        | NO          |                      |                   |              
 public       | profiles                    | id                       | uuid                        | uuid        | NO          |                      |                   |              
 public       | profiles                    | username                 | text                        | text        | NO          |                      |                   |              
 public       | profiles                    | full_name                | text                        | text        | YES         | ''::text             |                   |              
 public       | profiles                    | specialty                | text                        | text        | YES         | ''::text             |                   |              
 public       | profiles                    | description              | text                        | text        | YES         | ''::text             |                   |              
 public       | profiles                    | city                     | text                        | text        | YES         | ''::text             |                   |              
 public       | profiles                    | role                     | text                        | text        | YES         | 'prestataire'::text  |                   |              
 public       | profiles                    | created_at               | timestamp with time zone    | timestamptz | YES         | now()                |                   |              
 public       | profiles                    | updated_at               | timestamp with time zone    | timestamptz | YES         | now()                |                   |              
 public       | requests                    | id                       | text                        | text        | NO          |                      |                   |              
 public       | requests                    | client_id                | text                        | text        | NO          |                      |                   |              
 public       | requests                    | title                    | text                        | text        | NO          |                      |                   |              
 public       | requests                    | description              | text                        | text        | NO          |                      |                   |              
 public       | requests                    | category                 | text                        | text        | NO          |                      |                   |              
 public       | requests                    | budget                   | text                        | text        | YES         |                      |                   |              
 public       | requests                    | deadline                 | text                        | text        | YES         |                      |                   |              
 public       | requests                    | status                   | text                        | text        | YES         | 'open'::text         |                   |              
 public       | requests                    | visibility               | text                        | text        | YES         | 'public'::text       |                   |              
 public       | requests                    | created_at               | text                        | text        | NO          |                      |                   |              
 public       | requests                    | updated_at               | text                        | text        | NO          |                      |                   |              
 public       | services                    | id                       | uuid                        | uuid        | NO          | gen_random_uuid()    |                   |              
 public       | services                    | provider_id              | uuid                        | uuid        | NO          |                      |                   |              
 public       | services                    | name                     | text                        | text        | NO          |                      |                   |              
 public       | services                    | description              | text                        | text        | YES         | ''::text             |                   |              
 public       | services                    | duration                 | integer                     | int4        | NO          |                      |                32 |             0
 public       | services                    | price                    | integer                     | int4        | NO          |                      |                32 |             0
 public       | services                    | is_active                | boolean                     | bool        | YES         | true                 |                   |              
 public       | services                    | created_at               | timestamp with time zone    | timestamptz | YES         | now()                |                   |              
 public       | stripe_events               | id                       | text                        | text        | NO          |                      |                   |              
 public       | stripe_events               | type                     | text                        | text        | NO          |                      |                   |              
 public       | stripe_events               | processed_at             | text                        | text        | NO          |                      |                   |              
 public       | tasks                       | id                       | text                        | text        | NO          |                      |                   |              
 public       | tasks                       | organization_id          | text                        | text        | NO          |                      |                   |              
 public       | tasks                       | entity_type              | text                        | text        | YES         |                      |                   |              
 public       | tasks                       | entity_id                | text                        | text        | YES         |                      |                   |              
 public       | tasks                       | title                    | text                        | text        | NO          |                      |                   |              
 public       | tasks                       | description              | text                        | text        | YES         |                      |                   |              
 public       | tasks                       | due_date                 | text                        | text        | YES         |                      |                   |              
 public       | tasks                       | status                   | text                        | text        | NO          |                      |                   |              
 public       | tasks                       | priority                 | text                        | text        | YES         | 'medium'::text       |                   |              
 public       | tasks                       | assigned_to              | text                        | text        | YES         |                      |                   |              
 public       | tasks                       | created_at               | text                        | text        | NO          |                      |                   |              
 public       | tasks                       | updated_at               | text                        | text        | NO          |                      |                   |              
 public       | users                       | id                       | text                        | text        | NO          |                      |                   |              
 public       | users                       | email                    | text                        | text        | NO          |                      |                   |              
 public       | users                       | password                 | text                        | text        | YES         |                      |                   |              
 public       | users                       | name                     | text                        | text        | YES         |                      |                   |              
 public       | users                       | profile_type             | text                        | text        | NO          |                      |                   |              
 public       | users                       | organization_id          | text                        | text        | YES         |                      |                   |              
 public       | users                       | onboarding_completed     | boolean                     | bool        | YES         | false                |                   |              
 public       | users                       | onboarding_step          | integer                     | int4        | YES         | 0                    |                32 |             0
 public       | users                       | subscription_tier        | text                        | text        | YES         | 'free'::text         |                   |              
 public       | users                       | subscription_status      | text                        | text        | YES         | 'inactive'::text     |                   |              
 public       | users                       | created_at               | text                        | text        | NO          |                      |                   |              
 public       | users                       | updated_at               | text                        | text        | NO          |                      |                   |              
 public       | users                       | stripe_customer_id       | text                        | text        | YES         |                      |                   |              
 public       | users                       | legal_entity_id          | text                        | text        | YES         |                      |                   |              
(305 rows)

 schemaname |          tablename          | rowsecurity 
------------+-----------------------------+-------------
 public     | appointments                | t
 public     | audit_logs                  | t
 public     | availabilities              | t
 public     | clients                     | t
 public     | consent_events              | t
 public     | contacts                    | t
 public     | country_compliance_profiles | t
 public     | data_subject_requests       | t
 public     | deals                       | t
 public     | invoice_lines               | t
 public     | invoices                    | t
 public     | legal_entities              | t
 public     | message_templates           | t
 public     | messages                    | t
 public     | organizations               | t
 public     | products                    | t
 public     | profiles                    | t
 public     | requests                    | t
 public     | services                    | t
 public     | stripe_events               | t
 public     | tasks                       | t
 public     | users                       | t
(22 rows)

 schemaname |       tablename       |                    policyname                    | permissive |  roles   |  cmd   |                  qual                  |         with_check         
------------+-----------------------+--------------------------------------------------+------------+----------+--------+----------------------------------------+----------------------------
 public     | appointments          | appointments_delete_provider                     | PERMISSIVE | {public} | DELETE | (auth.uid() = provider_id)             | 
 public     | appointments          | appointments_insert_anyone                       | PERMISSIVE | {public} | INSERT |                                        | true
 public     | appointments          | appointments_select_provider                     | PERMISSIVE | {public} | SELECT | (auth.uid() = provider_id)             | 
 public     | appointments          | appointments_update_provider                     | PERMISSIVE | {public} | UPDATE | (auth.uid() = provider_id)             | (auth.uid() = provider_id)
 public     | audit_logs            | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | audit_logs            | Users can access their own audit_logs            | PERMISSIVE | {public} | ALL    | (user_id = (auth.uid())::text)         | 
 public     | availabilities        | availabilities_delete_own                        | PERMISSIVE | {public} | DELETE | (auth.uid() = provider_id)             | 
 public     | availabilities        | availabilities_insert_own                        | PERMISSIVE | {public} | INSERT |                                        | (auth.uid() = provider_id)
 public     | availabilities        | availabilities_select_all                        | PERMISSIVE | {public} | SELECT | true                                   | 
 public     | availabilities        | availabilities_update_own                        | PERMISSIVE | {public} | UPDATE | (auth.uid() = provider_id)             | (auth.uid() = provider_id)
 public     | clients               | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | clients               | Users can access their own clients               | PERMISSIVE | {public} | ALL    | (user_id = (auth.uid())::text)         | 
 public     | consent_events        | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | consent_events        | Users can access their own consent_events        | PERMISSIVE | {public} | ALL    | (user_id = (auth.uid())::text)         | 
 public     | contacts              | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | data_subject_requests | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | data_subject_requests | Users can access their own data_subject_requests | PERMISSIVE | {public} | ALL    | (user_id = (auth.uid())::text)         | 
 public     | deals                 | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | invoices              | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | legal_entities        | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | message_templates     | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | messages              | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | products              | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | profiles              | Users can access their own profile               | PERMISSIVE | {public} | ALL    | ((id)::text = (auth.uid())::text)      | 
 public     | profiles              | profiles_delete_own                              | PERMISSIVE | {public} | DELETE | (auth.uid() = id)                      | 
 public     | profiles              | profiles_insert_own                              | PERMISSIVE | {public} | INSERT |                                        | (auth.uid() = id)
 public     | profiles              | profiles_select_all                              | PERMISSIVE | {public} | SELECT | true                                   | 
 public     | profiles              | profiles_update_own                              | PERMISSIVE | {public} | UPDATE | (auth.uid() = id)                      | (auth.uid() = id)
 public     | services              | services_delete_own                              | PERMISSIVE | {public} | DELETE | (auth.uid() = provider_id)             | 
 public     | services              | services_insert_own                              | PERMISSIVE | {public} | INSERT |                                        | (auth.uid() = provider_id)
 public     | services              | services_select_all                              | PERMISSIVE | {public} | SELECT | true                                   | 
 public     | services              | services_update_own                              | PERMISSIVE | {public} | UPDATE | (auth.uid() = provider_id)             | (auth.uid() = provider_id)
 public     | tasks                 | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | users                 | Users can access their organization's data       | PERMISSIVE | {public} | ALL    | (organization_id = (auth.uid())::text) | 
 public     | users                 | Users can access their own data                  | PERMISSIVE | {public} | ALL    | (id = (auth.uid())::text)              | 
(35 rows)

    grantee    | table_schema |         table_name          | privilege_type 
---------------+--------------+-----------------------------+----------------
 anon          | public       | appointments                | DELETE
 anon          | public       | appointments                | INSERT
 anon          | public       | appointments                | REFERENCES
 anon          | public       | appointments                | SELECT
 anon          | public       | appointments                | TRIGGER
 anon          | public       | appointments                | TRUNCATE
 anon          | public       | appointments                | UPDATE
 authenticated | public       | appointments                | DELETE
 authenticated | public       | appointments                | INSERT
 authenticated | public       | appointments                | REFERENCES
 authenticated | public       | appointments                | SELECT
 authenticated | public       | appointments                | TRIGGER
 authenticated | public       | appointments                | TRUNCATE
 authenticated | public       | appointments                | UPDATE
 service_role  | public       | appointments                | DELETE
 service_role  | public       | appointments                | INSERT
 service_role  | public       | appointments                | REFERENCES
 service_role  | public       | appointments                | SELECT
 service_role  | public       | appointments                | TRIGGER
 service_role  | public       | appointments                | TRUNCATE
 service_role  | public       | appointments                | UPDATE
 anon          | public       | audit_logs                  | DELETE
 anon          | public       | audit_logs                  | INSERT
 anon          | public       | audit_logs                  | REFERENCES
 anon          | public       | audit_logs                  | SELECT
 anon          | public       | audit_logs                  | TRIGGER
 anon          | public       | audit_logs                  | TRUNCATE
 anon          | public       | audit_logs                  | UPDATE
 authenticated | public       | audit_logs                  | DELETE
 authenticated | public       | audit_logs                  | INSERT
 authenticated | public       | audit_logs                  | REFERENCES
 authenticated | public       | audit_logs                  | SELECT
 authenticated | public       | audit_logs                  | TRIGGER
 authenticated | public       | audit_logs                  | TRUNCATE
 authenticated | public       | audit_logs                  | UPDATE
 service_role  | public       | audit_logs                  | DELETE
 service_role  | public       | audit_logs                  | INSERT
 service_role  | public       | audit_logs                  | REFERENCES
 service_role  | public       | audit_logs                  | SELECT
 service_role  | public       | audit_logs                  | TRIGGER
 service_role  | public       | audit_logs                  | TRUNCATE
 service_role  | public       | audit_logs                  | UPDATE
 anon          | public       | availabilities              | DELETE
 anon          | public       | availabilities              | INSERT
 anon          | public       | availabilities              | REFERENCES
 anon          | public       | availabilities              | SELECT
 anon          | public       | availabilities              | TRIGGER
 anon          | public       | availabilities              | TRUNCATE
 anon          | public       | availabilities              | UPDATE
 authenticated | public       | availabilities              | DELETE
 authenticated | public       | availabilities              | INSERT
 authenticated | public       | availabilities              | REFERENCES
 authenticated | public       | availabilities              | SELECT
 authenticated | public       | availabilities              | TRIGGER
 authenticated | public       | availabilities              | TRUNCATE
 authenticated | public       | availabilities              | UPDATE
 service_role  | public       | availabilities              | DELETE
 service_role  | public       | availabilities              | INSERT
 service_role  | public       | availabilities              | REFERENCES
 service_role  | public       | availabilities              | SELECT
 service_role  | public       | availabilities              | TRIGGER
 service_role  | public       | availabilities              | TRUNCATE
 service_role  | public       | availabilities              | UPDATE
 anon          | public       | clients                     | DELETE
 anon          | public       | clients                     | INSERT
 anon          | public       | clients                     | REFERENCES
 anon          | public       | clients                     | SELECT
 anon          | public       | clients                     | TRIGGER
 anon          | public       | clients                     | TRUNCATE
 anon          | public       | clients                     | UPDATE
 authenticated | public       | clients                     | DELETE
 authenticated | public       | clients                     | INSERT
 authenticated | public       | clients                     | REFERENCES
 authenticated | public       | clients                     | SELECT
 authenticated | public       | clients                     | TRIGGER
 authenticated | public       | clients                     | TRUNCATE
 authenticated | public       | clients                     | UPDATE
 service_role  | public       | clients                     | DELETE
 service_role  | public       | clients                     | INSERT
 service_role  | public       | clients                     | REFERENCES
 service_role  | public       | clients                     | SELECT
 service_role  | public       | clients                     | TRIGGER
 service_role  | public       | clients                     | TRUNCATE
 service_role  | public       | clients                     | UPDATE
 anon          | public       | consent_events              | DELETE
 anon          | public       | consent_events              | INSERT
 anon          | public       | consent_events              | REFERENCES
 anon          | public       | consent_events              | SELECT
 anon          | public       | consent_events              | TRIGGER
 anon          | public       | consent_events              | TRUNCATE
 anon          | public       | consent_events              | UPDATE
 authenticated | public       | consent_events              | DELETE
 authenticated | public       | consent_events              | INSERT
 authenticated | public       | consent_events              | REFERENCES
 authenticated | public       | consent_events              | SELECT
 authenticated | public       | consent_events              | TRIGGER
 authenticated | public       | consent_events              | TRUNCATE
 authenticated | public       | consent_events              | UPDATE
 service_role  | public       | consent_events              | DELETE
 service_role  | public       | consent_events              | INSERT
 service_role  | public       | consent_events              | REFERENCES
 service_role  | public       | consent_events              | SELECT
 service_role  | public       | consent_events              | TRIGGER
 service_role  | public       | consent_events              | TRUNCATE
 service_role  | public       | consent_events              | UPDATE
 anon          | public       | contacts                    | DELETE
 anon          | public       | contacts                    | INSERT
 anon          | public       | contacts                    | REFERENCES
 anon          | public       | contacts                    | SELECT
 anon          | public       | contacts                    | TRIGGER
 anon          | public       | contacts                    | TRUNCATE
 anon          | public       | contacts                    | UPDATE
 authenticated | public       | contacts                    | DELETE
 authenticated | public       | contacts                    | INSERT
 authenticated | public       | contacts                    | REFERENCES
 authenticated | public       | contacts                    | SELECT
 authenticated | public       | contacts                    | TRIGGER
 authenticated | public       | contacts                    | TRUNCATE
 authenticated | public       | contacts                    | UPDATE
 service_role  | public       | contacts                    | DELETE
 service_role  | public       | contacts                    | INSERT
 service_role  | public       | contacts                    | REFERENCES
 service_role  | public       | contacts                    | SELECT
 service_role  | public       | contacts                    | TRIGGER
 service_role  | public       | contacts                    | TRUNCATE
 service_role  | public       | contacts                    | UPDATE
 anon          | public       | country_compliance_profiles | DELETE
 anon          | public       | country_compliance_profiles | INSERT
 anon          | public       | country_compliance_profiles | REFERENCES
 anon          | public       | country_compliance_profiles | SELECT
 anon          | public       | country_compliance_profiles | TRIGGER
 anon          | public       | country_compliance_profiles | TRUNCATE
 anon          | public       | country_compliance_profiles | UPDATE
 authenticated | public       | country_compliance_profiles | DELETE
 authenticated | public       | country_compliance_profiles | INSERT
 authenticated | public       | country_compliance_profiles | REFERENCES
 authenticated | public       | country_compliance_profiles | SELECT
 authenticated | public       | country_compliance_profiles | TRIGGER
 authenticated | public       | country_compliance_profiles | TRUNCATE
 authenticated | public       | country_compliance_profiles | UPDATE
 service_role  | public       | country_compliance_profiles | DELETE
 service_role  | public       | country_compliance_profiles | INSERT
 service_role  | public       | country_compliance_profiles | REFERENCES
 service_role  | public       | country_compliance_profiles | SELECT
 service_role  | public       | country_compliance_profiles | TRIGGER
 service_role  | public       | country_compliance_profiles | TRUNCATE
 service_role  | public       | country_compliance_profiles | UPDATE
 anon          | public       | data_subject_requests       | DELETE
 anon          | public       | data_subject_requests       | INSERT
 anon          | public       | data_subject_requests       | REFERENCES
 anon          | public       | data_subject_requests       | SELECT
 anon          | public       | data_subject_requests       | TRIGGER
 anon          | public       | data_subject_requests       | TRUNCATE
 anon          | public       | data_subject_requests       | UPDATE
 authenticated | public       | data_subject_requests       | DELETE
 authenticated | public       | data_subject_requests       | INSERT
 authenticated | public       | data_subject_requests       | REFERENCES
 authenticated | public       | data_subject_requests       | SELECT
 authenticated | public       | data_subject_requests       | TRIGGER
 authenticated | public       | data_subject_requests       | TRUNCATE
 authenticated | public       | data_subject_requests       | UPDATE
 service_role  | public       | data_subject_requests       | DELETE
 service_role  | public       | data_subject_requests       | INSERT
 service_role  | public       | data_subject_requests       | REFERENCES
 service_role  | public       | data_subject_requests       | SELECT
 service_role  | public       | data_subject_requests       | TRIGGER
 service_role  | public       | data_subject_requests       | TRUNCATE
 service_role  | public       | data_subject_requests       | UPDATE
 anon          | public       | deals                       | DELETE
 anon          | public       | deals                       | INSERT
 anon          | public       | deals                       | REFERENCES
 anon          | public       | deals                       | SELECT
 anon          | public       | deals                       | TRIGGER
 anon          | public       | deals                       | TRUNCATE
 anon          | public       | deals                       | UPDATE
 authenticated | public       | deals                       | DELETE
 authenticated | public       | deals                       | INSERT
 authenticated | public       | deals                       | REFERENCES
 authenticated | public       | deals                       | SELECT
 authenticated | public       | deals                       | TRIGGER
 authenticated | public       | deals                       | TRUNCATE
 authenticated | public       | deals                       | UPDATE
 service_role  | public       | deals                       | DELETE
 service_role  | public       | deals                       | INSERT
 service_role  | public       | deals                       | REFERENCES
 service_role  | public       | deals                       | SELECT
 service_role  | public       | deals                       | TRIGGER
 service_role  | public       | deals                       | TRUNCATE
 service_role  | public       | deals                       | UPDATE
 anon          | public       | invoice_lines               | DELETE
 anon          | public       | invoice_lines               | INSERT
 anon          | public       | invoice_lines               | REFERENCES
 anon          | public       | invoice_lines               | SELECT
 anon          | public       | invoice_lines               | TRIGGER
 anon          | public       | invoice_lines               | TRUNCATE
 anon          | public       | invoice_lines               | UPDATE
 authenticated | public       | invoice_lines               | DELETE
 authenticated | public       | invoice_lines               | INSERT
 authenticated | public       | invoice_lines               | REFERENCES
 authenticated | public       | invoice_lines               | SELECT
 authenticated | public       | invoice_lines               | TRIGGER
 authenticated | public       | invoice_lines               | TRUNCATE
 authenticated | public       | invoice_lines               | UPDATE
 service_role  | public       | invoice_lines               | DELETE
 service_role  | public       | invoice_lines               | INSERT
 service_role  | public       | invoice_lines               | REFERENCES
 service_role  | public       | invoice_lines               | SELECT
 service_role  | public       | invoice_lines               | TRIGGER
 service_role  | public       | invoice_lines               | TRUNCATE
 service_role  | public       | invoice_lines               | UPDATE
 anon          | public       | invoices                    | DELETE
 anon          | public       | invoices                    | INSERT
 anon          | public       | invoices                    | REFERENCES
 anon          | public       | invoices                    | SELECT
 anon          | public       | invoices                    | TRIGGER
 anon          | public       | invoices                    | TRUNCATE
 anon          | public       | invoices                    | UPDATE
 authenticated | public       | invoices                    | DELETE
 authenticated | public       | invoices                    | INSERT
 authenticated | public       | invoices                    | REFERENCES
 authenticated | public       | invoices                    | SELECT
 authenticated | public       | invoices                    | TRIGGER
 authenticated | public       | invoices                    | TRUNCATE
 authenticated | public       | invoices                    | UPDATE
 service_role  | public       | invoices                    | DELETE
 service_role  | public       | invoices                    | INSERT
 service_role  | public       | invoices                    | REFERENCES
 service_role  | public       | invoices                    | SELECT
 service_role  | public       | invoices                    | TRIGGER
 service_role  | public       | invoices                    | TRUNCATE
 service_role  | public       | invoices                    | UPDATE
 anon          | public       | legal_entities              | DELETE
 anon          | public       | legal_entities              | INSERT
 anon          | public       | legal_entities              | REFERENCES
 anon          | public       | legal_entities              | SELECT
 anon          | public       | legal_entities              | TRIGGER
 anon          | public       | legal_entities              | TRUNCATE
 anon          | public       | legal_entities              | UPDATE
 authenticated | public       | legal_entities              | DELETE
 authenticated | public       | legal_entities              | INSERT
 authenticated | public       | legal_entities              | REFERENCES
 authenticated | public       | legal_entities              | SELECT
 authenticated | public       | legal_entities              | TRIGGER
 authenticated | public       | legal_entities              | TRUNCATE
 authenticated | public       | legal_entities              | UPDATE
 service_role  | public       | legal_entities              | DELETE
 service_role  | public       | legal_entities              | INSERT
 service_role  | public       | legal_entities              | REFERENCES
 service_role  | public       | legal_entities              | SELECT
 service_role  | public       | legal_entities              | TRIGGER
 service_role  | public       | legal_entities              | TRUNCATE
 service_role  | public       | legal_entities              | UPDATE
 anon          | public       | message_templates           | DELETE
 anon          | public       | message_templates           | INSERT
 anon          | public       | message_templates           | REFERENCES
 anon          | public       | message_templates           | SELECT
 anon          | public       | message_templates           | TRIGGER
 anon          | public       | message_templates           | TRUNCATE
 anon          | public       | message_templates           | UPDATE
 authenticated | public       | message_templates           | DELETE
 authenticated | public       | message_templates           | INSERT
 authenticated | public       | message_templates           | REFERENCES
 authenticated | public       | message_templates           | SELECT
 authenticated | public       | message_templates           | TRIGGER
 authenticated | public       | message_templates           | TRUNCATE
 authenticated | public       | message_templates           | UPDATE
 service_role  | public       | message_templates           | DELETE
 service_role  | public       | message_templates           | INSERT
 service_role  | public       | message_templates           | REFERENCES
 service_role  | public       | message_templates           | SELECT
 service_role  | public       | message_templates           | TRIGGER
 service_role  | public       | message_templates           | TRUNCATE
 service_role  | public       | message_templates           | UPDATE
 anon          | public       | messages                    | DELETE
 anon          | public       | messages                    | INSERT
 anon          | public       | messages                    | REFERENCES
 anon          | public       | messages                    | SELECT
 anon          | public       | messages                    | TRIGGER
 anon          | public       | messages                    | TRUNCATE
 anon          | public       | messages                    | UPDATE
 authenticated | public       | messages                    | DELETE
 authenticated | public       | messages                    | INSERT
 authenticated | public       | messages                    | REFERENCES
 authenticated | public       | messages                    | SELECT
 authenticated | public       | messages                    | TRIGGER
 authenticated | public       | messages                    | TRUNCATE
 authenticated | public       | messages                    | UPDATE
 service_role  | public       | messages                    | DELETE
 service_role  | public       | messages                    | INSERT
 service_role  | public       | messages                    | REFERENCES
 service_role  | public       | messages                    | SELECT
 service_role  | public       | messages                    | TRIGGER
 service_role  | public       | messages                    | TRUNCATE
 service_role  | public       | messages                    | UPDATE
 anon          | public       | organizations               | DELETE
 anon          | public       | organizations               | INSERT
 anon          | public       | organizations               | REFERENCES
 anon          | public       | organizations               | SELECT
 anon          | public       | organizations               | TRIGGER
 anon          | public       | organizations               | TRUNCATE
 anon          | public       | organizations               | UPDATE
 authenticated | public       | organizations               | DELETE
 authenticated | public       | organizations               | INSERT
 authenticated | public       | organizations               | REFERENCES
 authenticated | public       | organizations               | SELECT
 authenticated | public       | organizations               | TRIGGER
 authenticated | public       | organizations               | TRUNCATE
 authenticated | public       | organizations               | UPDATE
 service_role  | public       | organizations               | DELETE
 service_role  | public       | organizations               | INSERT
 service_role  | public       | organizations               | REFERENCES
 service_role  | public       | organizations               | SELECT
 service_role  | public       | organizations               | TRIGGER
 service_role  | public       | organizations               | TRUNCATE
 service_role  | public       | organizations               | UPDATE
 anon          | public       | products                    | DELETE
 anon          | public       | products                    | INSERT
 anon          | public       | products                    | REFERENCES
 anon          | public       | products                    | SELECT
 anon          | public       | products                    | TRIGGER
 anon          | public       | products                    | TRUNCATE
 anon          | public       | products                    | UPDATE
 authenticated | public       | products                    | DELETE
 authenticated | public       | products                    | INSERT
 authenticated | public       | products                    | REFERENCES
 authenticated | public       | products                    | SELECT
 authenticated | public       | products                    | TRIGGER
 authenticated | public       | products                    | TRUNCATE
 authenticated | public       | products                    | UPDATE
 service_role  | public       | products                    | DELETE
 service_role  | public       | products                    | INSERT
 service_role  | public       | products                    | REFERENCES
 service_role  | public       | products                    | SELECT
 service_role  | public       | products                    | TRIGGER
 service_role  | public       | products                    | TRUNCATE
 service_role  | public       | products                    | UPDATE
 anon          | public       | profiles                    | DELETE
 anon          | public       | profiles                    | INSERT
 anon          | public       | profiles                    | REFERENCES
 anon          | public       | profiles                    | SELECT
 anon          | public       | profiles                    | TRIGGER
 anon          | public       | profiles                    | TRUNCATE
 anon          | public       | profiles                    | UPDATE
 authenticated | public       | profiles                    | DELETE
 authenticated | public       | profiles                    | INSERT
 authenticated | public       | profiles                    | REFERENCES
 authenticated | public       | profiles                    | SELECT
 authenticated | public       | profiles                    | TRIGGER
 authenticated | public       | profiles                    | TRUNCATE
 authenticated | public       | profiles                    | UPDATE
 service_role  | public       | profiles                    | DELETE
 service_role  | public       | profiles                    | INSERT
 service_role  | public       | profiles                    | REFERENCES
 service_role  | public       | profiles                    | SELECT
 service_role  | public       | profiles                    | TRIGGER
 service_role  | public       | profiles                    | TRUNCATE
 service_role  | public       | profiles                    | UPDATE
 anon          | public       | requests                    | DELETE
 anon          | public       | requests                    | INSERT
 anon          | public       | requests                    | REFERENCES
 anon          | public       | requests                    | SELECT
 anon          | public       | requests                    | TRIGGER
 anon          | public       | requests                    | TRUNCATE
 anon          | public       | requests                    | UPDATE
 authenticated | public       | requests                    | DELETE
 authenticated | public       | requests                    | INSERT
 authenticated | public       | requests                    | REFERENCES
 authenticated | public       | requests                    | SELECT
 authenticated | public       | requests                    | TRIGGER
 authenticated | public       | requests                    | TRUNCATE
 authenticated | public       | requests                    | UPDATE
 service_role  | public       | requests                    | DELETE
 service_role  | public       | requests                    | INSERT
 service_role  | public       | requests                    | REFERENCES
 service_role  | public       | requests                    | SELECT
 service_role  | public       | requests                    | TRIGGER
 service_role  | public       | requests                    | TRUNCATE
 service_role  | public       | requests                    | UPDATE
 anon          | public       | services                    | DELETE
 anon          | public       | services                    | INSERT
 anon          | public       | services                    | REFERENCES
 anon          | public       | services                    | SELECT
 anon          | public       | services                    | TRIGGER
 anon          | public       | services                    | TRUNCATE
 anon          | public       | services                    | UPDATE
 authenticated | public       | services                    | DELETE
 authenticated | public       | services                    | INSERT
 authenticated | public       | services                    | REFERENCES
 authenticated | public       | services                    | SELECT
 authenticated | public       | services                    | TRIGGER
 authenticated | public       | services                    | TRUNCATE
 authenticated | public       | services                    | UPDATE
 service_role  | public       | services                    | DELETE
 service_role  | public       | services                    | INSERT
 service_role  | public       | services                    | REFERENCES
 service_role  | public       | services                    | SELECT
 service_role  | public       | services                    | TRIGGER
 service_role  | public       | services                    | TRUNCATE
 service_role  | public       | services                    | UPDATE
 anon          | public       | stripe_events               | DELETE
 anon          | public       | stripe_events               | INSERT
 anon          | public       | stripe_events               | REFERENCES
 anon          | public       | stripe_events               | SELECT
 anon          | public       | stripe_events               | TRIGGER
 anon          | public       | stripe_events               | TRUNCATE
 anon          | public       | stripe_events               | UPDATE
 authenticated | public       | stripe_events               | DELETE
 authenticated | public       | stripe_events               | INSERT
 authenticated | public       | stripe_events               | REFERENCES
 authenticated | public       | stripe_events               | SELECT
 authenticated | public       | stripe_events               | TRIGGER
 authenticated | public       | stripe_events               | TRUNCATE
 authenticated | public       | stripe_events               | UPDATE
 service_role  | public       | stripe_events               | DELETE
 service_role  | public       | stripe_events               | INSERT
 service_role  | public       | stripe_events               | REFERENCES
 service_role  | public       | stripe_events               | SELECT
 service_role  | public       | stripe_events               | TRIGGER
 service_role  | public       | stripe_events               | TRUNCATE
 service_role  | public       | stripe_events               | UPDATE
 anon          | public       | tasks                       | DELETE
 anon          | public       | tasks                       | INSERT
 anon          | public       | tasks                       | REFERENCES
 anon          | public       | tasks                       | SELECT
 anon          | public       | tasks                       | TRIGGER
 anon          | public       | tasks                       | TRUNCATE
 anon          | public       | tasks                       | UPDATE
 authenticated | public       | tasks                       | DELETE
 authenticated | public       | tasks                       | INSERT
 authenticated | public       | tasks                       | REFERENCES
 authenticated | public       | tasks                       | SELECT
 authenticated | public       | tasks                       | TRIGGER
 authenticated | public       | tasks                       | TRUNCATE
 authenticated | public       | tasks                       | UPDATE
 service_role  | public       | tasks                       | DELETE
 service_role  | public       | tasks                       | INSERT
 service_role  | public       | tasks                       | REFERENCES
 service_role  | public       | tasks                       | SELECT
 service_role  | public       | tasks                       | TRIGGER
 service_role  | public       | tasks                       | TRUNCATE
 service_role  | public       | tasks                       | UPDATE
 anon          | public       | users                       | DELETE
 anon          | public       | users                       | INSERT
 anon          | public       | users                       | REFERENCES
 anon          | public       | users                       | SELECT
 anon          | public       | users                       | TRIGGER
 anon          | public       | users                       | TRUNCATE
 anon          | public       | users                       | UPDATE
 authenticated | public       | users                       | DELETE
 authenticated | public       | users                       | INSERT
 authenticated | public       | users                       | REFERENCES
 authenticated | public       | users                       | SELECT
 authenticated | public       | users                       | TRIGGER
 authenticated | public       | users                       | TRUNCATE
 authenticated | public       | users                       | UPDATE
 service_role  | public       | users                       | DELETE
 service_role  | public       | users                       | INSERT
 service_role  | public       | users                       | REFERENCES
 service_role  | public       | users                       | SELECT
 service_role  | public       | users                       | TRIGGER
 service_role  | public       | users                       | TRUNCATE
 service_role  | public       | users                       | UPDATE
(462 rows)

  function_name  | result_type | argument_types 
-----------------+-------------+----------------
 handle_new_user | trigger     | 
(1 row)

 count 
-------
     8
(1 row)

 count 
-------
     4
(1 row)

 count 
-------
     1
(1 row)

 count 
-------
     2
(1 row)

 invoices | issued 
----------+--------
        2 |      2
(1 row)

ROLLBACK
