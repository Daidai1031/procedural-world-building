# Firebase Setup (Beginner)

> For World Building Guidebook: add accounts and cross-device saves with Firebase
> Authentication and Firestore, and deploy with Firebase Hosting.

## What You Will Learn

- What each Firebase product does and which one the app uses it for
- How to create a Firebase project and register a web app
- How to enable Authentication, Firestore, and Hosting
- How the app's "save and load a configuration" feature is wired to your account
- How to deploy the site to Firebase Hosting

## Prerequisites

| Skill | Required? | Notes |
|-------|-----------|-------|
| A Google account | Required | Firebase projects live under one |
| The project already running locally | Required | `npm install && npm run dev` in `worldbuilding-guidebook/` |
| Command line basics | Recommended | You will run a handful of `npm` and `firebase` commands |

---

## 1. What Firebase Is Doing Here

This app uses three Firebase products:

| Product | What it does | What we use it for |
|---|---|---|
| **Authentication** | Manages who is signed in | Email/password sign-in, so a configuration belongs to a person |
| **Firestore** | A document database | One document per user holding their *current* configuration |
| **Hosting** | Serves the built site | Where the app itself is deployed |

**Storage is deliberately not used.** Firebase Storage now requires the
**Blaze** (pay-as-you-go) plan — Authentication and Firestore stay on the
free **Spark** plan. Rather than ask you to attach a credit card for a course
project, the save/load feature is Firestore-only: one document per user is
enough to hold "the current configuration," which is the whole feature. If
you later want a backup history of every save (not just the latest), that
needs Storage and Blaze — it is not built here.

> **Note on this being built now:** the app's spec originally deferred accounts
> until every lesson was written (see `worldbuilding-guidebook/spec/SPEC.md` §1
> and `spec/roadmap.md`). That was changed on request — see the dated note in
> both files for why Firebase, not the originally-planned Supabase, is what is
> wired up, and why it landed ahead of that schedule.

---

## 2. Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com) and sign in.
2. **Add project** → name it (for example `worldbuilding-guidebook`).
3. Google Analytics is not used by this app — you can turn it off.
4. **Create project**, then wait for it to finish provisioning. It stays on
   the free Spark plan; nothing here asks you to add billing.

## 3. Register a Web App

1. On the project overview page, click the **Web** icon (`</>`).
2. Give it a nickname (for example `worldbuilding-guidebook-web`). You do not
   need to check "Also set up Firebase Hosting" here — `firebase.json` is
   already in the repo and step 6 covers Hosting directly.
3. **Register app.** Firebase shows a `firebaseConfig` object like this:

   ```js
   const firebaseConfig = {
     apiKey: "AIza…",
     authDomain: "worldbuilding-guidebook.firebaseapp.com",
     projectId: "worldbuilding-guidebook",
     storageBucket: "worldbuilding-guidebook.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:…",
   }
   ```

   Keep this tab open — you will copy five of these six values into
   `.env.local` in step 8 (`storageBucket` is unused here, since Storage is
   not enabled).

## 4. Enable Authentication

1. Left sidebar → **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Email/Password** → enable it → **Save**.

This is the only sign-in method the app's `SignInForm` uses
(`src/components/AccountDrawer.jsx`). It is enough for one person to have one
account; nothing here needs a Google or GitHub sign-in button.

## 5. Enable Firestore

1. **Build → Firestore Database → Create database.**
2. Pick a location close to you (this cannot be changed later).
3. Choose **Production mode** — the repo already ships the security rules
   this app needs (`firestore.rules`), so you are not relying on the
   30-day test-mode default.
4. **Firestore → Rules** tab → replace the contents with
   `worldbuilding-guidebook/firestore.rules` from the repo → **Publish**.
   (Step 7 below sets this up to deploy automatically instead of pasting by
   hand every time.)

The rule this ships with is one line: a signed-in user can read and write
only the document at `users/{their own uid}` — nobody can read anyone else's
configuration.

## 6. Enable Hosting

