-- Sample "company" database: departments, employees, salaries, projects
-- Designed to make interesting NL-to-SQL questions possible
-- (averages, joins, group-by, date filters).

CREATE TABLE departments (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    location    TEXT NOT NULL
);

CREATE TABLE employees (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    manager_id    INTEGER REFERENCES employees(id),
    salary        NUMERIC(10, 2) NOT NULL,
    hired_at      DATE NOT NULL
);

CREATE TABLE projects (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    budget        NUMERIC(12, 2) NOT NULL,
    started_at    DATE NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('active', 'completed', 'on_hold'))
);

CREATE TABLE employee_projects (
    employee_id INTEGER REFERENCES employees(id),
    project_id  INTEGER REFERENCES projects(id),
    role        TEXT NOT NULL,
    PRIMARY KEY (employee_id, project_id)
);
