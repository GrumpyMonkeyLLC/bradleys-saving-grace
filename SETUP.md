# Bradley's Saving Grace — Complete Setup Guide

This guide walks you through getting the website live from zero to launch. No coding experience needed!

---

## 📁 Project Structure

```
bradleys-saving-grace/
├── src/                        ← All website pages
│   ├── index.html              ← Homepage
│   ├── listings.html           ← Lost dog listings
│   ├── report.html             ← Report a lost dog form
│   ├── contact.html            ← Contact form
│   ├── admin.html              ← Admin panel
│   ├── styles/
│   │   └── main.css            ← All shared styles
│   └── components/
│       └── layout.js           ← Shared nav + footer
├── api/                        ← Backend (Azure Functions)
│   ├── lost-dogs/index.js      ← Lost dog CRUD API
│   ├── contact/index.js        ← Contact form API
│   ├── subscribe/index.js      ← Newsletter API
│   └── package.json
├── public/
│   └── images/                 ← ⬅ PUT YOUR IMAGES HERE
├── staticwebapp.config.json    ← Azure routing config
├── .github/workflows/          ← Auto-deploy to Azure
│   └── azure-static-web-apps.yml
├── vite.config.js
└── package.json
```

---

## 🖼️ HOW TO ADD IMAGES

### Adding Bradley's Photo

1. Find the photo you want to use (JPG or PNG works best)
2. Rename it to `bradley.jpg`
3. Copy it into the `public/images/` folder
4. Open `src/index.html` and find this comment:
   ```html
   <!-- SWAP THIS: replace the placeholder div with an <img> tag when you have Bradley's photo -->
   ```
5. Replace the `<div class="story__img-placeholder">...</div>` with:
   ```html
   <img src="/images/bradley.jpg" alt="Bradley" class="story__img">
   ```
6. Do the same in the memorial section — find `memorial__photo-placeholder` and replace with:
   ```html
   <img src="/images/bradley.jpg" alt="Bradley" class="memorial__photo">
   ```

### Adding a Logo / Favicon

1. Create or find a small square image (PNG, at least 64×64 px)
2. Name it `favicon.png`
3. Place it in `public/images/favicon.png`
4. It will automatically appear as the browser tab icon

### Photo Tips
- **Best size**: 800×1000 px for the story photo, 400×400 for the memorial circle
- **File types**: JPG, PNG, or WEBP all work
- **File size**: Try to keep under 500KB for fast loading
  - Free tool to compress: https://squoosh.app

---

## 🚀 STEP 1 — Put the Code on GitHub

1. **Create a GitHub account** at https://github.com (free)
2. Click the **+** icon → "New repository"
3. Name it `bradleys-saving-grace`
4. Keep it "Public" (required for free Azure hosting)
5. Click "Create repository"
6. On your computer, install **GitHub Desktop**: https://desktop.github.com
7. In GitHub Desktop: File → Add Local Repository → point to this folder
8. Click "Publish repository" → publish to GitHub

---

## ☁️ STEP 2 — Create Azure Storage (the database)

Your database stores dog reports, messages, and subscribers.

1. Go to https://portal.azure.com (create a free account if needed)
2. Search for **"Storage accounts"** → click "+ Create"
3. Fill in:
   - **Resource group**: Create new → name it `bradleys-saving-grace`
   - **Storage account name**: `bradleyssavinggrace` (all lowercase, no spaces)
   - **Region**: East US (or closest to you)
   - **Performance**: Standard
   - **Redundancy**: LRS (cheapest option)
4. Click "Review + Create" → "Create"
5. Once created, go to the storage account → **"Access keys"** (left sidebar)
6. Copy:
   - **Storage account name** (shown at top)
   - **key1** → click "Show" → copy the key
7. Save these — you'll need them in Step 4!

---

## ⚡ STEP 3 — Create Azure Static Web App

1. In Azure Portal, search **"Static Web Apps"** → "+ Create"
2. Fill in:
   - **Resource group**: `bradleys-saving-grace` (same one)
   - **Name**: `bradleys-saving-grace`
   - **Plan type**: Free
   - **Region**: East US 2
   - **Source**: GitHub
3. Click **"Sign in with GitHub"** and authorize Azure
4. Select:
   - **Organization**: your GitHub username
   - **Repository**: `bradleys-saving-grace`
   - **Branch**: `main`
