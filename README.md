# YourStoriesLive guides

A static, searchable library of architecture, AWS deployment, media migration
and POC documentation. The site runs on GitHub Pages; no application server or
AWS deployment is required.

## Working locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run verify
npm run preview
```

The generated website is in `dist/`. The preview runs at
`http://127.0.0.1:4178/yourstorieslive-guides/`. All normal navigation uses
relative URLs, including on GitHub Pages project paths.

## Adding or updating a guide

1. Add the HTML or Markdown document under `content/`.
2. Add its filename, title, description, category and format to `guides.json`.
3. Set `featured: true` for a visual guide on the landing page, or `companion:
   true` for a written companion that should remain accessible without a
   duplicate landing-page entry.
   Use `collection: "Application"` for an application overview in the first
   landing-page section; set `reviewed` to its review date. These guides get
   section navigation and a current-code notice instead of a historical label.
4. Run `npm run verify` and commit the source files. Push to `main` to publish.

HTML guides retain their layout and presentation controls. The build adds a
return link and converts local Markdown links to their readable HTML versions.
Markdown documents are rendered with a sidebar and mobile navigation. Source
Markdown is also available from each written guide.
Generated CSS and JavaScript filenames contain content hashes so new styles
and behavior do not depend on a visitor's cached copy of an older asset.

## Publishing

In repository Settings → Pages, choose **GitHub Actions**. The workflow builds
and checks the site, then publishes only `dist/`. Pull requests validate the
site without deploying. A successful main-branch deployment updates the site.

Only documentation sources and site-building files belong in this repository.
Do not add credentials, environment files, signed media URLs, user data, HARs,
database dumps or runtime/application code. A public Pages site and public
repository are visible to anyone.

The guide copies came from `back-end/guides/` and `yourstorieslive/app-info/`. Original application
guides remain separate; this repository is the maintained publishing copy.
Local workstation paths and the legacy-host example are generalized in the
copied Markdown. Links to application source outside the guide collection are
shown as references rather than broken website links.

## Historical context

Several documents describe an AWS POC that was subsequently torn down. They
are records and design references, not a live infrastructure dashboard. Follow
each document's date and status before using operational commands or budgets.
