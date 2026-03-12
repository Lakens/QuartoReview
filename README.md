# Resolve — WYSIWYG Quarto Markdown Editor

Resolve is a browser-based editor for `.qmd` (Quarto Markdown) files stored on GitHub. It lets you write, edit, and run R code chunks in the browser — no local R installation needed — and saves everything back to your GitHub repository.

---

## What it does

- Edit `.qmd` files with a rich WYSIWYG interface (headings, bold, italic, tables, math)
- Run R code chunks directly in the browser using WebAssembly (no local R required)
- Load and save files to any GitHub repository you have access to
- Inline comments, track changes, and citation management
- Share documents by inviting collaborators to your GitHub repo

---

## Quick start

| Step | Windows | Mac |
|------|---------|-----|
| 1. Install Node.js | Download from https://nodejs.org (LTS version) | Same |
| 2. Get the code | Download ZIP from GitHub, extract it | Same |
| 3. Install dependencies | Double-click `install.bat` | Run `./install.sh` in Terminal |
| 4. Create `.env` file | See [GitHub OAuth setup](#step-3--create-a-github-oauth-app) below | Same |
| 5. Launch the app | Double-click `start.bat` | Run `./start.sh` in Terminal |

---

## Prerequisites

### 1. Node.js

Download and install Node.js **version 18 or later** from https://nodejs.org
Choose the **LTS** version. Accept all defaults during installation.

### 2. A GitHub account

You need a GitHub account to use Resolve. Sign up at https://github.com if you don't have one.

---

## Installation

### Step 1 — Get the code

**Option A — Download ZIP** (easiest, no git required):
1. Go to https://github.com/Lakens/resolve
2. Click the green **"Code"** button → **"Download ZIP"**
3. Extract the ZIP somewhere on your computer (e.g. your Desktop or Documents folder)

**Option B — Clone with git** (if you have git installed):
```bash
git clone https://github.com/Lakens/resolve.git
```

### Step 2 — Install dependencies

This only needs to be done once. It downloads all the packages the app needs.

**Windows:** Double-click `install.bat` in the resolve folder.
**Mac:** Open Terminal, drag the `install.sh` file into it, press Enter. If you get a "permission denied" error, first run:
```bash
chmod +x install.sh
./install.sh
```

The script checks that Node.js is installed and then runs `npm install` in both the `backend` and `frontend` folders automatically. It will tell you when it's done and what to do next.

> **What is npm install?** npm is Node's package manager — it downloads the libraries the app depends on into a `node_modules` folder. This is like installing R packages, but for JavaScript.

### Step 3 — Create a GitHub OAuth App

Resolve uses GitHub OAuth so it can read and write your repositories on your behalf. You need to register it as an "OAuth App" in your GitHub account.

1. Go to https://github.com/settings/developers
2. Click **"OAuth Apps"** in the left sidebar
3. Click **"New OAuth App"**
4. Fill in the form:
   - **Application name**: `Resolve (local)` (or anything you like)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:3001/api/auth/callback`
5. Click **"Register application"**
6. On the next page, note down your **Client ID**
7. Click **"Generate a new client secret"** and note down the **Client Secret** (you only see it once)

### Step 4 — Create the backend environment file

In the `backend/` folder, create a file named `.env` (no extension, just `.env`):

```
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://localhost:3001/api/auth/callback
SESSION_SECRET=any_long_random_string_you_make_up
NODE_ENV=development
```

Replace `your_client_id_here` and `your_client_secret_here` with the values from Step 3.
For `SESSION_SECRET`, type any long random string — for example: `mySecretKey12345abcdef`.

**The `.env` file is never committed to git** (it's in `.gitignore`) so your secrets stay local.

---

## Running the app

### Windows — double-click `start.bat`

From the root of the repository, double-click `start.bat`. It will:
1. Stop anything already running on ports 3001 and 5173
2. Open a window for the backend server
3. Open a window for the frontend
4. Open your browser to `http://localhost:5173` after 5 seconds

### Mac — run `start.sh`

The first time, make it executable:
```bash
chmod +x start.sh
```

Then run it:
```bash
./start.sh
```

Or double-click it in Finder (right-click → Open).

### Manual start (any platform)

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd backend
npm start
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```

Then open your browser to `http://localhost:5173`.

---

## First login

1. Open `http://localhost:5173` in your browser
2. Click **"Login with GitHub"**
3. GitHub will ask you to authorize the app — click **"Authorize"**
4. You will be redirected back to Resolve and logged in
5. Select a repository from the dropdown, then select a `.qmd` file to open it

---

## Running R code

R runs entirely in your browser via WebAssembly — no local R installation is needed.

- Click the **R** toolbar button to insert a new code chunk
- Type R code in the chunk
- Click the **Run** button (▶) on the chunk
- The first run takes 10–30 seconds while R boots (subsequent runs are instant)
- Output appears below the chunk

**Note:** Only base R is available by default. Packages like `tidyverse` cannot be installed in the browser version.

---

## Project structure

```
resolve/
├── backend/              # Express.js API server (port 3001)
│   ├── api/              # API routes (auth, files, bibliography, etc.)
│   ├── middleware/        # Security middleware
│   └── .env              # Your secrets (create this — not in git)
├── frontend/             # React + Vite app (port 5173)
│   ├── src/
│   │   ├── cells/        # Code cell, markdown cell, raw cell
│   │   ├── components/   # Editor, toolbar, comments, citations
│   │   └── utils/        # API helpers, GitHub utils, WebR singleton
│   └── public/           # Static files (WebR worker scripts)
├── install.bat           # Windows: first-time dependency install
├── install.sh            # Mac/Linux: first-time dependency install
├── start.bat             # Windows: launch backend + frontend
├── start.sh              # Mac/Linux: launch backend + frontend
└── README.md
```

---

## Troubleshooting

**"Login with GitHub" does nothing or shows an error**
→ Check that `backend/.env` exists and the `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` values match your OAuth App exactly. Restart the backend after editing `.env`.

**The app opens but I can't see any repositories**
→ Make sure you are logged in (top right). Your repositories should appear in the dropdown. If you just created your GitHub account, you may need to create a repository first.

**R chunks show "Starting R…" and never finish**
→ Wait up to 60 seconds on first use. If it still hangs, open the browser DevTools (F12 → Console) and look for `[WebR]` log lines and share any errors.

**Port already in use**
→ Run `start.bat` (or `start.sh`) again — it kills anything on ports 3001 and 5173 before starting.

---

## License

Elastic License v2 (ELv2) — see [LICENSE.md](LICENSE.md).
