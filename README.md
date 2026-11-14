# TapX Communication Studio

A separate visual editor for the open `tapx-communication-demo-main` project, using the same navy/red dashboard as the earlier Card Studio. The customer preview preserves the communication hub's original layout, logo, feature sheets and demo behaviour.

## GitHub Pages

Repository: https://github.com/omalbopeee/tapx-communication-dashboard

Hosted dashboard: https://omalbopeee.github.io/tapx-communication-dashboard/

The repository is public. The workflow in `.github/workflows/pages.yml` runs the tests, builds `pages-dist/` and publishes that static output to GitHub Pages on every push to `main`. You can also run it from GitHub's Actions tab. No dependency installation or custom secrets are required.

Save changes uses the current browser's storage on the hosted site. Edits do not sync to other visitors or update the original communication website.

## Open

Install Node.js 20 or newer, then double-click **start-dashboard.cmd**. Open **http://127.0.0.1:4175** if the browser does not open automatically, and keep the terminal window open. Alternatively run `npm start` in this folder. No dependency installation is required.

The saved page opens at **http://127.0.0.1:4175/card.html**. Port 4175 keeps this workspace separate from the earlier card dashboard.

## Edit

- **Business & logo:** display name, saved-contact name, category, logo upload and contact filename.
- **Contact & links:** WhatsApp number/message, saved phone, email, fax, website, location and reviews. Feature preview switches preserve the original demo; turn them off and provide actual links to use real actions.
- **Bank accounts:** add, reorder and remove accounts; edit bank, account holder, account number, branch and optional branch code. The original fictional sample remains marked as a demo by default.
- **Social media:** add, reorder, hide and edit social profiles, with a choice of preview mode or actual HTTPS links.
- **Opening hours:** weekly intervals and time zone. Overnight hours are supported; opening status is off by default, matching the source.
- **Design & wording:** colours, logo/notice visibility, headings and action labels. Supporting contact text accepts `{name}`, `{phone}` and `{website}`.

The live preview updates while editing. **Preview** opens a larger mobile/desktop view. **Save changes** stores the page, and **View saved page** opens it. Discard restores the previous save. Reset restores the original demo to the draft; Save changes applies it. Unfinished drafts can be recovered on your next visit. The contact button generates a vCard from the current business details.

**Edits are saved only in this browser and device.** Clearing site storage removes them. Different local ports and hosted URLs have separate storage. The editor does not upload bank details or synchronize changes between devices.

This folder is independent of the original project. Saving here updates this editor's saved page. The original source files, Cloudflare Worker, redirects and public website are separate. TapX footer branding and the source's managed public page URL stay fixed.

## Build and checks

- `npm test`: model, rendering, contact generation and storage checks.
- `npm run build`: create fresh static hosting files in `pages-dist/`.
- `npm run preview`: preview that built output locally.

The static build works at a domain root or under a project subdirectory. Browser-only saving has the same limits when hosted. The local build and preview commands do not publish changes; pushing to main starts the included deployment workflow.

`public/` contains the editor, communication renderer and used assets. `scripts/` contains the build and preview helpers. `test/` contains the checks. Font and icon licence files are retained with their assets.
