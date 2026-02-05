# Deploying to Render.com

This guide walks you through deploying the Absence.io middleware to Render.com's free tier.

## Prerequisites

1. A [Render.com](https://render.com) account (free)
2. A [GitHub](https://github.com) account (to host your code)
3. Your Absence.io API credentials

---

## Step 1: Push Code to GitHub

### Create a new GitHub repository

1. Go to https://github.com/new
2. Name it `absence-io-powerbi` (or any name)
3. Keep it **Private** (recommended for security)
4. Click **Create repository**

### Push your code

Open Terminal and run:

```bash
cd "/Users/bilal/Documents/Local Test API v2"

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Absence.io Power BI Middleware"

# Add your GitHub repo as remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/absence-io-powerbi.git

# Push
git push -u origin main
```

---

## Step 2: Deploy on Render.com

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub account if not already connected
4. Select your `absence-io-powerbi` repository
5. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `absence-io-middleware` |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

6. Click **Advanced** and add **Environment Variables**:

| Key | Value |
|-----|-------|
| `ABSENCE_API_ID` | Your Absence.io API Key ID |
| `ABSENCE_API_KEY` | Your Absence.io API Key Secret |
| `PORT` | `10000` |
| `DEFAULT_WEEKLY_HOURS` | `40` |

7. Click **Create Web Service**

---

## Step 3: Wait for Deployment

Render will:
1. Clone your repository
2. Run `npm install`
3. Start the server

This takes 2-5 minutes. You'll see logs in the Render dashboard.

---

## Step 4: Get Your URL

Once deployed, Render assigns a URL like:
```
https://absence-io-middleware.onrender.com
```

Test it by opening:
```
https://absence-io-middleware.onrender.com/health
```

You should see:
```json
{"status":"ok","timestamp":"...","version":"1.0.0"}
```

---

## Step 5: Connect Power BI Web

1. Go to https://app.powerbi.com
2. Click **Get Data** in a workspace
3. Choose **Web** as the data source
4. Enter URL:
   ```
   https://absence-io-middleware.onrender.com/api/monthly-summary?year=2026&month=1
   ```
5. Authentication: **Anonymous**
6. Transform and load the data

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

### "API Error (401)"
Your Absence.io credentials are wrong. Check the environment variables in Render dashboard.

### "Cannot connect" in Power BI
1. Verify the URL is correct
2. Check that the Render service is running (green status in dashboard)
3. Try the `/health` endpoint first
