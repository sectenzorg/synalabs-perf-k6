# Synalabs Perf - Stress Test Dashboard

A comprehensive Stress Test Dashboard built with Next.js and k6 for managing, executing, and analyzing performance tests.

## 🚀 Features

- **Target Management**: Register and organize multiple target environments (Dev, Staging, Prod).
- **Test Planning**: Define reusable test plans with specific endpoints, load profiles (VUs, duration, stages), and SLO thresholds.
- **k6 Execution**: Trigger k6 tests directly from the dashboard (Docker-integrated).
- **Real-time Monitoring**: Watch live logs and progress during test runs.
- **Rich Analytics**: Visualize RPS, latency (p50, p95, p99), and error rates with interactive charts.
- **Rule-based Insights**: Automated analysis of test results (SLO compliance, error patterns, regressions).
- **Comparison Engine**: Side-by-side comparison of different test runs with delta analysis.
- **HTML Reports**: Export detailed, shareable HTML reports for stakeholders.
- **Role-Based Access Control (RBAC)**: Distinct permissions for Admins, Testers, and Viewers.

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma 7 ORM
- **Auth**: NextAuth.js
- **Load Testing**: k6 (Dockerized)
- **Visualization**: Recharts
- **Styling**: Vanilla CSS (Modern Dark Theme)

## 📋 Prerequisites

- **Node.js**: v18 or later
- **Docker**: Required for k6 execution and database
- **npm**: v8 or later

## ⚙️ Setup Instructions

### 1. Environment Variables
Copy `.env.example` to `.env` and fill in the required values:
```bash
cp .env.example .env
```

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Database Setup
Initialize the database, run migrations, and seed initial data:
```bash
npm run setup
```
*Initial users:*
- **Admin**: `admin@synalabs.com` / `admin123`
- **Tester**: `tester@synalabs.com` / `tester123`
- **Viewer**: `viewer@synalabs.com` / `viewer123`

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🐳 Docker Management

You can run the entire stack using Docker Compose:
```bash
docker-compose up -d
```

## 🏗 Project Structure

- `src/app`: Next.js pages and API routes.
- `src/lib`: Core logic (k6 runner, parser, generator, insights engine).
- `src/components`: UI components.
- `prisma`: Database schema and seed scripts.
- `artifacts`: Storage for generated scripts and test results.

## 📄 License

Internal use only. Powered by Synalabs.
