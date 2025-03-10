# OdysseyJS -  Typedoc Documentation

## Overview

We use [typedoc](https://typedoc.org) to turn comments in our typescript into markdown pages which can be copied into the Odyssey Docs repo and the OdysseyJS Docs repo. Each time a new version of OdysseyJS gets deployed to npm then typedocs should be regenerated and pasted into the both docs repo previously mentioned.

## Steps

### Dependencies

A recent build of one of the typedoc dependencies broke this workflow so for now make sure that the dependencies are the following versions.

```json
"typedoc": "^0.18.0",
"typedoc-plugin-external-module-name": "^4.0.3",
"typedoc-plugin-markdown": "^2.4.0",
```

### Generate Docs

#### Checkout the Latest and Greatest Release

```zsh
# if you need to refresh your memory for the latest tag
git tag -l

# now checkout the tag/release that you want to build docs off of
git checkout v1.13.0
```

Generate typedocs using the `docsmd` yarn/npm script.

```zsh
yarn docsmd
Rendering [========================================] 100%

Documentation generated at /path/to/odysseyjs/docsMD

✨  Done in 8.09s.
```

This will generate `README.md` and 3 directories, `classes/`, `interfaces/` and `modules/` in the `docsMD/` directory of your local `odysseyjs/` repo.

### API

First, if any new files were generated in `README.md` then rename the newly generated `README.md` to `api.md`. Next open `api.md` and clean up the formatting.

* Remove the generated headers and replace them w/ API and OdysseyJS w/ a link to the current build
* Nest the list items per their parent category
* Clean up the body copy. Ex: `API-ALPHA` -> `ALPHA` and `API-ALPHA-Credentials` -> `Credentials`

## Copy to Docs Repo

Now copy the `api.md` file into the `/path/to/docs/apis/tools/odysseyjs/` directory of your local `odyssey-docs/` repo.

Next copy 3 directories, `classes/`, `interfaces/` and `modules/` into the `/path/to/odysseyjs-docs/` directory of your local `odysseyjs-docs/` repo.

Confirm that everything worked by running `yarn start` and viewing the new OdysseyJS docs on `localhost`. If that is successful next run `yarn build` to confirm that docusaurus is able to properly build. Once that is successful, branch off of `master`, commit your changes and push them on your new feature branch to the remote `odyssey-docs` repo and create a PR.
