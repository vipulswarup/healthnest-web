# SanoVault family UX friction review

Date: 20 August 2026
Audience: product owner, for a family vault used by a non-technical spouse, a 73-year-old parent, and a cancer patient who already lives in WhatsApp and Google Drive.

This is a friction review, not a visual redesign. The goal is that your wife and your dad can get in, add a report, and (when needed) hand a short packet to a doctor without calling you.

Review method: the live site at sanovault.com plus the screens and flows that actually ship (`signin`, dashboard, patients, health-record upload, medications, blood summary, households, PWA manifest, auth). Interactive device testing was not run in this pass. Priorities below are still tied to concrete UI, not hypothetical polish.

## What “done” looks like for this family

| Person | Devices | Job they will actually do |
| --- | --- | --- |
| You | Phone first, laptop sometimes | File reports that arrive on WhatsApp or as paper; print a short doctor packet; log BP three times a day; keep visit questions that currently live in Notion |
| Wife | Phone or iPad | Daughter’s care: scan handwritten prescriptions, notes for the paediatrician, print a short summary. Rare emergency: your history, conditions, and medicines for a new doctor. She has already forgotten the URL and the password |
| Dad (73) and Mom | Phone first (Dad), phone or iPad (Mom) | Upload lab PDFs from WhatsApp and photos of handwritten prescriptions. They currently forward those files to family or to the doctor. They have never opened SanoVault |

If a change does not help one of those jobs, it is not P0.

## How the product thinks vs how they think

The app is organized like an EHR admin console:

1. Create an account (email + password)
2. Create a household
3. Add a patient (name, DOB, gender, ABHA)
4. Open Health Records
5. Drag-and-drop a file
6. Wait for OCR and AI
7. Confirm record type, source, doctor, tags
8. Save

The family organizes care like this:

1. A file arrived in WhatsApp, or a paper is in my hand
2. This is for *Dad* / *her* / *our daughter*
3. Put it away, or show a doctor tomorrow

Until the app matches that second sequence, extra screens will keep losing them.

## Priority scale

- **P0 — Access or capture is blocked.** They cannot find the app, cannot sign in, or cannot get a document in without you.
- **P1 — Core path is too hard.** They might succeed once with coaching, then never return.
- **P2 — Care jobs you named are missing or too long for a doctor visit.** The vault exists, but it does not replace Notion, Google Drive, or a handwritten list.
- **P3 — Polish.** Worth doing after the paths above work.

---

## P0 — They cannot get in, or cannot add a document

### P0-1. There is no way back in without remembering a URL and a password

Your wife has already forgotten both. Dad has never had either.

What exists today:

- Sign-in is **email + password first**. “Sign in with Google” is below the form, under “Or continue with”.
- There is **no Sign in with Apple**, which is the natural account on her iPad and Mom’s iPad.
- There is **no magic link** from email or WhatsApp.
- “Forgot password?” sends an email. That is the recovery path she would have to discover, then wait for, then complete on the same device.
- Emails default to `https://www.sanovault.com` while people may type `sanovault.com`. Two spellings of the same product make “what was the website?” worse.

What would actually get her in during a hospital wait:

- Google and Apple as the **primary** buttons, full width, above any password fields.
- A WhatsApp message you can resend: “Open SanoVault” with a one-tap sign-in link that lands her on **your** record (or the daughter’s), not a blank dashboard.
- After first success, a one-screen prompt: **Add SanoVault to the Home Screen**. The PWA manifest exists, but the Next.js layout does not advertise iOS home-screen install (`apple-mobile-web-app-capable` lives only on an unused static HTML file). On iPad, “the app” has to be an icon, or it does not exist.

Do not expect Dad to keep a password. If he uses the product at all, he stays signed in on his own phone, with Google if he has it, otherwise a link you send him once.

### P0-2. Adding a document still assumes a laptop

Your own working habit is: WhatsApp → Share → Google Drive, or Google Drive’s scan for paper. Everyone else forwards the file on WhatsApp.

What the upload UI actually says:

> Drag and drop files here, or click to select

That copy is desktop. On a phone there is no drag-and-drop. The control is a hidden file input with no `capture` attribute, so the phone is not invited to open the camera. The sitewide Permissions-Policy also sets `camera=()`, which blocks any in-app camera scanner you might add later.

