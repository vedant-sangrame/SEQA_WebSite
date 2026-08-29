# 🚀 SprintSync - Team Collaboration & Sprint Retrospective Board

SprintSync is a modern, real-time team collaboration application for Agile teams to log **What Went Well**, **What Didn't**, track cross-sprint **Action Items**, invite team members via email, and deploy live on **Render.com**.

![SprintSync Preview](https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/rocket.svg)

---

## ✨ Key Features

- 💚 **What Went Well**: Log wins, praise, and key successes with upvoting and tag filters.
- 🔴 **What Didn't Go Well**: Surface blockers, friction points, and convert retro feedback directly into Action Items.
- 🚀 **Action Items Tracker**: Track actionable tasks across sprints with assignees, priority levels, and live status progress (*To Do*, *In Progress*, *Done*).
- 📧 **Email Team Invitations**: Built-in Nodemailer integration to send custom HTML email invites to team members, with an interactive preview modal.
- ⚡ **Real-Time Synchronization**: Powered by Socket.io for instant card additions, upvotes, and status updates across all connected teammates.
- 📊 **Sprint Management**: Switch between active sprints, create new sprints, and track historical retrospectives.
- 📑 **Retrospective Summary Export**: Export sprint summaries in clean Markdown format for Slack, Notion, or Confluence.
- 🌙 **Modern Design**: Dark & light theme support, glassmorphic UI, responsive layouts, micro-animations, and confetti celebrations.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, Canvas Confetti, CSS Modern Tokens & Glassmorphism.
- **Backend**: Node.js, Express, Socket.io, Nodemailer.
- **Database**: SQLite3 (`better-sqlite3`) for zero-config persistence.
- **Deployment**: Pre-configured for **Render.com** (with `render.yaml` Blueprint and `/api/health` monitoring).

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Mode
Run both frontend and backend concurrently:
```bash
# Terminal 1: Start Node.js Express & Socket.io backend
npm run server

# Terminal 2: Start Vite React client
npm run dev
```
Open your browser at [http://localhost:3000](http://localhost:3000).

---

## 🌐 Deploying Live on Render.com

Deploying SprintSync live on Render is quick and easy!

### Method A: Blueprint Deployment (Recommended)

1. Push this project code to your **GitHub** or **GitLab** account.
2. Sign in to your **[Render Dashboard](https://dashboard.render.com)**.
3. Click **New +** and select **Blueprint**.
4. Connect your repository. Render will automatically detect `render.yaml` and configure the Web Service with the correct build and start commands.
5. Click **Apply**. Your app will be built and deployed live!

### Method B: Manual Web Service Setup

1. On the **Render Dashboard**, click **New +** &rarr; **Web Service**.
2. Connect your repository.
3. Configure the following settings:
   - **Name**: `sprint-retro-board`
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Under **Environment Variables** (required for email invitations):
   - `SITE_URL` = `https://your-app-name.onrender.com`
   - `RESEND_API_KEY` = an API key created in [Resend](https://resend.com/api-keys)
   - `RESEND_FROM` = a verified sender, e.g. `SprintSync <hello@yourdomain.com>`

   Resend is the recommended provider because it sends through HTTPS (port 443). Render's free web services block SMTP ports 25, 465, and 587, so Gmail SMTP will time out on the free plan. For local development or a paid Render instance, the legacy `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optional `SMTP_FROM` variables are still supported.

   For a no-domain college-project setup, the app also supports Brevo's HTTPS API. Add `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (a sender verified in Brevo), and optional `BREVO_SENDER_NAME`. When configured, Brevo is used before Resend.
5. Click **Create Web Service**. Your live URL will be active in minutes!

---

## 🧪 API Endpoints

- `GET /api/health` - Render health check status endpoint
- `GET /api/sprints` - List all sprints
- `POST /api/sprints` - Create a new sprint
- `GET /api/retro-items?sprint_id=:id` - Fetch retro cards
- `POST /api/retro-items` - Add a retro card
- `POST /api/retro-items/:id/upvote` - Upvote a retro card
- `GET /api/action-items?sprint_id=:id` - Fetch action items
- `POST /api/action-items` - Create an action item
- `PATCH /api/action-items/:id` - Update action item status
- `POST /api/invite` - Send team email invite & generate invite token
