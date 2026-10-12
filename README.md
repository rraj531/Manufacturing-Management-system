# ForgeFlow — Manufacturing Management System

A modular manufacturing operations project with a responsive frontend, Node.js/Express REST API, and MySQL database.

## Modules / project phases

1. **Phase 1 — Frontend foundation:** responsive admin shell, navigation, dashboard layout, global search, mobile sidebar.
2. **Phase 2 — Workforce:** employee CRUD, search, CSV export, daily attendance (Present/Absent/Leave).
3. **Phase 3 — Inventory:** material master, stock quantity, reorder levels, supplier details, low-stock dashboard.
4. **Phase 4 — Production & dispatch:** production orders, progress/status tracking, dispatch/shipment tracking.
5. **Phase 5 — Reports & integration:** dashboard metrics, report summary, CSV export, API and database integration.

## Tech stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express, REST API
- Database: MySQL 8+
- Security baseline: Helmet, parameterized SQL queries, input validation, environment variables

## Folder structure

```text
Manufacturing-Management-system/
├── index.html
├── css/
│   ├── style.css
│   └── modules.css
├── js/
│   └── app.js
├── backend/
│   └── server.js
├── database/
│   └── schema.sql
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 1. Create your MySQL database

1. Open MySQL Workbench and connect to your local MySQL server.
2. Open `database/schema.sql`.
3. Execute the whole script. It creates `manufacturing_management` and all required tables.
4. This repository does **not** contain your MySQL password or database data.

## 2. Start the backend

Install Node.js 18+ first, then open a terminal at the project root:

```bash
npm install
```

Copy `.env.example` to `.env` and set your own MySQL password:

```env
PORT=5000
FRONTEND_ORIGIN=http://127.0.0.1:5500
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=manufacturing_management
```

Start API:

```bash
npm run dev
```

Check `http://localhost:5000/api/health`. A successful response includes `"database":"connected"`.

## 3. Start the frontend

Use VS Code Live Server to open `index.html` (normally `http://127.0.0.1:5500`). Keep the backend running in another terminal. The frontend sends requests to `http://localhost:5000/api` by default.

## Main API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API + database health |
| GET | `/api/dashboard` | Dashboard totals and alerts |
| GET/POST | `/api/employees` | List / add employee |
| GET/PUT/DELETE | `/api/employees/:id` | Read / update / deactivate employee |
| GET | `/api/attendance?date=YYYY-MM-DD` | Attendance for a date |
| POST | `/api/attendance/bulk` | Save attendance rows |
| GET/POST | `/api/inventory` | List / add inventory item |
| GET/PUT/DELETE | `/api/inventory/:id` | Read / update / delete inventory |
| GET/POST | `/api/production` | List / create production order |
| GET/PUT/DELETE | `/api/production/:id` | Read / update / delete order |
| GET/POST | `/api/dispatch` | List / create dispatch |
| GET/PUT/DELETE | `/api/dispatch/:id` | Read / update / delete dispatch |
| GET | `/api/reports/summary` | Report counts |

## Important notes

- MySQL is the source of truth; the browser does not use localStorage for business records.
- Keep `.env` private; never commit database passwords to GitHub.
- Employee delete is a soft delete so old attendance records remain available; attendance rows for permanently removed employees cascade on delete.
- This is a development foundation, not a production-ready secured ERP. Before public deployment, add administrator authentication/authorization, audit logs, rate limiting, backups, stricter business validation, and HTTPS.
- For hosting the frontend and backend on different origins, set `FRONTEND_ORIGIN` to your actual frontend origin. Set DB variables to the managed MySQL provider; `localhost` on a cloud server points to that server itself, not your laptop.