There is no Android/iOS **Share to SanoVault** target in the PWA manifest. WhatsApp’s share sheet cannot see this product, so Drive wins.

There is no inbound WhatsApp number or bot. For Dad, “forward the PDF to this chat” is the only upload UX that matches what he already does.

Needed capture paths, in order of family fit:

1. **WhatsApp inbound.** A dedicated chat: they forward the report, the bot asks “Who is this for?” with buttons (Dad / Mom / You / Daughter), then files it. No browser.
2. **Share sheet.** Android `share_target` plus an iOS share extension later. Same question: who is this for?
3. **In-app: Take photo / Choose from WhatsApp / Choose from Files**, three large buttons, not a dashed dropzone.
4. **Keep Drive as a later import**, not the only brain they have to use.

Until (1) or (2) exists, Dad will not become a SanoVault user. He will keep forwarding to you.

### P0-3. A file cannot be saved until they understand Household, Patient, and Record

Dashboard copy tells a first-time household to “Create your first household” because “Patients and records live inside a household so access stays organized.” Then “Add patient” (DOB, gender, ABHA). Then “Add Health Record” with Source, Record Type, tags.

Dad does not have a mental model of “patient.” He is a person sending a photo of a prescription. Wife is managing a daughter, not administering a household graph.

The add-record wizard also waits on OCR and AI **before** asking whose file it is. If processing is slow or fails, they are stuck on a spinner with developer-facing fallback copy such as initializing categories via a `tsx` script.

Needed shape:

- First question: **Who is this for?** Big name buttons, last-used person first.
- Second: **Photo, file, or skip and type a note.**
- Everything else (hospital name, doctor, tags) is optional and auto-filled. Confirm only if the guess looks wrong.
- Household setup is your job, done once, never shown as a prerequisite to Dad.

### P0-4. “Upload record” can file against the wrong person

Dashboard “Upload record” always targets `patients[0]`. That is whatever the API returns first, not “me”, not “who I was just looking at”, not “the daughter my wife cares for”.

A mis-filed cancer report or a child’s prescription is a trust failure. The primary action must ask **who**, or remember the person this user usually files for (you for you; daughter for your wife; self for Dad).

---

## P1 — They might succeed once, then abandon it

### P1-1. Navigation is an admin sitemap, hidden behind a hamburger on the devices they use

Primary links: Dashboard, Patients, Health Records, Medications, Households.

Those labels are clinic software. They are also hidden until the `xl` breakpoint (1280px), so phone and almost every iPad get a hamburger. There is no bottom bar for the three actions that matter: **Add**, **[Person]**, **For the doctor**.

Rename in the UI they see:

- Patients → **Family** (or just the people’s names)
- Health Records → **Reports & documents**
- Households → **Who can see this** (settings, not a top-level tab)
- Dashboard → a home that is a list of people, not three count tiles

### P1-2. Two different upload/review products

`/documents/upload` and `/health-records/new` both upload files. One continues to `/documents/[id]/review`, the other is a two-step OCR wizard. A family member who bookmarks the wrong one will not know they did.

Keep one Add path. Delete or redirect the other.

### P1-3. Inviting family requires email, while the family lives on WhatsApp

Household invite is “enter an email”. If mail is not delivered, the UI tells you to share an accept URL yourself. Dad will not complete: email → create account → password → beta acknowledgement → pick patients → household.

Invite should be a WhatsApp link: “Vipul invited you to the family health folder. Tap to join with Google.” Patient sharing should default to everyone in the household, not a multi-select of patient IDs on first join.

### P1-4. Sign-up and first run are legal and clinical, not human

New users hit:

- First name, last name, email, password, confirm password
- A beta checkbox naming HIPAA, GDPR, and DPDP
- Then a full-page “Beta and regulatory-status acknowledgement” if they signed in with Google
- Then household, then patient, then empty vault

The legal page is necessary for you. It is not comprehensible to Dad. Keep the acknowledgement, but one short paragraph in plain English, large type, one checkbox, then **straight into “Add a report”** with people already created by you.

Google sign-up is also disabled until that checkbox is ticked, while the checkbox sits under a long password form. If Google/Apple are primary, the acknowledgement belongs on that one screen, not behind a form they should not fill.

