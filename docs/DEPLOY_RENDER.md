# Deploying to Render.com

This guide walks you through deploying the Workforce Analytics API to Render.com's free tier.

## Prerequisites

1. A [Render.com](https://render.com) account (free)
2. A [GitHub](https://github.com) account (to host your code)
3. Your Absence.io API credentials
4. (Optional) Your Toggl Track API token and workspace ID

---

## Step 1: Push Code to GitHub

### Create a new GitHub repository

1. Go to https://github.com/new
2. Name it `absence-io-powerbi` (or any name)
3. Keep it **Private** (recommended for security)
4. Click **Create repository**

### Push your code

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/absence-io-powerbi.git
git push -u origin main
```

---

## Step 2: Deploy on Render.com

1. Go to https://dashboard.render.com
2. Click **New +** > **Web Service**
3. Connect your GitHub account if not already connected
4. Select your repository
5. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `workforce-analytics-api` |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

6. Click **Advanced** and add **Environment Variables**:

| Key | Value | Required |
|-----|-------|----------|
| `ABSENCE_API_ID` | Your Absence.io API Key ID | Yes |
| `ABSENCE_API_KEY` | Your Absence.io API Key Secret | Yes |
| `API_KEY` | A random secret key for endpoint auth | Recommended |
| `PORT` | `10000` | Yes |
| `DEFAULT_WEEKLY_HOURS` | `40` | No |
| `TOGGL_API_TOKEN` | Your Toggl API token | No |
| `TOGGL_WORKSPACE_ID` | Your Toggl workspace ID | No |

To generate a secure API key:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

7. Click **Create Web Service**

---

## Step 3: Wait for Deployment

Render will:
1. Clone your repository
2. Run `npm install`
3. Start the server

This takes 2-5 minutes. You'll see logs in the Render dashboard.

---

## Step 4: Verify

Once deployed, Render assigns a URL like:
```
https://workforce-analytics-api.onrender.com
```

Test the health endpoint:
```
https://workforce-analytics-api.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "version": "2.0.0",
  "integrations": {
    "absenceIo": true,
    "toggl": true
  }
}
```

If Toggl env vars are not set, `toggl` will show `false`.

---

## Step 5: Connect Power BI

1. Go to https://app.powerbi.com
2. Click **Get Data** > **Web**
3. Enter URL:
   ```
   https://workforce-analytics-api.onrender.com/api/powerbi/annual-summary?fromYear=2024&toYear=2026&key=YOUR_API_KEY
   ```
4. Authentication: **Anonymous** (the API key is in the URL)
5. The response is a flat JSON array — Power BI will auto-detect columns

For Power Query M code templates, see [powerbi/queries.pq](../powerbi/queries.pq).

---

## Adding Toggl Later

If you want to enable Toggl Track integration after initial deployment:

1. Go to your Render dashboard > your service > **Environment**
2. Add `TOGGL_API_TOKEN` and `TOGGL_WORKSPACE_ID`
3. Click **Save Changes** — Render will redeploy automatically
4. Verify with: `https://YOUR-APP.onrender.com/api/debug/toggl-status?key=YOUR_KEY`

---

## Important Notes

### Free Tier Limitations

- **Spin-down**: Free services spin down after 15 minutes of inactivity
- **First request after spin-down**: Takes 30-60 seconds to "wake up"
- **750 hours/month**: Free tier limit (enough for one always-on service)

### For Production Use

Consider upgrading to Render's **Starter** plan ($7/month) for:
- No spin-down
- More reliable performance
- Custom domains

---

## Troubleshooting

### "Service is starting..."
Wait 30-60 seconds, the free tier spins down when idle.

### "Unauthorized"
Your API key is missing or wrong. Check the `API_KEY` env var and ensure you're passing `?key=YOUR_KEY`.

### "API Error (401)"
Your Absence.io credentials are wrong. Check `ABSENCE_API_ID` and `ABSENCE_API_KEY` in Render dashboard.

### "Toggl Reports circuit breaker open"
Toggl API quota is temporarily exhausted. It will auto-retry after 15 minutes.

### "Cannot connect" in Power BI
1. Verify the URL is correct
2. Check that the Render service is running (green status in dashboard)
3. Try the `/health` endpoint first
