# GeoVISTA Backend — Node.js

The original FastAPI/Python backend has been migrated to **Node.js + Express**. The frontend can keep using the same `/api/...` endpoints.

## Run

```powershell
cd backend
npm install
npm run dev
```

Server: `http://localhost:8000`
Health: `http://localhost:8000/health`

> JSX is a frontend React syntax. Backend files should use `.js`; this migration intentionally uses JavaScript, not JSX.
