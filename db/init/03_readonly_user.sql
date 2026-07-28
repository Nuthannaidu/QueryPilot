-- SAFETY: create a read-only role the app connects as.
-- Even if the LLM generates a destructive query and it slips past our
-- application-level filter, the database itself will reject any write.

CREATE ROLE readonly_app WITH LOGIN PASSWORD 'readonly';

GRANT CONNECT ON DATABASE company TO readonly_app;
GRANT USAGE ON SCHEMA public TO readonly_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_app;

-- Apply to any tables created later too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_app;