### P1-5. Medication entry is built for a pharmacist, not for a handwritten pad

Adding a medicine asks for brand, country, catalogue match, INN, strength, unit, formulation, dose, frequency, route, start date. Unconfirmed entries show a warning not to rely on them.

Your wife’s job is: photograph the paediatrician’s handwritten slip. Your job after chemo changes is: “this is what I am on.”

Needed: **photo of the strip or prescription → confirm the list**. Manual INN editing is an advanced control, not the default form.

### P1-6. Type, contrast, and targets are “standard web”, not 73-year-old phone

Body and controls are mostly `text-sm` with `py-2` inputs. Many tap areas are under 44px. There is no larger-text mode. Health-record filters (source, record type, tag, date range) appear before a simple timeline.

For Dad, one screen should show: his name, a huge **Add report**, and a list of recent files with dates. Filters can exist behind “Find a report” for you.

### P1-7. Jargon and machine strings leak into the UI

Examples that will make a non-technical user stop:

- “Patient”, “Source (Hospital/Provider)”, “Record Type”, “ABHA Number”
- Tags displayed as `lab_report` rather than “Lab report”
- Record types shown as codes if categories are slow to load
- Empty states that talk about patients instead of “Add Dad” / “Add your daughter”
- Dashboard “Upload record” and health-records “+ Add Record” as if they were different things

### P1-8. Installable app is half-finished

`manifest.json` is present (`standalone`, icons). iOS home-screen meta is missing from the real layout. There is no in-app “Add to Home Screen” coaching. Without that, wife and Dad will not have an icon next to WhatsApp.

---

## P2 — The care jobs you described are missing or too long

### P2-1. No one-page packet for a doctor who has 90 seconds

You asked for trends and key points that are not multiple pages. What exists:

- **Blood work summary**: 90-day panels, sparklines, per-test tables, then a print of whatever tests are still checked. Default is all extracted tests. That is a specialist printout, not a clinic-door page.
- **Medication list**: printable, but a separate place. Doctor’s country on that page **defaults to USA**, which is wrong for appointments in India.
- Nothing combines: active problems, current medicines, last 5–6 days of BP, questions to ask, and 3–5 lab highlights.

Needed: **For the doctor** → pick person → one page:

- Who I am / who this is
- Conditions and current medicines (short)
- Last week of BP (you)
- Three key lab changes, not every CBC line
- “Please ask” notes
- QR or link to the underlying PDFs if the doctor wants them

Print and also **Share to WhatsApp** as PDF, because that is how files already move to doctors.

### P2-2. Blood pressure three times a day does not exist

There is no vitals log, no reminder, no 5–6 day chart. You will keep a side channel until this is a 15-second phone action: time of day, systolic, diastolic, optional pulse, save. Wife should be able to open **your** BP week in an emergency without hunting Health Records.

### P2-3. Visit questions and symptoms still live in Notion

There is a `symptom` tag and no diary. Your wife also needs “questions for the paediatrician” and observations.

Needed: per person, a **Visit notes** list: date, what we noticed, what to ask. Pin “next appointment”. Include those lines on the one-page doctor packet. This is the feature that replaces Notion for you.

### P2-4. Emergency mode for your wife is not a mode

If you are hospitalised, she needs facts in under a minute: key conditions, medicines, allergies if you store them, last important labs, your doctors. Today that is: remember the URL, sign in, pick the right patient among several, open medications, open blood summary, hope the default patient is you.

Home should have a single control on your card: **Show a doctor**. Same one-pager as P2-1, with your name in huge type.

### P2-5. Handwritten prescriptions will fail quietly

OCR + AI is built for printed lab PDFs. Handwritten paediatric and GP pads will often return empty or wrong fields, then dump the user into Source / Record Type / tags. For those documents the success path is: **save the photo, assign the person, type one line** (“Dr X, antibiotics 5 days”). Do not block save on extraction.

### P2-6. Paper scanning is outsourced to Google Drive

You already leave the product to scan paper. An in-app multi-page capture (like Drive’s scan: shutter, next page, done) is the difference between “I’ll do it when I’m home” and “it is in the vault now.” Requires allowing camera for that page only, not a global `camera=()`.

