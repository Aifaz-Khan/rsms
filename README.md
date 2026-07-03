# Research Survey Management System (RSMS)

A production-ready, full-stack survey management platform built with the PERN stack.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| State | TanStack Query, React Hook Form |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | JWT + Refresh Tokens + bcrypt |
| Email | Nodemailer |
| Export | xlsx, jspdf |
| QR Code | qrcode |

---

## Project Structure

```
rsms/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Seed data
│   └── src/
│       ├── config/             # DB, env config
│       ├── controllers/        # Route handlers
│       ├── middlewares/        # Auth, upload, error
│       ├── routes/             # Express routes
│       ├── services/           # Email service
│       └── utils/              # Logger
├── frontend/
│   └── src/
│       ├── api/                # Axios + API calls
│       ├── components/         # Reusable components
│       ├── context/            # Auth context
│       ├── layouts/            # Page layouts
│       ├── pages/              # All pages
│       └── types/              # TypeScript types
├── docker-compose.yml
├── Dockerfile
└── nginx.conf
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (or Neon account)
- npm or yarn

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT secrets, SMTP config

# Frontend
cp .env.example .env
# Edit VITE_API_URL if needed
```

### 3. Database Setup

```bash
cd backend
npx prisma generate
npx prisma db push
npm run seed
```

### 4. Run Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Admin: http://localhost:5173/login

### Admin Credentials
```
Email:    admin@rsms.com
Password: Admin@123456
```

---

## API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register |
| POST | /api/auth/refresh-token | Refresh JWT |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/forgot-password | Forgot password |
| POST | /api/auth/reset-password | Reset password |
| GET | /api/auth/me | Get current user |

### Surveys
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/surveys | List surveys |
| POST | /api/surveys | Create survey |
| GET | /api/surveys/:id | Get survey |
| PUT | /api/surveys/:id | Update survey |
| DELETE | /api/surveys/:id | Delete survey |
| POST | /api/surveys/:id/duplicate | Duplicate |
| PATCH | /api/surveys/:id/publish | Publish |
| GET | /api/surveys/:id/qrcode | Get QR code |
| GET | /api/surveys/slug/:slug | Get by slug (public) |

### Sections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sections?surveyId= | List sections |
| POST | /api/sections | Create section |
| PUT | /api/sections/:id | Update section |
| DELETE | /api/sections/:id | Delete section |
| POST | /api/sections/reorder | Reorder sections |

### Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/questions?sectionId= | List questions |
| POST | /api/questions | Create question |
| PUT | /api/questions/:id | Update question |
| DELETE | /api/questions/:id | Delete question |
| POST | /api/questions/reorder | Reorder |
| POST | /api/questions/:id/options | Add option |
| POST | /api/questions/logic | Add logic rule |

### Responses (Participant)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/responses/token | Get participant token |
| POST | /api/responses/start | Start response |
| POST | /api/responses/save | Auto-save answers |
| POST | /api/responses/submit | Submit survey |

### Analytics & Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/surveys/:id | Survey analytics |
| GET | /api/export/surveys/:id/csv | Export CSV |
| GET | /api/export/surveys/:id/excel | Export Excel |
| GET | /api/dashboard/stats | Dashboard stats |

---

## Database Schema (ER Summary)

```
users ──────────────── surveys
                           │
                        sections
                           │
                        questions ──── question_options
                           │
                        survey_logic
                           │
participant_tokens ──── responses ──── answers
                           │
                        audit_logs
                        question_bank
```

---

## Deployment

### Backend → Render

1. Create a new Web Service on Render
2. Connect your GitHub repo
3. Set build command: `cd backend && npm install && npx prisma generate && npm run build`
4. Set start command: `cd backend && npm start`
5. Add all environment variables from `.env.example`

### Frontend → Vercel

1. Import project on Vercel
2. Set root directory to `frontend`
3. Add `VITE_API_URL=https://your-render-backend.onrender.com/api`
4. Deploy

### Database → Neon

1. Create a Neon project at neon.tech
2. Copy the connection string
3. Set as `DATABASE_URL` in backend environment
4. Run `npx prisma db push` and `npm run seed`

---

## Docker

```bash
# Build and run
docker-compose up --build

# Backend only
docker build --target backend -t rsms-backend .
docker run -p 5000:5000 --env-file backend/.env rsms-backend
```

---

## Features

- ✅ 17 question types (text, radio, checkbox, rating, likert, slider, etc.)
- ✅ Unlimited surveys, sections, questions
- ✅ Conditional logic & skip logic
- ✅ Auto-save every 10 seconds
- ✅ Resume survey from any device
- ✅ Participant tokens (no login required)
- ✅ JWT + Refresh token auth
- ✅ Role-based access (Admin, Researcher)
- ✅ Admin dashboard with charts
- ✅ Response management (view, filter, delete)
- ✅ Analytics (trends, section completion, question analysis)
- ✅ Export to CSV and Excel
- ✅ QR code generation
- ✅ Survey duplication
- ✅ Question bank
- ✅ Email notifications (password reset, invitations)
- ✅ Professional medical UI (no dark/neon)
- ✅ Fully responsive
- ✅ Docker support
- ✅ Seed data with Ayurvedic Medical Research Survey

---

## License

MIT
