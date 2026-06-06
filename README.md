# Baylight After Image — Deploy Guide

This folder is your **deploy-ready website**. It contains:

```
deploy/
├── index.html          ← the website
├── README.md           ← this guide
└── assets/
    ├── cover.jpg
    ├── scanner.jpg
    ├── city.jpg
    └── audiobook-ch1.mp3
```

The heavy microdrama video is **not** bundled here — it streams from YouTube instead, which keeps the site fast. Total folder size is ~44 MB (just the audiobook sample + images).

Goal: get this live at **https://baylight.city**.

---

## Step 1 — Put the microdrama on YouTube

1. Go to youtube.com, sign in, click the **camera-with-+ icon → Upload video**.
2. Upload `Episode 1 - Clean Signatures.mp4` (it's in your
   `June 1/Episode 1 - Courtesy Reminder/` folder, **not** in this deploy folder).
3. Set visibility to **Public** (or **Unlisted** if you only want people with the link to see it — it will still embed on your site either way).
4. When it's published, open the video and copy its ID:
   - From a link like `https://youtu.be/dQw4w9WgXcQ` → the ID is `dQw4w9WgXcQ`
   - From `https://www.youtube.com/watch?v=dQw4w9WgXcQ` → the ID is the part after `v=`

## Step 2 — Drop the video ID into the page

1. Open `index.html` in any text editor (or ask me to do it).
2. Find this line near the "Microdrama" section:

   ```html
   src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
   ```

3. Replace `YOUR_VIDEO_ID` with your actual ID, e.g.:

   ```html
   src="https://www.youtube.com/embed/dQw4w9WgXcQ"
   ```

4. Save. Open `index.html` in your browser to confirm the video plays.

> Tip: just tell me the YouTube link and I'll paste the ID in for you.

---

## Step 3 — Deploy to Cloudflare Pages (free)

Cloudflare Pages hosts static sites for free, fast worldwide, with HTTPS included and no bandwidth caps.

1. Create a free account at **dash.cloudflare.com** (use your james@portman.ca email).
2. In the left menu choose **Workers & Pages → Create → Pages → Upload assets**
   (this is the "Direct Upload" option — no GitHub or coding required).
3. Name the project `baylight` (or anything — it becomes a temporary
   `baylight.pages.dev` address).
4. **Drag this entire `deploy` folder** into the upload box, then click **Deploy site**.
5. After ~30 seconds your site is live at `https://baylight.pages.dev`. Check it works.

---

## Step 4 — Point baylight.city at it

You bought the domain at Spaceship; now you connect it to Cloudflare. The simplest
route is to let Cloudflare manage the domain's DNS:

**A. Add the domain to Cloudflare**
1. In Cloudflare dashboard: **Add a site** → type `baylight.city` → choose the **Free** plan.
2. Cloudflare shows you **two nameservers** (something like `xxx.ns.cloudflare.com`).
   Copy both.

**B. Update nameservers at Spaceship**
1. Log in at spaceship.com → **Manage** your `baylight.city` domain.
2. Find **Nameservers** (sometimes under "DNS" or "Advanced DNS").
3. Switch from Spaceship's default nameservers to **Custom nameservers** and paste in
   the two Cloudflare nameservers. Save.
4. Nameserver changes can take anywhere from a few minutes to ~24 hours to take effect.

**C. Attach the domain to your Pages site**
1. Back in Cloudflare: **Workers & Pages → your `baylight` project → Custom domains →
   Set up a custom domain.**
2. Enter `baylight.city` and follow the prompt — Cloudflare adds the needed DNS record
   automatically since it now manages the domain.
3. (Optional) Repeat for `www.baylight.city` so both work.

Once DNS propagates, **https://baylight.city** shows your site, with a free SSL
certificate auto-provisioned by Cloudflare. Done.

---

## Updating the site later

Made changes to `index.html`? Just redeploy: in your Pages project click
**Create deployment / Upload**, drag the `deploy` folder again, and the new version
goes live. The domain stays attached.

## Things still to wire up (optional)

- **Buy / Read link** — the "Buy / Read" button currently points to `#`. Replace it
  with your Amazon / store URL once the book is listed.
- **Mailing list** — the signup form currently just shows an on-screen confirmation.
  To actually collect emails, connect it to a provider (Mailchimp, ConvertKit, Buttondown).
  Tell me which one and I'll wire the form to it.
- **Audiobook** — Chapter 1 streams from the bundled `audiobook-ch1.mp3`. If you'd
  rather host it on Spotify/SoundCloud, I can swap in an embed.
