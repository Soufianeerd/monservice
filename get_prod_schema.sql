BEGIN READ ONLY;

-- Tables
SELECT
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema IN ('public')
  AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;

-- Columns
SELECT
    table_schema,
    table_name,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- RLS Tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- RLS Policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Grants
SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon','authenticated','service_role')
ORDER BY table_name, grantee, privilege_type;

-- Functions and triggers
SELECT 
    p.proname AS function_name,
    pg_get_function_result(p.oid) AS result_type,
    pg_get_function_arguments(p.oid) AS argument_types
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

SELECT count(*) FROM public.users;
SELECT count(*) FROM public.organizations;
SELECT count(*) FROM public.clients;
SELECT count(*) FROM public.invoices;

SELECT
    count(*) AS invoices,
    count(*) FILTER (WHERE status <> 'draft') AS issued
FROM public.invoices;

ROLLBACK;
