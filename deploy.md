# Hostinger Deployment Guide for CoreLMS

This guide will help you deploy your CoreLMS application to Hostinger.

## Prerequisites
- Hostinger **VPS Hosting** or **Node.js Hosting** plan.
- SSH access to your Hostinger server.

## Step 1: Build the Application
On your local machine, run the following command to build both the frontend and the backend:
```bash
npm run build
```
This will create a `dist` folder containing:
- `dist/index.html` and assets (Frontend)
- `dist/server.js` (Compiled Backend)

## Step 2: Upload Files to Hostinger
Using the Hostinger File Manager or FTP (like FileZilla), upload the following files/folders to your domain's root directory (e.g., `public_html` or a custom folder):
- `dist/` (The entire folder)
- `package.json`
- `database.sqlite` (Optional: upload if you have existing data)
- `.env` (Create this on the server with your secrets)

## Step 3: Configure Environment Variables
Create a `.env` file in your project root on Hostinger and add:
```env
NODE_ENV=production
JWT_SECRET=your_very_long_random_secret_key
STRIPE_SECRET_KEY=your_stripe_secret_key (Optional)
PORT=3000
```

## Step 4: Install Dependencies
Connect to your server via SSH and navigate to your project folder. Run:
```bash
npm install --production
```

## Step 5: Start the Application with PM2
PM2 ensures your app stays running even if the server restarts.
```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Start the app
pm2 start dist/server.js --name core-lms

# Save the PM2 process list
pm2 save

# Ensure PM2 starts on boot
pm2 startup
```

## Step 6: Database (SQLite)
Your database is stored in `database.sqlite`. Make sure the folder has write permissions so the app can update the database.

## Step 7: Access Your App
Your app should now be live at your domain! If you are using a custom port like 3000, you might need to set up a **Reverse Proxy** in your Hostinger panel to point your domain to `http://localhost:3000`.

---
**Note:** If you encounter a "fetch" error in the browser, it has been addressed with a debug script in `index.html` that prevents unauthorized overwriting of the global fetch API.
