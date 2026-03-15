# DGSystem Backend API

## Setup

```bash
cd server
npm install
```

## Environment
All credentials are pre-configured in `.env`

## Database
- PostgreSQL: `dgsystem` database on localhost:5432
- User: `postgres` / Password: `admin123`

Create DB first:
```sql
CREATE DATABASE dgsystem;
```

## Run
```bash
# Development
npm run dev

# Production
npm start
```

Server starts on **port 5000**. Admin is auto-seeded on first run.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login (email or employee_id) |
| GET | /api/auth/me | Current user |
| GET/POST | /api/users | Users CRUD |
| GET/POST | /api/organisations | Organisations CRUD |
| GET/POST | /api/sites | Sites CRUD |
| GET/POST | /api/labour | Labour CRUD |
| GET/POST | /api/attendance | Attendance |
| POST | /api/attendance/bulk | Bulk mark attendance |
| GET/POST | /api/salary | Salary records |
| POST | /api/salary/generate | Generate salary |
| POST | /api/salary/generate-bulk | Bulk generate |
| GET/POST | /api/expenses | Daily expenses |
| GET/POST | /api/ledger | Site ledger |
| GET/POST | /api/ledger/client-payments | Client payments |
| GET/POST | /api/godown | Godowns & stock |
| GET/POST | /api/machines | Machines |
| GET/POST | /api/drivers | Drivers |
| GET/POST | /api/trips | Trips |
| GET/POST | /api/visit-reports | Visit reports |
| GET/POST | /api/boq/labour | BOQ Labour |
| GET/POST | /api/boq/material | BOQ Material |
| GET/POST | /api/notifications | Notifications |
| GET | /api/dashboard/admin | Admin dashboard |
| GET | /api/dashboard/supervisor | Supervisor dashboard |
| GET | /api/dashboard/driver | Driver dashboard |
| POST | /api/upload/single | Upload file to Cloudinary |
| POST | /api/upload/base64 | Upload base64 photo |
| POST | /api/ai/chat | AI assistant chat |
| POST | /api/ai/analyze-site/:id | AI site analysis |

## Default Admin
- Email: `dgsystem8810@gmail.com`
- Password: `admin123`

## WebSocket Events
Connect to `http://localhost:5000` with socket.io
- `notification` — new notification broadcast
- `attendance_updated` — attendance marked
- `low_stock` — godown stock below threshold
- `machine_request` — new machine request
