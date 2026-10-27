# mftik-docs

Docs for [mftik](https://github.com/lynxlinkage/mftik), the Python STS SDK for [mftiko](https://github.com/BullionBear/mftiko), published at [docs.mftik.com](https://docs.mftik.com).

This repository is the VitePress shell. The guide and API reference are fetched from `docs/python` in lynxlinkage/mftik when the site builds. The tag and commit are pinned in `mftik-source.json`. The site tracks that published release. Bump the pin by editing that file.

The homepage in this repo is the shell index. `docs/python/README.md` from mftik is not published.

```bash
npm install
npm test
npm run docs:dev    # local preview
npm run build       # static output → docs/.vitepress/dist
```

GitHub Actions deploys `main` to GitHub Pages. The custom domain is `docs.mftik.com`.
