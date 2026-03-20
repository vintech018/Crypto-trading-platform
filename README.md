# Solidus AI

A professional cryptocurrency trade analysis assistant integrated into the Solidus crypto learning platform.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up PostgreSQL database:
   - Create a database named `solidus_ai`
   - Run the SQL script in `init-db.sql` to create tables

3. Configure environment variables:
   - Copy `.env.local` and fill in your values:
     - `DATABASE_URL`: PostgreSQL connection string
     - `OPENAI_API_KEY`: Your OpenAI API key
     - `JWT_SECRET`: A secret key for JWT tokens

4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Features

- User authentication with JWT
- Upload trade screenshots for AI analysis
- Structured trade feedback based on technical analysis
- Trade history and analysis storage
- Modern dark UI with crypto theme

## API

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/trades` - Upload and analyze a trade
- `GET /api/trades` - Get user's trade history
