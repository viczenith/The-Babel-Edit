# The Babel Edit (Frontend)

This is the frontend for The Babel Edit, a full-stack e-commerce platform. It's a [Next.js](https://nextjs.org) application built with TypeScript, Tailwind CSS, and `next-i18next` for internationalization.

## Features
- **Multi-language Support**: Easily switch between languages (English and French configured by default).
- **Modern Tech Stack**: Built with Next.js 16+, React 19, and TypeScript.
- **Responsive Design**: Styled with Tailwind CSS for a seamless experience on all devices.
- **State Management**: Client-side state managed by Zustand.
- **E-commerce Components**: Includes a shopping cart, product carousels, and a checkout process with Stripe integration.
- **User Authentication**: Forms for login, registration, and profile management.
- **Static Typing**: Full TypeScript support for robust and maintainable code.

## Getting Started

### 1. Start the Backend Server

```bash
cd the_babel_edit_backend
npm install
npm start

# Note the port shown in output (e.g., "🚀 Server running on 0.0.0.0:5000")
```

### 2. Configure Frontend API

In the `the_babel_edit` directory, create `.env.local`:

```bash
# OPTION A: Backend on port 5000 (default)
# Leave empty for auto-default
NEXT_PUBLIC_API_URL=

# OPTION B: Backend on different port
# NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

If backend is on port 5000 (most common case), `NEXT_PUBLIC_API_URL` can be left empty - frontend will auto-use `http://localhost:5000/api`.

### 3. Start Frontend Development Server

```bash
cd the_babel_edit

npm install

npm run dev
```

The frontend will be available at `http://localhost:3000`.

## Available Scripts

- `npm run dev`: Starts the development server with Turbopack.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts a production server.
- `npm run lint`: Lints the codebase.

## 🔐 Authentication

### Login Credentials

**SUPER_ADMIN:**
- Email: `admin@babeledit.com`
- Password: `password123`

**ADMIN:**
- Email: `isiquedan@gmail.com`
- Password: `password123`

### Admin Dashboard

After logging in with an admin account, access the admin dashboard:
- **Dashboard:** http://localhost:3000/en/dashboard
- **Landing Page Manager:** http://localhost:3000/en/admin/dashboard (SUPER_ADMIN only)

## ⚙️ API Configuration

### How It Works

The frontend reads the backend API URL from environment variables:

1. **From `.env.local`** (highest priority)
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5001/api
   ```

2. **Auto-Detection** (if .env.local is empty or not set)
   - Defaults to `http://localhost:5000/api`

3. **Browser Console Logging**
   Open browser console (F12) to see which URL is being used:
   ```
   ✅ Using API URL from NEXT_PUBLIC_API_URL
   // OR
   ℹ️ Using default: http://localhost:5000/api
   ```

### Troubleshooting API Connection

**If login shows "Invalid Credentials" or API errors:**

1. **Check backend is running:**
   ```bash
   cd the_babel_edit_backend
   npm start
   ```

2. **Verify which port backend is using:**
   ```bash
   netstat -ano | findstr ":500"
   ```

3. **Update frontend API URL if needed:**
   ```bash
   # Edit .env.local
   NEXT_PUBLIC_API_URL=http://localhost:5001/api
   
   # Restart frontend
   npm run dev
   ```

4. **Check frontend console (F12):**
   - Look for "Using API URL from..." message
   - Should show correct backend port

5. **Test backend directly:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@babeledit.com","password":"password123"}'
   ```
   Should return JWT token if working.
