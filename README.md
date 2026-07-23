# DocHub

DocHub is a comprehensive Document Management System. It features a modern web interface built with Next.js and an AI-powered microservice built with FastAPI for processing documents, search, and intelligent chat.

## Folder Structure

```text
dochub/
├── app/               # Next.js App Router (pages and API routes)
├── components/        # Reusable React UI components
├── editor/            # BlockNote-based rich text editor and extensions
├── lib/               # Shared utilities, database connection (Prisma), and helpers
├── prisma/            # Database schema and migrations
├── ai-service/        # Python FastAPI microservice for AI features (embeddings, LLMs)
├── public/            # Static assets and local file uploads
├── types/             # Global TypeScript type definitions
└── stores/            # Zustand global state management
```

---

## Prerequisites

- **Node.js** (v18+)
- **Python** (3.9+)
- **PostgreSQL** (Docker recommended)

---

## Local Development Setup

### 1. Database Setup
Start the local PostgreSQL database using Docker:
```bash
docker-compose up -d
```
Generate the Prisma client and push the schema to the database:
```bash
npx prisma generate
npx prisma db push
```

### 2. Next.js Web Application
Install the Node dependencies:
```bash
npm install
```
Set up your environment variables:
```bash
cp .env.example .env
```
*(Make sure to fill in any missing credentials in the `.env` file).*

Start the Next.js development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### 3. FastAPI AI Microservice
Open a new terminal tab and navigate to the microservice directory:
```bash
cd ai-service
```
Set up the Python environment variables:
```bash
cp .env.example .env
```
Install dependencies (using `uv` or `pip`):
```bash
uv sync 
# OR: pip install fastapi uvicorn ... (based on your python env)
```
Run the FastAPI development server:
```bash
uvicorn main:app --reload --port 8000
```
The AI microservice will be available at `http://localhost:8000`.

---

## Production / Server Deployment

When deploying to a remote server, follow these commands.

### 1. Database Migrations
Always ensure your production database is migrated before starting the Next.js app:
```bash
npx prisma generate
npx prisma migrate deploy
```

### 2. Next.js Application
Build the application for production:
```bash
npm run build
```
Start the production server:
```bash
npm start
```
*(It is highly recommended to use a process manager like **PM2** to keep the app running in the background: `pm2 start npm --name "dochub-web" -- start`)*

### 3. FastAPI Microservice
For the Python microservice, run it without the `--reload` flag and bind it to `0.0.0.0` so it can receive connections, typically using multiple workers:
```bash
cd ai-service
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```
*(Similarly, this should be managed by systemd or a process manager).*