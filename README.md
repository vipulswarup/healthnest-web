# SanoVault Web Application

A web-first health record management system built with Next.js, Neon Postgres, and React.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Neon Postgres
- **Authentication**: Neon Auth
- **Document Storage**: Cloudflare R2 (private bucket with signed downloads)
- **AI Processing**: Groq (Llama 3.3 70B)
- **OCR**: Tesseract (hosted on VM)

## Prerequisites

- Node.js 18+ and npm
- Neon account and project
- Neon Auth enabled for the production branch
- Cloudflare account, R2 bucket, and S3 API credentials
- Groq API key
- Tesseract OCR service (optional for initial setup)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

- `DATABASE_URL`: Neon pooled connection string
- `DIRECT_URL`: Neon direct connection string, used only for migrations
- `NEON_AUTH_BASE_URL`: Neon Console → Auth → Configuration → Auth URL
- `NEON_AUTH_COOKIE_SECRET`: Generate with `openssl rand -base64 32`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`: Cloudflare R2 bucket credentials
- `GROQ_API_KEY`: Groq API key for AI processing
- `OCR_SERVICE_URL`: URL of Tesseract OCR service (optional)

### 3. Initialize Database

Run the versioned database migrations:

```bash
npm run init-db
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Project Structure

```
sanovault-web/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   └── ...
├── lib/                   # Core libraries
│   ├── auth/             # Authentication config
│   ├── db/               # Database utilities
│   ├── middleware/       # Middleware functions
│   ├── types/            # TypeScript types
│   └── r2.ts             # Cloudflare R2 client
├── scripts/              # Utility scripts
├── types/                # Global type definitions
└── ...
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run init-db` - Apply Neon database migrations

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signup` - Sign up
- `GET /api/auth/session` - Get current session

### Users
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update current user

### Patients
- `GET /api/patients` - List patients
- `POST /api/patients` - Create patient
- `GET /api/patients/:id` - Get patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Health Records
- `GET /api/health-records` - List health records
- `POST /api/health-records` - Create health record
- `GET /api/health-records/:id` - Get health record
- `PUT /api/health-records/:id` - Update health record
- `DELETE /api/health-records/:id` - Delete health record

### Medications
- `GET /api/medications` - List medications
- `POST /api/medications` - Create medication
- `GET /api/medications/:id` - Get medication
- `PUT /api/medications/:id` - Update medication
- `DELETE /api/medications/:id` - Delete medication

## Database Schema

### Tables

- `profiles` - App users/owners, linked to Neon Auth
- `patients` - Family member patient profiles
- `health_records` - Health records and documents
- `medications` - Medication prescriptions
- `medication_doses` - Medication dose logs
- `medication_reminders` - Medication reminders

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "New Project" and import your repository
4. Add environment variables in project settings
5. Deploy!

Vercel automatically:
- Detects Next.js configuration
- Sets up CI/CD from your Git repository
- Deploys on every push to main branch
- Creates preview deployments for pull requests
- Provides SSL certificates

### Environment Variables

Set these in your deployment platform:

**Required:**
- `DATABASE_URL` - Neon pooled Postgres connection string
- `DIRECT_URL` - Neon direct connection string for migrations
- `NEON_AUTH_BASE_URL` - Neon Auth URL
- `NEON_AUTH_COOKIE_SECRET` - Generate with `openssl rand -base64 32`
- `R2_ACCOUNT_ID` - Cloudflare R2 account ID
- `R2_ACCESS_KEY_ID` - Cloudflare R2 access key
- `R2_SECRET_ACCESS_KEY` - Cloudflare R2 secret key
- `R2_BUCKET_NAME` - R2 bucket name

The bucket should remain private; `R2_PUBLIC_URL` is not needed.

## License

See LICENSE file in the root directory.
