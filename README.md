# Catur Online Fullstack

Implementasi runnable berbasis PRD Catur Online Fullstack v1.0. Stack utama: React + Vite + TypeScript, Fastify + Socket.IO, Prisma + PostgreSQL, chess.js.

## Fitur MVP
- Register/login/logout dengan JWT HttpOnly cookie.
- Board catur legal move server-authoritative, termasuk castling, en passant, promotion, check/checkmate/stalemate.
- Quick matchmaking berbasis queue FIFO + time control.
- Realtime move sync via Socket.IO + reconnect/resync snapshot.
- Clock server-side.
- Resign, draw offer/response, rematch dasar.
- Bot 5 level dengan adapter sederhana berbasis legal-move selection.
- History + replay data, leaderboard Elo sederhana.
- Admin dashboard minimum dan RBAC.
- Docker PostgreSQL + Redis untuk local development.
- Unit test inti chess service.

## Menjalankan
1. `cp .env.example .env`
2. `docker compose up -d`
3. `npm install`
4. `npm run db:generate`
5. `npm run db:migrate`
6. `npm run db:seed`
7. `npm run dev`

Web: http://localhost:5173
API: http://localhost:4000/health

## Demo akun seed
- admin@example.com / Admin123!
- demo@example.com / Demo123!

Jangan gunakan password seed untuk produksi.

## Catatan implementasi
- Backend adalah sumber kebenaran untuk legal move, turn, result, clock, rating, dan history.
- Prisma schema mengikuti entitas inti PRD.
- Redis disiapkan sebagai dependency untuk scaling queue/cache; MVP queue berjalan in-memory agar local setup sederhana.
- Untuk production, pindahkan matchmaking ke Redis/worker dan bot ke process pool/worker.

## Admin Dashboard

Admin tersedia pada route `/admin` dan hanya dapat diakses oleh role `ADMIN` atau `SUPER_ADMIN` melalui RBAC backend.

Fitur dashboard:
- Overview: active games, matchmaking queue, user count, finished games hari ini, suspended/banned users, open reports.
- Users: search username/email, melihat role/status/rating, activate/suspend/ban dengan alasan.
- Games: daftar dan status pertandingan untuk inspeksi operasional.
- Matchmaking: antrean pencarian lawan aktif.
- Reports: daftar laporan dan status.
- Audit Logs: jejak tindakan admin.

Akun seed admin:
- Email: `admin@example.com`
- Password: `Admin123!`

API admin berada di `/api/v1/admin/*`. Semua endpoint admin memakai middleware auth + RBAC di backend, bukan sekadar proteksi UI.

Catatan: `recentErrors`/`errorRate` pada dashboard masih berupa placeholder karena PRD belum mendefinisikan model persistence untuk telemetry error. Implementasi lanjutan dapat menambahkan tabel/event sink untuk observability penuh.
