# HolyLoy Developments Ltd. website

    npm install
    npm start          # http://localhost:3000   (npm run dev = auto-reload)

- `.env` holds `MONGODB_URI`, `DB_NAME`, `PORT`, `ADMIN_KEY` (never commit it; it is git-ignored).
- Collections (db `holyloy`): `demo_requests`, `investors` (scrypt-hashed passwords), `sessions` (auto-expire after 7 days).
- Admin view of leads/investors: http://localhost:3000/admin.html (enter `ADMIN_KEY`).
- Sandbox login: demo@holyloydev.com / HolyLoyDemo@2026

## Team collaboration

Each team member needs GitHub write access to this repository. Clone it, then create and publish a branch for each change:

```sh
git clone https://github.com/shoronikaTanzila/developer_holyloy.git
cd developer_holyloy
git switch -c feature/your-change
git push -u origin feature/your-change
```

Before starting new work, update `main` and branch from it:

```sh
git switch main
git pull --ff-only
git switch -c feature/your-next-change
```

Open a pull request from the feature branch into `main` so both team members can review changes before they are merged.
