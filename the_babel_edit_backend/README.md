# Authentication Server

A comprehensive authentication server with JWT and Google OAuth support built with Express.js, Prisma, and PostgreSQL.

## Features

- 🔐 JWT Authentication
- 🌐 Google OAuth 2.0
- 🛡️ Password hashing with bcrypt
- 📊 PostgreSQL database with Prisma ORM
- 🔒 Protected routes with middleware
- 🚀 Express.js with modern ES modules
- 🛡️ Security middleware (Helmet, CORS)

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- Google OAuth credentials

## Setup

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/your_database"
   
   # JWT
   JWT_SECRET="your-super-secret-jwt-key-here"
   ACCESS_TOKEN_SECRET="your-access-token-secret"
   REFRESH_TOKEN_SECRET="your-refresh-token-secret"
   
   # Session
   SESSION_SECRET="your-session-secret-key"
   
   # Google OAuth
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   
   # Frontend URL (for OAuth redirects)
   FRONTEND_URL="http://localhost:3000"
   
   # Environment
   NODE_ENV="development"
   
   # Server
   PORT=5000
   ```

3. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Seed database with sample data (optional)
   npm run db:seed
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URIs:
   - `http://localhost:5000/api/users/auth/google/callback` (development)
   - `https://yourdomain.com/api/users/auth/google/callback` (production)

## API Endpoints

### Authentication

#### Register User
```http
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login User
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Google OAuth
```http
GET /api/users/auth/google
```

### Protected Routes

#### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <jwt-token>
```

#### Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith"
}
```

### Health Check
```http
GET /health
```

## Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "googleId": null,
    "avatar": null,
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token-here"
}
```

### Error Response
```json
{
  "message": "Error description"
}
```

## Database Schema

The User model includes:
- `id`: Unique identifier
- `email`: User email (unique)
- `password`: Hashed password (null for Google OAuth users)
- `firstName`: User's first name
- `lastName`: User's last name
- `googleId`: Google OAuth ID (unique)
- `avatar`: Profile picture URL
- `isVerified`: Email verification status
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

## Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT tokens with 7-day expiration
- Protected routes with middleware
- CORS configuration
- Helmet security headers
- Input validation
- Error handling

## Development

### Available Scripts
- `npm run dev`: Start development server with nodemon
- `npm run start`: Start production server
- `npm run db:generate`: Generate Prisma client
- `npm run db:push`: Push schema changes to database
- `npm run db:migrate`: Run database migrations
- `npm run db:studio`: Open Prisma Studio

### Project Structure
```
server/
├── config/
│   ├── passport.js      # Google OAuth configuration
│   └── cloudinary.js    # File upload configuration
├── controllers/
│   └── userController.js # User authentication logic
├── middleware/
│   └── auth.js          # JWT verification middleware
├── models/              # Database models (Prisma)
├── routes/
│   └── userRoutes.js    # API routes
├── prisma/
│   └── schema.prisma    # Database schema
├── app.js               # Express app configuration
├── index.js             # Server entry point
└── package.json
```

## License

ISC 
## 🔐 Authentication Credentials

### Default Admin Accounts

These accounts are created automatically when the database is seeded (after migration).

**Login as SUPER_ADMIN:**
- Email: `superadmin@thebabeledit.com`
- Password: `B@belSup3r!2026x`
- Role: SUPER_ADMIN (system administrator)

**Login as ADMIN:**
- Email: `admin@thebabeledit.com`
- Password: `B@belAdm1n!2026x`
- Role: ADMIN (product manager)

### Admin Management

Admin and Super Admin accounts are managed from the admin dashboard:
- A **SUPER_ADMIN** can promote any registered user to **ADMIN** or **SUPER_ADMIN** via **Users Management**.
- The initial SUPER_ADMIN is created via a one-time invite token during registration.
- Public registration always creates standard **USER** accounts.

---

Test Cards to Use
Card Number	Result
4242 4242 4242 4242	Successful payment
4000 0000 0000 3220	3D Secure authentication
4000 0000 0000 9995	Declined (insufficient funds)
4000 0000 0000 0002	Generic decline

For the other fields, use any valid-looking values:
Expiry: Any future date (e.g. 12/29)
CVC: Any 3 digits (e.g. 123)
ZIP: Any 5 digits (e.g. 10001)



