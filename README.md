# AI PDF Tutor

A modern web app for uploading, viewing, and chatting with your PDFs using AI. Built with Next.js (App Router), TypeScript, Prisma, NextAuth, and Tailwind CSS.

---

## Features

- **User Authentication**: Secure sign-in/sign-out with NextAuth.
- **PDF Upload & Management**: Upload, list, and view your PDFs in a responsive dashboard.
- **PDF Viewing**: Native `<iframe>` for fast, reliable PDF rendering (no PDF.js/react-pdf dependencies).
- **AI Chat Interface**: Ask questions about your PDFs and get AI-powered answers (backend integration pending).
- **Modern UI**: Responsive, two-column dashboard with Tailwind CSS.
- **Robust Backend**: Prisma ORM with a singleton pattern for efficient DB access.

---

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env` and fill in your database and NextAuth secrets.

3. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Sign in and use the dashboard:**
   - Upload PDFs, view them, and chat (AI Q&A coming soon).

---

## Project Structure

- `src/app/dashboard/` — Main dashboard UI, PDF viewer, chat interface
- `src/app/api/` — API routes for auth, PDF upload, listing, (AI chat coming soon)
- `src/lib/prisma.ts` — PrismaClient singleton
- `prisma/schema.prisma` — Database schema
- `public/uploads/` — Uploaded PDF files

---

## Tech Stack

- **Next.js** (App Router)
- **TypeScript**
- **Prisma** ORM
- **NextAuth** (authentication)
- **Tailwind CSS**

---

## Roadmap

- [x] PDF upload, listing, and viewing
- [x] User authentication
- [x] Responsive dashboard UI
- [x] Chat UI scaffold
- [ ] AI backend integration (PDF text extraction, OpenAI/LLM Q&A)
- [ ] Persist chat history per user/PDF
- [ ] Advanced PDF analysis tools

---

## Contributing

PRs and issues welcome! Please open an issue to discuss major changes first.

---

## License

MIT
