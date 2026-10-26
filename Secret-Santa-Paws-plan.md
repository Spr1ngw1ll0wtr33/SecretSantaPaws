# Secret Santa Paws – project plan

*Last updated: 26/10/2026. Status: **version 3 published and tested; parked** while the organiser tries it.*

**To resume:** start a new chat, attach this file and the header picture, and say "Please carry on with the Secret Santa Paws build from this plan."

---

## 1. The problem

- About 80 Instagram accounts take part in a Secret Santa for their dogs.
- Last year's Play Store app:
  - sent only the dog's name, so addresses had to be messaged separately
  - lost some messages
  - had no master list of who was matched with whom, so chasing missing matches took a lot of time
  - needed every name typed in by hand
- The group didn't want personal data (names and addresses) going into a third-party app.
- Everyone taking part has agreed to their details being shared **within the group** through the spreadsheet. That isn't the same as sharing them with a third-party app.
- The group already keeps a spreadsheet (.xlsx) with these columns: **IG Account, Dog's Name, Address, Email address**.

## 2. What we're building

**A single web page called "Secret Santa Paws",** used by the **organiser** on any device (Windows PC, Mac, Linux, iPhone or Android) through a web browser.

- **Address:** `https://spr1ngw1ll0wtr33.github.io/SecretSantaPaws/` (published free with GitHub Pages)
- **Nothing to install.** The organiser just opens the link.
- **Privacy:** GitHub only holds the blank page. The spreadsheet is read and processed **on the organiser's own device** and is never uploaded anywhere. The page will say so.

### What it does, step by step