5. **Build Details**:
   - **Build Preset**: Custom
   - **App location**: `/`
   - **Api location**: `api`
   - **Output location**: `dist`
6. Click "Review + Create" → "Create"
7. Azure will add a deploy key to your GitHub repo automatically!

---

## 🔑 STEP 4 — Add Environment Variables (the secret keys)

1. In Azure Portal, go to your Static Web App
2. Click **"Configuration"** in the left sidebar
3. Click **"+ Add"** for each of these:

   | Name | Value |
   |------|-------|
   | `AZURE_STORAGE_ACCOUNT_NAME` | your storage account name from Step 2 |
   | `AZURE_STORAGE_ACCOUNT_KEY` | your key1 from Step 2 |

4. Click **"Save"**

---

## 📧 STEP 5 — Set Up Email Notifications (Optional but Recommended)

When someone submits a lost dog report or contact form, you'll want an email.

### Option A: SendGrid (free up to 100 emails/day)
1. Sign up at https://sendgrid.com (free)
2. Create an API key under Settings → API Keys
3. Add to Azure Configuration:
   - `SENDGRID_API_KEY` = your key
   - `NOTIFY_EMAIL` = your email address
4. In `api/lost-dogs/index.js`, uncomment the TODO email section and add:
   ```javascript
   const sgMail = require('@sendgrid/mail')
   sgMail.setApiKey(process.env.SENDGRID_API_KEY)
   await sgMail.send({
     to: process.env.NOTIFY_EMAIL,
     from: 'noreply@bradleyssavinggrace.org',
     subject: `New Lost Dog Report: ${body.dogName}`,
     text: `A new report was submitted for ${body.dogName} in ${body.city}, ${body.state}. Owner: ${body.ownerName} · ${body.phone}`
   })
   ```
5. In `api/` folder: `npm install @sendgrid/mail`

### Option B: Use your own email for now
Just check the admin panel regularly at `your-site.azurestaticapps.net/admin.html`

---

## 🔐 STEP 6 — Secure the Admin Panel

Right now the admin panel is open. To protect it:

1. In your Static Web App in Azure Portal, click **"Role management"**
2. Click **"Invite"**
3. Enter your email, set role to `admin`
4. You'll receive an email — accept the invite
5. Now only you can access `/admin`

The `staticwebapp.config.json` already has the admin route protected. ✓

---

## 🌐 STEP 7 — Custom Domain (Optional)

To use `www.bradleyssavinggrace.org` instead of the Azure URL:

1. Buy a domain at Namecheap or Google Domains (~$12/year)
2. In Azure → Static Web App → **"Custom domains"** → "+ Add"
3. Follow the instructions to add a CNAME record at your domain registrar
4. Takes 10–30 minutes to go live

---

## ✅ DEPLOY — Push Your Changes

Every time you make a change:

1. In GitHub Desktop, you'll see changed files
2. Write a short description (e.g. "Added Bradley's photo")
3. Click **"Commit to main"**
4. Click **"Push origin"**
5. Azure automatically rebuilds and deploys in ~2 minutes!

Check your GitHub repo → "Actions" tab to watch the deploy progress.

---

## 🐕 Day-to-Day Admin Tasks

**Review new reports:** Go to `your-site.azurestaticapps.net/admin.html`
- View dog reports → mark as Found when reunited
- Check contact messages → reply via email
- See subscriber count

**Updating content:**
- Open any HTML file in a text editor (Notepad works!)
- Make your changes
- Save and push via GitHub Desktop

**Adding content (text, photos, etc.):**
- All pages are in `src/`
- Images go in `public/images/`
- Push to GitHub to deploy

---

## ❓ Common Questions

**Q: How do I update the Facebook link?**
Open `src/components/layout.js` and find `BradleysSavingGrace` — update the URL.

**Q: How do I change the email address shown on the site?**
Search for `bradleyssavinggrace.org` across all HTML files and replace with your real email.

**Q: My deploy failed — what do I do?**
Go to GitHub → your repo → "Actions" tab → click the failed run → read the error message. Most common cause: missing a file or syntax error.

**Q: How do I see how many people visited the site?**
In Azure Portal → Static Web App → there's no built-in analytics. Add Microsoft Clarity (free): https://clarity.microsoft.com — just add one line of code to each HTML page.

---

## 💙 You've Got This

This site is built with love for Bradley and for every dog still waiting to come home.
If you get stuck, the community at r/azure and r/webdev is very helpful.

*Working steadily to help others. 🐾*
