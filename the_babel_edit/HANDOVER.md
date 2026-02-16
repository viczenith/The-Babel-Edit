# Project Handover: The Babel Edit

## 1. Project Overview

**The Babel Edit** is a full-stack e-commerce platform featuring a multilingual frontend, a robust backend, and a comprehensive set of features for a modern online shopping experience.

This document contains all necessary information for a new developer to take over and continue development.

---

## 2. Architecture

The project is a monorepo containing two main applications:

### Frontend (`the_babel_edit`)
- **Framework**: [Next.js](https://nextjs.org) (v16+) with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Internationalization (i18n)**: `next-i18next`
- **Key Features**: Multi-language support, product catalog, shopping cart, Stripe checkout, user authentication, and a full admin dashboard.

### Backend (`the_babel_edit_backend`)
- **Framework**: [Express.js](https://expressjs.com/)
- **Language**: JavaScript (ES Modules)
- **Database**: PostgreSQL with [Prisma](https://www.prisma.io/) ORM
- **Authentication**: JWT-based with Google OAuth 2.0 support using Passport.js.
- **Key Services**: RESTful API for products, orders, users, etc., Stripe for payments, Cloudinary for image uploads.

---

## 3. Service Credentials & Links

**IMPORTANT SECURITY NOTICE:** Passwords have been intentionally redacted. They must be shared via a secure, encrypted channel (e.g., a password manager).

-   **GitHub (Frontend):** [https://github.com/Dalyop/the_babel_edit](https://github.com/Dalyop/the_babel_edit)
-   **GitHub (Backend):** [https://github.com/Dalyop/the_babel_edit_backend](https://github.com/Dalyop/the_babel_edit_backend)

---

-   **Vercel (Frontend Hosting)**
    *   **URL:** [https://vercel.com/nyaka/the-babel-edit](https://vercel.com/nyaka/the-babel-edit)
    *   **Username (Email):** `isiquedan@gmail.com`
    *   **Password:** `[REDACTED - SENSITIVE INFORMATION]`

-   **Koyeb (Backend Hosting)**
    *   **URL:** [https://app.koyeb.com](https://app.koyeb.com)
    *   **Username (Email):** `isiquedan@gmail.com`
    *   **Password:** `[REDACTED - SENSITIVE INFORMATION]`

-   **Supabase (Database Hosting)**
    *   **URL:** [https://supabase.com/dashboard/org/](https://supabase.com/dashboard/org/)
    *   **Username (Email):** `isiquedan@gmail.com`
    *   **Password:** `[REDACTED - SENSITIVE INFORMATION]`

-   **Cloudinary (Image & Media Management)**
    *   **URL:** [https://cloudinary.com/](https://cloudinary.com/)
    *   **Username (Email):** `isiquedan@gmail.com`
    *   **Password:** `[REDACTED - SENSITIVE INFORMATION]`

---

## 4. Local Development Setup

### Step 1: Backend (`the_babel_edit_backend`)
The backend must be running before starting the frontend.

1.  Navigate to the backend directory:
    ```bash
    cd the_babel_edit_backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file and populate it with the necessary credentials (see section 5).
4.  Apply the database schema:
    ```bash
    npx prisma db push
    ```
5.  Run the development server:
    ```bash
    npm run dev
    ```
The backend will run on `http://localhost:5000`.

### Step 2: Frontend (`the_babel_edit`)

1.  Navigate to the frontend directory:
    ```bash
    cd the_babel_edit
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env.local` file to point to the backend API:
    ```bash
    echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```
The frontend will be available at `http://localhost:3000`.

---

## 5. Environment Variables Checklist

These variables must be set in the respective `.env` files for the application to run correctly.

### Backend (`.env`)
```env
# Database (from Supabase)
DATABASE_URL="postgresql://..."

# JWT Secrets (generate strong random strings)
JWT_SECRET="..."
ACCESS_TOKEN_SECRET="..."
REFRESH_TOKEN_SECRET="..."

# Session Secret (generate a strong random string)
SESSION_SECRET="..."

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Stripe (from Stripe Dashboard)
STRIPE_SECRET_KEY="..."
STRIPE_WEBHOOK_SECRET="..."

# Cloudinary (from Cloudinary Dashboard)
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Application URLs & Port
FRONTEND_URL="http://localhost:3000"
PORT=5000
NODE_ENV="development"
```

### Frontend (`.env.local`)
```env
# URL of the running backend server
NEXT_PUBLIC_API_URL="http://localhost:5000"

# Stripe Public Key (from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="..."
```
