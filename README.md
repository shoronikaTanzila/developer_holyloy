# HolyLoy Developments Ltd. website

    npm install
    npm start          # http://localhost:3000   (npm run dev = auto-reload)

- `.env` holds `MONGODB_URI`, `DB_NAME`, `PORT`, `ADMIN_KEY` (never commit it; it is git-ignored).
- Collections (db `holyloy`): `demo_requests`, `investors` (scrypt-hashed passwords), `sessions` (auto-expire after 7 days).
- Admin view of leads/investors: http://localhost:3000/admin.html (enter `ADMIN_KEY`).
- Sandbox login: demo@holyloydev.com / HolyLoyDemo@2026
