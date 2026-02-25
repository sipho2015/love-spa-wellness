# Love Spa & Wellness

Full-stack booking and management system built with:

- Backend: ASP.NET Core Web API (`.NET 10`, compatible with `.NET 8+` patterns)
- Frontend: Angular `20` (standalone components, routing, reactive forms)
- Database: SQL Server / LocalDB via Entity Framework Core
- Auth: JWT with role-based authorization (`Admin`, `Staff`, `Customer`)

## Project Structure

```text
Love Spa & Wellness/
├── LoveSpaBackend/
│   ├── Controllers/
│   ├── Data/
│   ├── DTOs/
│   ├── Models/
│   ├── Services/
│   └── Migrations/
├── LoveSpaBackend.Tests/
├── LoveSpaFrontend/
└── scripts/
```

## Features Implemented

- Public pages: Home, Services, Booking
- Authentication: Register/Login/Forgot Password/Reset Password with JWT session handling
- Role dashboards:
  - Customer: view own bookings, get status-change notifications, reschedule/cancel eligible bookings
  - Staff: view assigned schedule and update status
  - Admin: manage services/therapists/packages/users, booking assignment queue, inquiry reply workflow
- CRUD APIs:
  - `Users` (register, login, me, admin list)
  - `Services` (CRUD)
  - `Therapists` (CRUD)
  - `Appointments` (CRUD + status updates + role-specific views + customer reschedule/cancel)
- Booking hardening:
  - Prevents therapist double-booking for the same date/time slot
  - Enforces therapist availability
  - Customer ownership checks use `CustomerUserId` (not only display name)
- Notifications:
  - In-app: Admin new activity alerts, Staff assignment alerts, Customer status-change alerts
  - Email (SMTP): password reset, new booking alerts to admins, new inquiry alerts to admins,
    assignment updates to staff, booking status updates to customers
- Swagger UI enabled in development
- EF Core migration for schema creation
- Seed data for users, services, therapists
- Basic unit tests for backend and frontend

## Database Schema

Implemented tables:

- `Users`
- `Services`
- `Therapists`
- `Appointments`
- `Inquiries`
- `PasswordResetTokens`

Key constraints:

- Unique index on `Users.Email`
- FK `Appointments.ServiceId -> Services.Id`
- FK `Appointments.TherapistId -> Therapists.Id`
- FK `Appointments.CustomerUserId -> Users.Id` (nullable, `SET NULL` on delete)

## Default Seed Users

- Admin: `admin@lovespa.com` / `Admin@123`
- Staff: `staff@lovespa.com` / `Staff@123`
- Customer: `customer@lovespa.com` / `Customer@123`

## Prerequisites

- .NET SDK `10.0.x` (or latest installed SDK with support for this target)
- Node.js `22+`
- npm `11+`
- SQL Server LocalDB or SQL Server instance

## Configure Database (SQL Server / SSMS)

1. Open `LoveSpaBackend/appsettings.json` and confirm `ConnectionStrings:DefaultConnection`.
2. Default LocalDB connection:
   - `Server=(localdb)\\MSSQLLocalDB;Database=LoveSpaWellnessDb;Trusted_Connection=True;...`
3. Apply migrations:

```powershell
cd LoveSpaBackend
dotnet ef database update
```

Or run helper:

```powershell
.\scripts\setup-database.ps1
```

4. In SSMS, connect to `(localdb)\MSSQLLocalDB` and verify database `LoveSpaWellnessDb`.

## Run Backend

```powershell
cd LoveSpaBackend
dotnet run
```

Keep this terminal running while using the frontend.

Backend URLs (development profile):

- `http://localhost:5169`
- `https://localhost:7265`
- Health check: `http://localhost:5169/health`

Swagger (when running in Development):

- `https://localhost:7265/swagger`

Helper script:

```powershell
.\scripts\start-backend.ps1
```

## Run Frontend

```powershell
cd LoveSpaFrontend
npm install
npm start
```

`npm start` now runs Angular with a proxy so frontend API calls to `/api` are forwarded to the backend.

Default proxy target:

- `http://localhost:5169`

If your backend runs on a different URL, set `API_PROXY_TARGET` before starting the frontend:

```powershell
$env:API_PROXY_TARGET = "https://localhost:7265"
npm start
```

Frontend URL:

- `http://localhost:4200`

Helper script:

```powershell
.\scripts\start-frontend.ps1
```

## Tests

Backend tests:

```powershell
dotnet test LoveSpaWellness.sln
```

Frontend tests:

```powershell
cd LoveSpaFrontend
npm run test -- --watch=false --browsers=ChromeHeadless
```

## API Notes

- Public booking endpoint: `POST /api/appointments`
- Role-protected endpoints require `Authorization: Bearer <token>`
- In development, Angular uses a local proxy (`/api -> backend URL`) to avoid CORS/port issues.
- Customer booking self-service:
  - `PATCH /api/appointments/{id}/reschedule` (Admin/Customer)
  - `PATCH /api/appointments/{id}/cancel` (Admin/Customer)
- Inquiry workflow:
  - `POST /api/inquiries` (Public)
  - `GET /api/inquiries` (Admin)
  - `PATCH /api/inquiries/{id}/status` (Admin)
  - `POST /api/inquiries/{id}/reply` (Admin, sends SMTP email)
- Password reset workflow:
  - `POST /api/users/forgot-password`
  - `POST /api/users/reset-password`
- SMTP is optional. Configure `Smtp` in `LoveSpaBackend/appsettings.json` or `appsettings.Development.json`:
  - `Host`, `Port`, `EnableSsl`, `Username`, `Password`, `FromEmail`, `FromName`
- Optional frontend link for reset emails:
  - `App:FrontendBaseUrl` (default `http://localhost:4200`)

## Docker Deployment (Optional)

Build and run full stack (SQL Server + API + Angular frontend):

```powershell
docker compose up --build
```

Services:

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:5169`
- Backend health: `http://localhost:5169/health`
- SQL Server: `localhost,1433` (`sa` / `LoveSpaSql!2026`)

Files added:

- `docker-compose.yml`
- `LoveSpaBackend/Dockerfile`
- `LoveSpaFrontend/Dockerfile`
- `LoveSpaFrontend/nginx.conf`
