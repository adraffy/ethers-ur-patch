# ethers-patch

Monkeypatch for [ENSIP-19](https://docs.ens.domains/ensip/19) (Multichain Primary) and [ENSIP-23](https://docs.ens.domains/ensip/23) (UniversalResolver) support in [ethers.js](https://github.com/ethers-io/ethers.js/).

### Features

* `resolveName()` supports optional `coinType`
    * use `coinType = "old"` for unpatched implementation
* `lookupAddress()` supports optional `coinType`
    * use `coinType = "old"` for unpatched implementation
* [ENSIP-10](https://docs.ens.domains/ensip/10) implementation uses `UniversalResolver.requireResolver()`
* `{Ens}Resolver.supportsWildcard()` is noop
* [v5](./packages/v5/index.ts)
    * use `getResolverOld()` for unpatched implementation
    * updated normalization to [@adraffy/ens-normalize](https://github.com/adraffy/ens-normalize.js)
    * `namehash()` is patched
    * `dnsEncode()` is patched and uses 255-byte limit
    * `ensNormalize()` is exposed
* [v6](./packages/v5/index.ts)
    * use `fromNameOld()` for unpatched implementation

#### Roadmap 

* ☑︎ Downgrade versions to lowest supported
* ☑︎ Explore normalization options for v5
* ☑︎ Separate libraries
* ☑︎ Add tests for checking patched return types
* ☑︎ Add tests for failures

---

### Setup

1. `bun i`

### Test

1. `bun test`

### Build

1. `bun run apply` — propagate `package.json` changes to workspaces
1. `bun run build` — build `dist/`

### Publish

* `npm publish -ws`