---

## P3 — After the paths work

- Empty states use decorative emoji; the rest of the product does not. Pick one visual language.
- Sign-in says “Welcome back” on a first visit.
- Health-record dates use `en-US` in some lists and `en-IN` on the dashboard.
- Add-record and review pages still contain console logging and operator instructions.
- Blood-summary print still includes wide tables; even after P2-1, the current print is not “one page”.
- Household switcher reloads the window on some routes; a confused user can think the app crashed.

---

## Outside-the-box: meet them where the file already is

These are product bets, not UI tweaks. They are the highest-leverage work for this family.

### 1. WhatsApp as the upload app (Dad and Mom)

Give them a chat named **SanoVault family**. Behaviour:

- They forward a PDF or photo, as they do today to you or to the doctor.
- Bot: “Saved. Who is this for?” with name buttons.
- Optional: “Lab report or doctor’s note?”
- Confirmation: “Filed under Dad, 20 Aug.”
- If they ignore the question, file under a default you set (Dad’s messages → Dad).

You still use the web app to review OCR. They never see Households.

### 2. “Share to SanoVault” beside Google Drive (you)

You already share from WhatsApp to Drive. Put SanoVault on that exact sheet. After share: who is it for, then done. Processing happens in the background. A notification: “Saved. Tap to check the date.”

### 3. Home Screen + stay signed in (wife and Dad)

The icon is the URL. Session should last months on a personal phone/iPad. Sign-out should be buried. A 73-year-old who is asked to sign in again is gone.

### 4. Person-first home, not a dashboard of counts

Four cards: You, Wife (if she is a patient), Daughter, Dad, Mom — only people who exist. Each card:

- Add report
- For the doctor
- Recent files

That is the entire app for them. Households, categories, catalogues, and filters stay behind your account or an “Advanced” link.

### 5. Pre-built people, zero setup for family

You create the household and the patient records. Invites do not ask Dad to “add a patient” named himself. His login, if any, is attached to a person you already made.

### 6. Doctor packet as a WhatsApp message, not only a printer

Clinic reality in this family is: forward a file on WhatsApp. “For the doctor” should produce a one-page PDF and offer **Send on WhatsApp**. Printing is secondary and should default to one page.

### 7. BP as a widget-like page, not a health record type

Three taps, three times a day, from a Home Screen shortcut: **Log BP**. No navigation chrome. Graph for the last 7 days on the same screen. Include that graph on the doctor packet.

### 8. Guided “first report” for Dad, sitting next to him once

Not a product tour. A single screen you open on his phone: “Send the next report that arrives on WhatsApp to this chat” (or tap Add and pick the PDF). If that one file lands in the right place, he has a success memory. If the first attempt is household setup, he will not try a second time.

---

## Suggested order of work

Do not start with multilingual, visual refresh, or more filters.

1. **Get back in:** Apple + Google first, magic/WhatsApp sign-in link, Home Screen install, one canonical URL.
2. **Person-first home** and **who is this for?** before any other metadata. Fix default patient on Upload.
3. **Phone capture:** Take photo / pick file copy; allow camera on the capture page; one upload flow.
4. **WhatsApp inbound** for Dad and Mom (this is the real “they use the system” feature).
5. **For the doctor** one-pager + WhatsApp share; fix medication-report country default to India.
6. **BP log** and **visit notes**, both attached to a person and to that one-pager.
7. Simplify medication add to photo-first; keep the catalogue as optional confirmation for you.

---

## Assumptions

- Family members should not have to create households or patient records themselves.
- English labels are enough if they are plain words; medical terms (BP, prescription) are fine.
- OCR remaining imperfect is acceptable if saving the original photo always works.
- You will remain the household administrator; the product should not require you to be the only person who can file a WhatsApp PDF.

## Risks

- A WhatsApp bot handles medical files. That is a privacy and operations decision, not only UX. It is still the only capture path Dad already knows.
- Long-lived sessions on a shared iPad are a risk if the iPad is not yours. Prefer her Apple ID on her iPad, not a family-shared login.
- Making Google/Apple primary does not help a parent with no Google/Apple account. For them, the WhatsApp bot should not require an account at all; they are submitting into a household you already own.