**Build → Hosting → Get started.** The console walks you through installing
the CLI and running `firebase init` — skip that part, since `firebase.json`,
`.firebaserc`, `firestore.rules`, and `firestore.indexes.json` are already
committed in `worldbuilding-guidebook/`. Continue to step 7 instead.

## 7. Install the Firebase CLI and Connect the Project

```bash
npm install -g firebase-tools
firebase login
```

Then open `worldbuilding-guidebook/.firebaserc` and replace the placeholder
with your project's ID (**Project settings → General → Project ID**, not the
project *name*):

```json
{
  "projects": {
    "default": "worldbuilding-guidebook"
  }
}
```

## 8. Configure Your Local Environment

```bash
cd worldbuilding-guidebook
cp .env.example .env.local
```

Fill in the five `VITE_FIREBASE_*` values from step 3's `firebaseConfig`:

| `.env.local` key | `firebaseConfig` field |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

`.env.local` is git-ignored — it never gets committed. Unlike
`ANTHROPIC_API_KEY` further up the same file, these five values are **not
secrets**: they identify your Firebase project, and access is enforced by the
rule from step 5, not by hiding these values. That is why they get the
`VITE_` prefix, which tells Vite to bake them into the browser bundle — see
the comment above them in `.env.example`.

## 9. Run It and Try It

```bash
npm install
npm run dev
```

1. Open the app. Hover the outline rail on the left edge — an **Account**
   button appears at the bottom.
2. Click it, then **Create one** to sign up with an email and a password
   (6+ characters — Firebase's own minimum).
3. Adjust a slider or two, toggle Wireframe, complete a step.
4. In the account drawer, **Save configuration**.
5. Reload the page, sign back in, click **Load configuration** — your slider
   values, toggles, and progress come back.

If you see "Firebase is not configured for this build" instead of a sign-in
form, `.env.local` is missing a value, or the dev server was started before
you finished editing it — stop it and run `npm run dev` again.

## 10. How the Code Fits Together

| File | Role |
|---|---|
| `src/firebase/client.js` | Reads the five env vars, initialises the SDK. `firebaseConfigured` is `false` if any are missing — every other file checks it, so a build without a Firebase project still runs. |
| `src/store/authStore.js` | Sign-in state (`user`, `ready`) and the sign up / sign in / sign out actions, plus the account drawer's open/closed flag. |
| `src/firebase/configSync.js` | Builds a snapshot from `sceneStore` (params and view toggles — not `demoKey`/`unlocked`, which come from whichever step you are on) and `progressStore` (completed steps, notes, practice results). `saveConfiguration` writes it to Firestore at `users/{uid}`; `loadConfiguration` reads it back. |
| `src/components/AccountDrawer.jsx` | The UI: sign-in form and Save/Load buttons. Opened from the outline rail's Account button. |
| `firestore.rules` | One user can only read or write their own document — see step 5. |

## 11. Deploy

```bash
npm run deploy
```

This runs `vite build` then `firebase deploy --only hosting,firestore:rules`,
publishing `dist/` to Firebase Hosting and the Firestore rules alongside it
in one step, so the rule in the repo and the rule actually enforced never
drift apart.

The `api/` folder (Vercel serverless functions for the course tutor, which is
itself shelved — see `src/tutor/tutorEnabled.js`) is not part of this deploy.
It stays on Vercel for now; porting it to Firebase Cloud Functions is
deferred until the tutor comes back, and is noted as such in
`spec/roadmap.md`.

## 12. Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Firebase is not configured for this build" | A `VITE_FIREBASE_*` value is missing or blank in `.env.local`, or the dev server started before you saved the file |
| `Missing or insufficient permissions` on save/load | The Firestore rule was not published (step 5), or you are testing a different project than the one in `.firebaserc` |
| Sign-up rejects a password | Firebase requires at least 6 characters |
| `firebase deploy` asks which project | Run `firebase use --add` once, or double-check `.firebaserc` |
| Firebase console asks you to upgrade to Blaze | That is the **Storage** product asking — this tutorial does not enable Storage. If you see it under Authentication, Firestore, or Hosting instead, you clicked into the wrong product. |
