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
