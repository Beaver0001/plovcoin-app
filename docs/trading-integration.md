# Prelaunch swap review candidate

This change is not mounted on any route. `TRADE_LAUNCH_ENABLED` remains false.
No provider discovery, wallet connection, network requests, signing prompts,
submission or retries run on the website as a result of this change.

`SwapReview` renders EN/RU amounts, minimum output, network fee (including
priority once), temporary rent, retained ATA rent, reserve, upfront native SOL,
wallet, network, mint and pool addresses. All amounts use bigint with nine
decimals. It displays the closed trading state without an action button.

The optional generic signing adapter is intentionally separate from this
component. A caller must supply explicit user consent and live account checks,
a review built from the decoded transaction/envelope, exact reviewed message
bytes, a matching successful simulation, fresh balances and block height.
It checks again after the wallet returns. If the account changes while the
wallet prompt is open, the wallet may already have signed; the adapter rejects
the result and does not submit it. Signatures cannot be undone by this check.

The adapter does not prove that review fields describe the transaction. The
integrator must validate the full decoded instructions and amounts against the
review; `accountChecksPassed` is a caller assertion, not independent evidence.
`verifySignedTransaction` must validate every required signature, including the
temporary WSOL signer, using the actual transaction implementation. A fake
validator or enabling a client flag is not launch authorization.

The v50 engine now has an ESM browser port under `lib/trading/engine` with exact
SDK1.5.1/web3.js1.98.0/SPL0.4.15/BN5.2.5/Buffer6.0.3 pins and a lockfile.
`next.config.js` maps the SDK's one deep Anchor CJS bytes import to Anchor's own
browser bytes API. The standalone bundle test injects a scoped Buffer import;
it does not install a Buffer global on window. Do not replace this with a broad
Node fallback or relax CSP. Keep the engine lazy/unmounted until authorized.

`prepareWalletTransaction` creates a fresh ephemeral WSOL signer locally and
attaches its partial signature. The private key is not returned or persisted.
`finalizeWalletReview` requires an explicit full message fee, balance and reserve
and binds a frozen review to the message SHA256 and preparation session. A
review clone or an earlier review after re-finalization is rejected by
`signPreparedSwap`. It delegates to the generic pre/post-sign checks and
verifies all real transaction signatures. The wrapper never submits or retries.
All tests use synthetic keys; no real wallet connection is claimed.

Live account ownership/config/activation, quote freshness, fee RPC, balances,
block height, simulation and explicit user consent are still caller duties.
The review must come from this preparation pipeline; do not accept arbitrary
amounts from query parameters or manually construct `accountChecksPassed`.
Future integration should import the engine only when authorized, prepare once,
quote the exact message fee, finalize the review and simulate the same message.
Changing blockhash, amounts, route, costs or CU settings requires re-preparation
or re-finalization as applicable and a newly displayed review.

`loadVerifiedRoute` now provides a read-only account verifier. It requires an
approved manifest (no built-in invented LOWER address), mainnet genesis, pinned
program-data address/deployment/full-account SHA256, exact pool PDAs, creators,
geometry/liquidity/activation and config authority/index. It checks the pool,
config, mints, derived vaults, Clock, wallet and PLOV ATA in one finalized
getMultipleAccounts snapshot. Pool state does not contain a config pointer:
the pool/config relationship is checked by deriving the config-based pool PDA.
The approved manifest is a separate trust input; never take it from URL fields.

Decoded pool objects stay private in a WeakMap. `prepareVerifiedSwap` only takes
the verifier's original opaque snapshot, then quotes, builds the native SOL
transaction, obtains a fresh blockhash/rent/full-message fee, checks contexts
and expiry, and simulates exactly the same message using VersionedTransaction
with sigVerify=false and replaceRecentBlockhash=false. This pre-sign simulation
does not prove wallet ownership or validate the missing user signature. The
wallet wrapper still verifies every signature after a later authorized prompt.
The module never calls send/sign RPC. Refresh accounts and simulation before
the actual signing request; preflight does not freeze chain state.

The verifier targets the pinned 1112-byte pool / 328-byte config / classic SPL
profile only. Any deployment/hash/layout change fails closed pending a new
reviewed manifest/decoder. Hash pinning is not source-build parity. The fixture
in scripts/fixtures/trading-accounts.json is synthetic, including fake program
bytes, and must never be used as a production manifest.

Do not enable launch, add a public swap route, relax CSP, describe future wallet
code as covered by the current audit, or reuse synthetic pool addresses based
on this candidate. Production pool/config checks, simulation, fee quotes,
blockhash handling, wallet integration and launch authorization remain open.

Run `npm run test:swap-review`, `npm run test:trading-browser`,
`npm run test:trading-rpc`, `npm run build`, and `npx tsc --noEmit`. Browser checks use an isolated VM with
WebCrypto and no require/process/global Buffer; they are not an installed wallet
or a full browser UI test. The standalone test forbids network requests.
