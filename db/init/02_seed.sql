-- Seed data

INSERT INTO departments (name, location) VALUES
    ('Engineering', 'Bangalore'),
    ('Sales',       'Mumbai'),
    ('Marketing',   'Delhi'),
    ('HR',          'Bangalore'),
    ('Finance',     'Mumbai');

-- Employees. manager_id filled in a second pass (some are managers).
INSERT INTO employees (name, email, department_id, manager_id, salary, hired_at) VALUES
    ('Asha Rao',        'asha.rao@company.com',        1, NULL, 185000, '2018-03-01'),
    ('Vikram Singh',    'vikram.singh@company.com',    1, 1,     95000, '2020-06-15'),
    ('Neha Gupta',      'neha.gupta@company.com',      1, 1,    102000, '2019-11-20'),
    ('Rahul Menon',     'rahul.menon@company.com',     1, 1,     78000, '2021-01-10'),
    ('Priya Nair',      'priya.nair@company.com',      1, 1,    120000, '2017-08-05'),
    ('Sanjay Kumar',    'sanjay.kumar@company.com',    2, NULL, 160000, '2016-02-01'),
    ('Divya Iyer',      'divya.iyer@company.com',      2, 6,     72000, '2021-09-12'),
    ('Arjun Reddy',     'arjun.reddy@company.com',     2, 6,     68000, '2022-03-22'),
    ('Meera Joshi',     'meera.joshi@company.com',     3, NULL, 140000, '2018-07-19'),
    ('Karan Malhotra',  'karan.malhotra@company.com',  3, 9,     64000, '2022-11-01'),
    ('Sneha Pillai',    'sneha.pillai@company.com',    4, NULL, 110000, '2019-04-30'),
    ('Rohan Desai',     'rohan.desai@company.com',     4, 11,    58000, '2023-01-15'),
    ('Anita Shah',      'anita.shah@company.com',      5, NULL, 150000, '2017-05-25'),
    ('Manish Verma',    'manish.verma@company.com',    5, 13,    82000, '2020-10-08'),
    ('Pooja Bhat',      'pooja.bhat@company.com',      1, 1,     91000, '2022-06-01');

INSERT INTO projects (name, department_id, budget, started_at, status) VALUES
    ('Payment Gateway',   1, 500000, '2023-01-01', 'active'),
    ('Mobile App Revamp', 1, 350000, '2022-06-01', 'completed'),
    ('Q4 Sales Push',     2, 120000, '2023-09-01', 'active'),
    ('Brand Refresh',     3, 200000, '2023-03-15', 'on_hold'),
    ('Payroll Migration', 5,  90000, '2023-02-01', 'completed');

INSERT INTO employee_projects (employee_id, project_id, role) VALUES
    (1, 1, 'Lead'),
    (2, 1, 'Backend Engineer'),
    (3, 1, 'Backend Engineer'),
    (4, 2, 'Mobile Engineer'),
    (5, 2, 'Tech Lead'),
    (15, 1, 'Backend Engineer'),
    (6, 3, 'Sales Lead'),
    (7, 3, 'Account Executive'),
    (9, 4, 'Marketing Lead'),
    (13, 5, 'Finance Lead'),
    (14, 5, 'Analyst');
