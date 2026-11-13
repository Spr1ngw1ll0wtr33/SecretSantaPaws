# Design notes

Technical notes for anyone maintaining or adapting Secret Santa Paws. For how to *use* the app, see the [README](README.md).

## Overview

A single static web page, with no server, no build step and no accounts. Everything runs in the browser:

| File | Role |
|---|---|
| `index.html` | The page: the five steps, styles, the email wording (`DEFAULT_SUBJECT`, `DEFAULT_TEMPLATE`), the master list and sending |
| `matching.js` | Countries, spreadsheet checks and the matching engine. It works in the browser (`window.SSP`) and in Node (`require`) |
| `xlsx.full.min.js` | SheetJS 0.18.5, which reads and writes `.xlsx` files (see `THIRD-PARTY-NOTICES.md`) |

It is published with GitHub Pages straight from the `main` branch.

## Spreadsheet reading (`readParticipants`)

- **Headings** are matched loosely: case and punctuation are ignored, and older names such as "Preferred Location For Gifting" and "Email addresses" still work. The heading row may be any of the first 10 rows.
- **Each row is an entry.** The account key is the IG Account in lower case, without a leading "@".
- **Checks that block the draw:**
  - missing IG Account, Email, Address, Country or Will Send To
  - an email address that doesn't look valid
  - an unknown country, or an unknown Will Send To term
  - the same account and dog twice
  - one account's rows having different Country or Will Send To values (they are compared after parsing, so "Canada, USA" and "USA & Canada" count as the same)
- **Warnings that don't block it:**
  - a blank dog's name
  - the same email address on different accounts
  - a restricted sender with nobody they could send to

## Countries and choices

- `COUNTRIES` (at the top of `matching.js`): each country has a `name` plus `also` (other accepted spellings). Matching ignores case, full stops and a leading "The".
- `GROUPS`:
  - `EU` (the 27 member states)
  - `Europe` (the EU plus Iceland; the UK is not included, so people write "UK & Europe")
- **Will Send To** is split on `,` `;` `/` `&` `+` and the words "or" and "and". "Any" (also anywhere, all, worldwide, anyone) means no restriction.
- **To add a country,** add one line to `COUNTRIES`, then run `python3 tools/make-template.py` to refresh the template's drop-down list.

## Matching (`makeMatches`)

The rules, in order of priority:

1. **Never broken:**
   - each entry sends exactly one gift and receives exactly one
   - nobody sends to their own account (including another of their own dogs)
   - every match follows the sender's Will Send To
2. **Avoided unless there is no other way:** one account sending to the same account more than once.
3. **Then avoided unless there is no other way:** two accounts being each other's Secret Santa (a "swap").

How it works:

- **The fixed rules** are a bipartite perfect-matching problem (senders on one side, receivers on the other). Augmenting paths, in random order, find a complete match whenever one exists.
- **If no complete match exists,** `explainFailure` uses Hall's theorem to report the smallest group of entries that is blocked, in plain English, with the people involved.
- **Rules 2 and 3** are handled by local search: random exchanges of two recipients and rotations of three, accepted when the score doesn't get worse. The score is 1000 × (same-account-twice) + swaps, kept up to date with counts between accounts. The search is restarted up to 30 times, and stops early when the score reaches zero.
- **`verify`** independently re-checks every finished draw, and the page shows its four checks.

### Testing done

- Every possible arrangement was compared against the engine for thousands of random small groups (3–7 entries, with multi-dog accounts and mixed rules). The engine always found a complete match when one existed, always reported impossibility correctly, and always reached the best possible score.
- Hundreds of realistic 80–100-entry draws: all verified, typically well under a second each. A search ten times longer never found a better result.
- End-to-end browser runs (Playwright) at phone and computer sizes, using `test-dummy.xlsx`.

For large groups, the search for rules 2 and 3 is very good in practice, but it can't prove it has found the best possible arrangement. The page therefore says "no way round these could be found", rather than claiming they are impossible.

## Master list

The download (step 3, and "Save progress" in step 5) is an `.xlsx` with the headings:
`Giver IG Account, Giver Dog's Name, Giver Email, Giver Country, Giver Will Send To, Sends To IG Account, Giftee Dog's Name, Giftee Address, Giftee Country, Giftee Email, Sent`.

"Reload a saved master list" rebuilds the draw from this file (matching entries by account plus dog name), re-runs `verify`, and restores the Sent ticks.

## Browser storage

The page saves to `localStorage`, using only keys that start with `santapaws-`:
- `santapaws-draw-v2`: the draw and its ticks
- `santapaws-subject-v2` and `santapaws-template-v2`: the edited wording
- `santapaws-buttons`: which send buttons are shown
- `santapaws-from`: the optional Gmail address

"Clear everything saved on this device" removes only these keys, so other apps hosted on the same address are untouched. Some browsers delete this storage when they close, which is why the downloaded master list is the real back-up.

## Sending

The email links are built at the moment a button is pressed, so they always carry the latest wording.

| Button | What it opens | Notes |
|---|---|---|
| Gmail | `mail.google.com/mail/?view=cm…` | Works on computers. On phones, Gmail's mobile site ignores it. Uses a named tab, so each email replaces the last |
| Outlook.com | `outlook.live.com/mail/0/deeplink/compose…` | |
| Email app | `mailto:` | Works best on phones |
| Copy | | Copies the address, subject and message to paste anywhere |

- **Defaults:** phones and tablets (judged from the browser's description of itself) start with Email app + Copy; computers start with Gmail + Copy.
- **The optional "Send from" address** adds `authuser=` to the Gmail link. This is an undocumented Gmail setting.
- **Long messages:** some email apps may cut off a very long pre-filled message. Copy is the fall-back.

## Regenerating the extras

- **Template:** `python3 tools/make-template.py` (needs Python 3 with openpyxl, and Node). It reads `COUNTRIES` and `GROUPS` from `matching.js`.
- **Explainer video:** serve the repository folder (e.g. `python3 -m http.server 8765`), then run `node video/make-video.js <work-folder> <output.mp4>` (needs Playwright with Chromium, and ffmpeg). `video/stage.html` draws the Mac-style window, captions and simplified illustrations around the real app. The pace is set by `HOLD_PACE` and `MOVE_PACE` in `make-video.js`.
