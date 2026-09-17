# BIU CS Redesign

A mockup of a simpler, reorganized website for the [Department of Computer Science and Artificial Intelligence at Bar-Ilan University](https://cs.biu.ac.il/).

**Live:** https://yanaiela.github.io/biu-cs-redesign/ · Hebrew: https://yanaiela.github.io/biu-cs-redesign/he/

The content comes from the current site, grouped under five sections: Study, Research, People, News and About. It's one static `index.html` with hash-based routing, and has no build step.

The Hebrew version is a right-to-left copy in `he/index.html` with the same routes, so the language switch keeps you on the same page.

## Working on it

`index.html` is the source of truth: it holds the styles, the script and the English content. `he/index.html` is generated, so never edit it by hand:

```
node tools/build-he.mjs     # rebuild he/index.html after any change to index.html
node tools/check-links.mjs  # check every external link (also runs weekly in CI)
```

The Hebrew content lives in `tools/he/`: the page templates and the faculty translations. The build reuses the English CSS and JavaScript and swaps in the Hebrew text; every replacement must match exactly once, so the build fails loudly when the English page changes in a way the Hebrew build doesn't know about. CI rebuilds the Hebrew page and fails if it differs from the committed one.

Research areas are defined once, in the `AREAS` list in `index.html`. The home page cards, the Research page and the faculty directory filters are all generated from it, so they cannot drift apart. Each content page carries a `data-reviewed` date that the page shows at the bottom, to make stale content visible.
