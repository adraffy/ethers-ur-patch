# ethers-patch

Monkeypatch for [ENSIP-19](https://docs.ens.domains/ensip/19) (Multichain Primary) and [ENSIP-23](https://docs.ens.domains/ensip/23) (UniversalResolver) support in [ethers.js](https://github.com/ethers-io/ethers.js/).
* [v5](./packages/v5/index.ts)
* [v6](./packages/v5/index.ts)

### Features

* `resolveName()` supports optional `coinType`
* `lookupAddress()` supports optional `coinType`
* ENSIP-10 implementation uses `UniversalResolver.requireResolver()`
* `{Ens}Resolver.supportsWildcard()` is noop

#### Roadmap 

* ☑︎ Downgrade versions to lowest supported
* ☐ Explore normalization options for v5
* ☑︎ Separate libraries
* ☑︎ Add tests for checking patched return types
* ☑︎ Add tests for failures
* ☑︎ Script to apply `name/version` to `package.json`

---

### Setup

1. `bun i`

### Test

1. `bun test`

### Build

1. `bun run build`
