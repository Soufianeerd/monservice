BEGIN READ ONLY;
SELECT * FROM drizzle.__drizzle_migrations ORDER BY id;
ROLLBACK;
