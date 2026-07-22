# AGENTS.md

## Cursor Cloud specific instructions

This repo is **Kibana** (Node/TypeScript monorepo, Yarn 1 classic workspaces). Its only hard runtime
dependency is a matching **Elasticsearch** instance. Canonical dev docs: `README.md` and
`CONTRIBUTING.md`; run scripts live in the root `package.json`.

### Toolchain (already provisioned by the update script)
- Node is pinned to the version in `.node-version` / `.nvmrc` (currently **22.17.1**) and is installed
  via `nvm`. The base VM image also ships a different Node on `PATH` (`/exec-daemon/node`) that will
  **shadow** the pinned one. The startup update script prepends the nvm-managed Node so `node`/`yarn`
  resolve to 22.17.1; interactive shells get the same via a `~/.bashrc` PATH line. If you open a shell
  and `node -v` is wrong, run `nvm use 22.17.1` (or `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH"`).
- Dependencies are installed with **`yarn kbn bootstrap`** (NOT `npm install`; a preinstall guard blocks npm).

### Running the product (order matters)
Start these as long-lived processes (e.g. tmux), not via the update script:
1. **Elasticsearch**: `yarn es snapshot --license trial` — downloads/runs ES matching Kibana's version,
   listens on `http://localhost:9200`, creds `elastic:changeme`. Kibana will fatal-error on a major
   version mismatch, so always use the bundled snapshot rather than a hand-installed ES.
2. **Kibana**: `yarn start` — dev server. First start is slow (the `@kbn/optimizer` builds ~200 bundles,
   several minutes) before you see `Kibana is now available`.

Gotchas:
- In dev mode Kibana serves under a **random base path** (e.g. `http://localhost:5601/kib`), printed in
  the logs as `http server running at ...`. Hit that base path, not bare `:5601`.
- The dev-mode admin login is `elastic` / `changeme` (form login, not HTTP basic).
- `yarn build` is the heavy production build and is not needed for development.
- Serverless project modes are available via `yarn serverless-{es,oblt,security,chat}`.

### Lint / test (see root `package.json` scripts)
- Lint a file/dir: `node scripts/eslint <path>` (or `yarn lint` for everything).
- Unit tests (scoped): `node scripts/jest <path-to-test>` (or `yarn test:jest`). Type check:
  `yarn test:type_check`. These are large; scope them to the package you touched.

### A headless Chrome (`/usr/local/bin/google-chrome`) is available for UI smoke tests via the
bundled `puppeteer-core`; point `executablePath` at it and launch with `--no-sandbox`.
