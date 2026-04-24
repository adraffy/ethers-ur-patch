# ethers-patch

Monkeypatch for [ENSIP-19](https://docs.ens.domains/ensip/19) (Multichain Primary) and [ENSIP-23](https://docs.ens.domains/ensip/23) (UniversalResolver) support in [ethers.js](https://github.com/ethers-io/ethers.js/).

### Usage

`npm i @ensdomains/ethers-patch-v5` [&check;](https://www.npmjs.com/package/@ensdomains/ethers-patch-v5) \
`npm i @ensdomains/ethers-patch-v6` [&check;](https://www.npmjs.com/package/@ensdomains/ethers-patch-v6)

```ts
import { ethers } from "ethers";
import "@ensdomains/ethers-patch-v5"; // or "-v6" 
```

### Features

* `resolveName()` supports optional `coinType`
    * use `coinType = "old"` for unpatched implementation
* `lookupAddress()` supports optional `coinType`
    * use `coinType = "old"` for unpatched implementation
* `{Ens}Resolver.supportsWildcard()` is noop
* [ENSIP-10](https://docs.ens.domains/ensip/10) implementation uses `UniversalResolver.requireResolver()`
* CCIP-Read tunneling for [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
    1. `Content-Security-Policy: connect-src <gateway>`
    2. `<provider>.setTunnelingBatchGateways([<gateway>])` 
    3. CCIP-Read fetches are tunnelled through `<gateway>`
* [v5](./packages/v5/index.ts)-specific
    * use `getResolverOld()` for unpatched implementation
    * updated normalization to [@adraffy/ens-normalize](https://github.com/adraffy/ens-normalize.js)
    * `namehash()` is patched
    * `dnsEncode()` is patched and uses 255-byte limit
    * `ensNormalize()` is exposed
* [v6](./packages/v5/index.ts)-specific
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