1. **Load:** the organiser chooses the spreadsheet. The page checks for problems (a missing email, the same account entered twice, a blank address) and lists them in plain English before going further.
2. **Match:** everyone gives one gift and receives one gift, and nobody gets themselves. An automatic check confirms this on screen. A warning appears before matching again, because re-matching gives completely new pairings.
3. **Master list:** shown on screen and downloadable as a spreadsheet (giver, giver's email, giftee's account, dog name(s), address, sent yes/no). A **"Reload saved master list"** button lets the organiser pick up where they left off without re-matching.
4. **Send by email:** one row per person, with buttons:
   - **Send via Gmail** (opens Gmail in the browser with the message filled in)
   - **Send via Outlook.com** (likewise, for Hotmail/Outlook.com users)
   - **Email app** (opens the device's own email program; reliable on phones, less so on Windows PCs unless an email program is set up)
   - **Copy message** (fallback: paste into anything)

   A setting hides the buttons the organiser doesn't need.
5. **Tick-off list:** a tick box on each row, with a counter ("34 of 80 sent"). Ticks are remembered on that device if the browser is closed, and the "Sent" column goes into the master list download.
6. **The message to each person** contains the giftee's **Instagram account name, dog name(s) and postal address**, plus the **group rules**.

## 3. Decisions made

| Topic | Decision |
|---|---|
| Sending method | **Email only.** No Instagram sending, to avoid any risk of accounts being flagged. The master list is the back-up for chasing missed messages. |
| Entries | **One per Instagram account.** Accounts with several dogs share one gift budget. |
| Multiple dogs | All in **one cell** (e.g. "Bella & Max"), used exactly as typed. |
| Exclusions | **None needed.** It doesn't matter if people were matched last year. |
| Organiser | **Sees everything** (the master list is shown openly). They found out everything last year anyway, and would rather know up front. |
| Rules text | **Kathryn will write it.** The page has an editable rules box; placeholder wording until then. |
| Name | **Secret Santa Paws** |
| Installable app? | **No**, just a plain web page. This avoids clashes with Garden Diary, Memory Jar and Boundaries (no manifest or service worker; storage keys prefixed `santapaws-`; never clears shared storage). |
| Sharing | Nothing shared with the group until a working version has been built and tested. |

## 4. Look and feel

Based on Kathryn's illustration: four cartoon dogs (cream, white Westie-type, black curly, brown terrier) with presents around a decorated Christmas tree wearing an elf hat, in snow.

- **The illustration as the banner** at the top of the page (file: `header.jpg`). It will be publicly visible, so Kathryn should be happy it's hers to use.
- Hand-drawn cartoon style: white or snowy background, **thick dark outlines** on cards and buttons, rounded shapes.
- Colours: **Christmas-tree green, scarf red, gold, cream, near-black outlines**.
- A red-and-white knitted-scarf pattern as a decorative border.
- Pale blue-grey snow dots in the background.
- A friendly rounded heading font, plain readable body text, and large buttons that work on a phone.

## 5. Questions for the organiser (before building)

1. **Which device** will they use to run the draw (Windows PC, Mac, iPhone, Android, tablet)?
2. **How do they normally read and send email?** (Gmail website, Outlook.com/Hotmail website, the Outlook program, a phone mail app.) This decides which send buttons to show.
3. Are they happy to run the matching on their own device and see the full master list?
4. **Rules for the message:** spending limit (shared between dogs on one account), posting deadline, whether gifts say who they're from, any reveal post on Instagram, what to do if a parcel doesn't arrive.
5. Is the spreadsheet up to date? Does **every row have an email address** and a **complete postal address with postcode**?
6. Is **anyone overseas**? (Postage costs and deadlines.)
7. **The date they want to run the draw**, so the build and testing can be timed from it.

## 6. Things to know (caveats)

- **The real spreadsheet must never be put on GitHub.** The repository will be public; only a made-up test spreadsheet goes there.
- **Windows "Email app" button:** only works if an email program is installed and set as the default. People who use Gmail or Hotmail in a browser should use the Gmail or Outlook.com buttons instead.
- **Gmail and Outlook.com buttons:** these use long-standing web links that work reliably, but as far as I know Google and Microsoft don't officially document them, so they could change. Test a few days before the draw; the Copy button is the fallback.
- **iPhone:** the spreadsheet needs to be saved in the Files app before the page can open it.
- **Gmail sending limits:** sending 80 emails by hand through normal Gmail is fine in ordinary use. If there are problems, send in batches with short breaks.
- **Emails can land in spam or junk.** Suggest everyone checks their spam folder, and perhaps adds the organiser's address to their contacts beforehand.
- **Data protection:** a group of friends sharing details informally for a personal activity is *probably* covered by the UK GDPR "household" exemption. This isn't legal advice. Delete the master list once all gifts have arrived.

## 7. Update 25/10/2026: country rule and first build

### New rule: Will Send To
- Some people will only send to certain countries (to avoid overseas postage). This is a **hard rule**.
- It only controls who someone **sends to**, never who they receive from.
- Two people may only be each other's Secret Santa (a "swap") **when there is no other way**, e.g. two people in Iceland who both say "Iceland only".
- If no complete match is possible, the app explains why; the organiser then messages those concerned so they can change their choice or drop out.

### Spreadsheet headings (agreed)
IG Account | Dog's Name | Address | Country of Residence | Will Send To | Email Address
(Older headings such as "Preferred Location For Gifting" and "Email addresses" are also recognised.)

### What can go in the country columns
- **Country of Residence**: one of United Kingdom (UK), United States of America (USA), Canada, Australia, Iceland, Japan, Germany, Netherlands (The Netherlands), France, Italy, Croatia. Short forms and capitals don't matter.
- **Will Send To**: `Any`, or countries separated by commas or "or" (e.g. `Canada, USA`), or the group `EU` (the 27 EU member states). Note: **Iceland is not in the EU.**
- New countries are added in one line at the top of `matching.js`.

### Built and tested
- `index.html` (the page), `matching.js` (countries and matching), `xlsx.full.min.js` (SheetJS 0.18.5 spreadsheet library, bundled), `header.jpg`, `test-dummy.xlsx` (80 made-up accounts).
- Matching checked against every possible arrangement for 3,000 random small groups, and 200 realistic 80-account groups (all verified, under 0.1 seconds each).
- Kathryn's 4-row test sheet: both possible arrangements found.
- Browser test at phone and PC size: load, match, checks, master list download and reload, Sent ticks remembered, clear.

### Still to do
- Fill in spending limits (edit in step 4 of the page, or in `index.html`).
- **Organiser: Apple Mac + Gmail. Back-up admin (Kathryn): Zorin Linux PC + Gmail.** The page now shows only the Gmail and Copy buttons by default (others can be switched back on), and has an optional "Send from this Gmail address" box for browsers signed in to more than one Google account.
- Test the Gmail button on the organiser's Mac and Kathryn's Zorin PC (a real send to 2–3 volunteers).
- Hand-over between organiser and back-up admin is via the downloaded master list (Sent ticks are only remembered on the device where they were made).
- Publish with GitHub Pages; test on Kathryn's Zorin PC and Samsung phone; trial run with 2–3 volunteers.

## 7b. Update 26/10/2026: feedback from first trial

**Organiser:** Apple Mac + Gmail. **Back-up admin (Kathryn):** Zorin Linux + Gmail (Firefox), Samsung phone (Chrome + Gmail app).

### Decisions
- **One entry per dog is allowed.** One row per dog, with the real IG Account repeated on each row.
  - Each row is a separate entry and gets its own email ("Dear <dog>", dog's name in the subject).
  - All rows for one account must have the **same Country of Residence and Will Send To** (the app refuses otherwise).
- **Order of rules:**
  1. Never broken: Will Send To; never send to your own account (even a different dog); every entry sends one and receives one.
  2. Avoided unless there is no other way: one account sending to the same account more than once.
  3. Then avoided unless there is no other way: two accounts being each other's Secret Santa.
- **Rules text** now says the maximum is per entry (Kathryn's wording, with "then this amount that is shared" tidied to "then this amount is shared").
- **No logo in the email** (Gmail links can only carry plain text; a signature was too fiddly). Kathryn will tell the group the sender and subject in advance.

### Changes made (version 2)
- New marker `<Your Dog's Name>` (the email recipient's dog), used in "Dear ...," and the subject line.
- Master list now has a "Giver Dog's Name" column; reload matches on account + dog.
- "Save progress" button in step 5 plus a reminder after every 10 new ticks; downloaded file names include the time.
- Gmail button reuses one browser tab.
- Impossible-draw explanation: summary line with number of problems; name lists folded behind "Show who is involved".
- Trial instructions corrected (Find & Replace "Entire cells"; Iceland example) and a Mac section added.
- Test spreadsheet now has multi-dog accounts and deliberately awkward Canada and Iceland groups.
- Tested: 2,500 small random groups against every possible arrangement (always found the best one); 100 realistic 100-entry draws (worst about 1 second).

### Still to do
- Kathryn to re-test; then share the trial with the organiser.
- Published 26/10/2026 at https://spr1ngw1ll0wtr33.github.io/SecretSantaPaws/ (GitHub Pages, main branch).
- Phone test (Samsung, Chrome): **"Email app" works** (opens the Gmail app with the email filled in); **"Gmail" doesn't** (Gmail's mobile site only shows the inbox). The app now defaults to Email app + Copy on phones/tablets and Gmail + Copy on computers, with a reminder note; instructions updated (version 3, web link based).
- Test on the organiser's Mac.
- Fill in spending limits; trial run with 2-3 volunteers using real emails.

## 7c. Parked 26/10/2026

- Live at **https://spr1ngw1ll0wtr33.github.io/SecretSantaPaws/** (GitHub Pages from `main`; `first-build` is identical).
- Kathryn has sent the organiser the app address, `test-dummy.xlsx` and `HOW-TO-TRY-IT.txt` (version 3).
- The organiser keeps the participant list in a shared **Google Sheet** ("Gift exchange 2026"; Kathryn added a "Test Spreadsheet" tab).
  - Before the draw, the organiser downloads a final .xlsx to their computer and uses only that file with the app.
  - **The app reads only the first tab** of a file. Put the wanted tab first, or use right-click tab → Copy to → New spreadsheet, and download that.
  - Real data in Google Drive: share with named people only, not "Anyone with the link".
- Everyone to skim each email before pressing Send.

### When resuming
- Organiser's feedback on the trial (Mac + Gmail).
- Spending limits for £, $, € and other currencies (best typed into the default wording in `index.html`, so they don't depend on browser storage).
- Trial with 2–3 volunteers using real email addresses.
- Any new countries go in `COUNTRIES` at the top of `matching.js`.
- Possible later improvement, not wanted for now: let the app choose the right tab itself.

## 8. Original build steps

1. Create the page (`index.html`, one file) plus `header.jpg`, and a **made-up test spreadsheet** of 80 accounts, some with "Dog & Dog" entries.
2. Test it in a browser: load, match, check, download and reload the master list, tick-off memory, and the email buttons.
3. Send Kathryn screenshots at phone and PC size for comments on the look.
4. Kathryn creates the `SecretSantaPaws` repository on GitHub and switches on GitHub Pages, with **numbered, click-by-click instructions**. Alternatively, Kathryn gives this session access and Claude uploads the files.
5. **Test on real devices:** Kathryn's Zorin PC and Samsung phone, then the organiser's own device.
6. **Trial run:** a real send to 2–3 volunteers before the full draw.

**Estimated effort for Kathryn:** about 2–4 hours across a few sittings, mostly testing. Comfortably achievable within two weeks.
