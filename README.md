# Job Tracker

A full-stack web app to track job applications through every stage: Applied → Online Assessment → Interview → Offer / Rejected.

**Live demo:** _add your deployed link here_  
**Screenshot:** _add a screenshot at `docs/screenshot.png`_

## Features
- Secure sign-up and login (bcrypt password hashing, JWT authentication)
- Full CRUD on applications, with each user able to access only their own data
- Search by company or role, and filter by status
- Dashboard with live counts per stage
- Input validation and consistent JSON error responses
- Automated tests (Jest + Supertest) run on every push with GitHub Actions

## Tech stack
Node.js, Express, SQLite (better-sqlite3), JWT, bcryptjs, vanilla JavaScript front end, Jest, Supertest, GitHub Actions

## Getting started
```bash
git clone https://github.com/Padmasree5314/job-tracker.git
cd job-tracker
npm install
cp .env.example .env      # then set JWT_SECRET to a long random string
export JWT_SECRET=your-secret   # (Windows PowerShell: $env:JWT_SECRET="your-secret")
npm start                 # http://localhost:3000
npm test                  # run the test suite
```

## API
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account `{email, password}` |
| POST | `/api/auth/login` | No | Returns `{token}` |
| GET | `/api/applications?status=&q=` | Bearer | List, filter, search |
| GET | `/api/applications/stats` | Bearer | Counts per status |
| POST | `/api/applications` | Bearer | Create `{company, role, status?, link?, notes?, applied_date?}` |
| PUT | `/api/applications/:id` | Bearer | Partial update |
| DELETE | `/api/applications/:id` | Bearer | Delete |

## Design decisions
- **App factory (`createApp(db, secret)`)** lets tests run against an in-memory database with no mocking.
- **Parameterized SQL queries** everywhere to prevent SQL injection.
- **Ownership checks** in every query (`WHERE user_id = ?`), so one user can never touch another's data.
- **Same error message** for unknown email and wrong password, to avoid revealing which emails are registered.

## Future improvements
- Refresh tokens and rate limiting on login
- Reminders for follow-ups and interview dates
- Export to CSV
- 