## ⚙️ Port Configuration

### Backend Port Fallback

The backend automatically detects available ports:

```
PRIMARY:    5000
FALLBACK:   5001 → 5002 → 5003 → 5004 → 5005
```

**Example:**
```bash
npm start
# If port 5000 busy: tries 5001
# If 5001 busy: tries 5002
# ... and so on
```

Console output will show which port is being used:
```
🚀 Server running on 0.0.0.0:5001
```

### Frontend API URL Configuration

**Option A: Automatic (Recommended)**
- Frontend reads `NEXT_PUBLIC_API_URL` from `.env.local`
- If not set, defaults to `http://localhost:5000/api`
- Works auto-magically if backend on default port

**Option B: Explicit (When backend on different port)**

In `the_babel_edit/.env.local`:
```env
# Set this if backend on different port
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

Then restart frontend:
```bash
npm run dev
```

---

## 🐛 Troubleshooting

### Login Shows "Invalid Credentials"

```bash
# 1. Verify backend is running
netstat -ano | findstr ":500"
# Should show listening on one of: 5000, 5001, 5002, etc.

# 2. Verify users exist in database
cd the_babel_edit_backend
npm run db:seed:verify

# 3. Check frontend is using correct API URL
# Open browser console (F12) and look for messages like:
# ✅ "Using API URL from NEXT_PUBLIC_API_URL"
# OR
# ℹ️ "Using default: http://localhost:5000/api"

# 4. Test login directly with curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@babeledit.com","password":"password123"}'
# Should return JWT token if working
```

### Backend Won't Start on Port 5000

```bash
# Check what's using port 5000
netstat -ano | findstr ":5000"

# Kill process if needed (Windows PowerShell)
Get-NetTCPConnection -LocalPort 5000 | ForEach-Object { 
  Stop-Process -Id $_.OwningProcess -Force 
}

# Restart backend
npm start
# Backend will auto-select next available port (usually 5001)
```

### Frontend Can't Connect to Backend

1. **Verify backend is actually running:**
   ```bash
   cd the_babel_edit_backend
   npm start
   # Note the port shown
   ```

2. **Check frontend .env.local:**
   ```bash
   cat the_babel_edit/.env.local
   # Should show NEXT_PUBLIC_API_URL=
   ```

3. **If backend on different port, update .env.local:**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5001/api
   ```

4. **Restart frontend:**
   ```bash
   cd the_babel_edit
   npm run dev
   ```

---

## 📊 Database Seeding

### Automatic Seeding

Database is seeded when migrations are applied:

```bash
npm run db:safe-migrate add_feature_name
# ✅ Automatically runs seed after migration
```

### Manual Seeding

If needed, seed manually:

```bash
npm run db:seed
# Creates default SUPER_ADMIN and ADMIN users
```

### Verify Seeded Data

Check what users were created:

```bash
npm run db:seed:verify

# Output:
# ✅ Found 2 users in database:
# 1. admin@babeledit.com
#    Role: SUPER_ADMIN
# 2. isiquedan@gmail.com
#    Role: ADMIN
```

---

## Kill the process on port 5000

Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { 
  Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

# Wait and verify port is free
Start-Sleep -Seconds 1
netstat -ano | findstr ":5000"

# Navigate to backend and start
cd C:\Users\HP\Documents\VictorGodwin\The Babel Edit\Babel_Full_Stack\the_babel_edit_backend
npm run dev

 

# Navigate to frontend
cd "C:\Users\HP\Documents\VictorGodwin\The Babel Edit\Babel_Full_Stack\the_babel_edit"

# Kill frontend if running
taskkill /F /FI "IMAGENAME eq node.exe"
Start-Sleep -Seconds 1

# Start frontend
npm run dev



cd "C:\Users\HP\Documents\VictorGodwin\The Babel Edit\Babel_Full_Stack\the_babel_edit_backend"
node -e "(async()=>{ const p=(await import('./prismaClient.js')).default; const u=await p.user.findMany({select:{email,role}}); console.log(JSON.stringify(u,null,2)); await p.$disconnect(); })().catch(e=>console.error(e))"