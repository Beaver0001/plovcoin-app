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

The v50 native SOL engine is a separate pinned Node/SDK research deliverable.
It is not browser bundled by this PR: its workspace-relative dependency lookup
must be replaced by a reviewed browser-compatible dependency boundary, with
pinned lockfile changes and bundle testing. No Solana dependency is added here.

Do not enable launch, add a public swap route, relax CSP, describe future wallet
code as covered by the current audit, or reuse synthetic pool addresses based
on this candidate. Production pool/config checks, simulation, fee quotes,
blockhash handling, wallet integration and launch authorization remain open.

Run `node scripts/test-swap-review.cjs`, `npx tsc --noEmit`, and `npm run build`.
The test uses a fake adapter and SSR only, not an installed wallet or browser.
