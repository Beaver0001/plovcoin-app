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

Callers of the low-level preparation functions own account verification,
freshness, fee RPC, balances, block height and simulation. The verified RPC
pipeline below performs those preflight checks for its supported profile;
explicit user consent and the trusted wallet/launch state reader remain caller
duties. The asynchronous signing context reader below supplies RPC evidence.
The review must come from this preparation pipeline; do not accept arbitrary
amounts from query parameters or manually construct `accountChecksPassed`.
Future integration should import the engine only when authorized and display
the review returned by a successful verified preflight.
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

Snapshots are bound to the original connection object and endpoint. A new
provider/connection requires a new account verification; the pipeline also
rechecks genesis before quoting and after simulation. Approved JSON manifest,
wallet public key, returned account bytes/owners and the input BN amount are
copied before asynchronous work can expose them to caller edits. These guards
prevent accidental cross-request/provider mixups; an RPC provider remains a
trusted data source and hostile JavaScript in the same realm is out of scope.

Snapshot age starts before the account-loading RPC, not when verification
finishes. Both wall-clock and monotonic elapsed time count toward the explicit
maximum age; a backwards wall clock fails closed. The returned review expiry
is capped by the remaining snapshot age as well as the quote lifetime. Expiry
and connection identity are checked again after asynchronous finalization.
These limits do not make a quote executable against future chain state or
replace revalidation at signing time.

`refreshVerifiedSwapContext` supplies the asynchronous `readContext` callback
for `signPreparedSwap`. It accepts only the original opaque preflight receipt
and reuses its private manifest, canonical message, expiry and connection.
Each invocation reloads finalized accounts with a nondecreasing account-slot
floor, rechecks the unchanged full message fee and rent, simulates that exact
message and checks current block height. ATA availability changes require new
preparation; no blockhash, instructions, route or slippage are rewritten.

The generic signing adapter awaits a context before the wallet call and again
after the wallet returns, passing `{phase, transaction}`. Before the prompt,
simulation uses `sigVerify=false`; after it, every signature is checked locally
and simulation uses `sigVerify=true` on a copy of the returned transaction.
It checks signatures again after asynchronous revalidation. The trusted
synchronous `readWalletState` callback is sampled before RPC and after each
await, so a wallet/network/launch change rejects the attempt. A post-sign
failure cannot undo a signature already produced; no signed result is returned
by the wrapper and no send/retry occurs. User cancellation is propagated.
Only one signing attempt per preparation may be in flight. Re-finalizing the
review during RPC or while the wallet prompt is open invalidates the attempt.

`createWalletReviewSession` adds an event lifetime around this lower-level
pipeline. Bind it when displaying/approving one review. Its mandatory synchronous
subscription must report every account, network, disconnect, reconnect and
launch-policy event, including a switch away and back to identical values.
Any event permanently invalidates that session. Snapshot checks alone cannot
observe such transient history. The event source must not debounce/coalesce
those events away; an extension that does not expose them cannot be certified
by this wrapper.

The session checks state and its event latch around asynchronous context reads
and the wallet call, and before returning a signed result. It permits only one
attempt and rejects rebinding the same review object, including after dispose
or failure. Cancellation/error requires a newly prepared/displayed review;
there is no automatic retry. Listeners are removed when the attempt finishes
or `dispose()` is called. Dispose on review replacement and component unmount,
including while a wallet response is pending. No wallet provider is discovered
or connected by this module, and no listener is attached until explicitly bound.

Illustrative wiring, only after separate launch authorization. Creating a
session does not request a signature; call `sign()` only on explicit user
consent. The event publisher and actual wallet integration remain to be supplied
and tested; they are not implemented by this example:

```js
const readWalletState = () => ({
  wallet: trustedWalletAdapter.publicKey?.toBase58() ?? null,
  network: selectedNetwork,
  launchEnabled: TRADE_LAUNCH_ENABLED,
});
const session = createWalletReviewSession({
  prepared: preflight.prepared,
  review: preflight.review,
  wallet: trustedWalletAdapter,
  readWalletState,
  subscribe: subscribeWalletAndLaunchEvents, // callback => synchronous unsubscribe
  readContext: input => refreshVerifiedSwapContext(connection, preflight, {
    ...input, readWalletState,
  }),
});
// In the explicit approval handler:
try {
  const signed = await session.sign();
  // A separately authorized submission flow still needs its own current gates.
} finally {
  session.dispose();
}
// Also dispose on unmount or replacement, even before the approval handler runs.
```

The returned context is validated RPC evidence for the supported profile,
not a freeze of future chain state. Both account reads and simulation trust
the configured RPC; a finalized snapshot may be older than the confirmed
simulation bank. A successful callback does not authorize a launch or a send.
Real wallet UI acceptance and execution against actual project pools remain
open. Signing tests use deterministic synthetic keys and mock RPC responses.

The verifier targets the pinned 1112-byte pool / 328-byte config / classic SPL
profile only. Any deployment/hash/layout change fails closed pending a new
reviewed manifest/decoder. Hash pinning is not source-build parity. The fixture
in scripts/fixtures/trading-accounts.json is synthetic, including fake program
bytes, and must never be used as a production manifest.

Do not enable launch, add a public swap route, relax CSP, describe future wallet
code as covered by the current audit, or reuse synthetic pool addresses based
on this candidate. Execution against real approved pools, real fee/simulation
responses, wallet integration and launch authorization remain open.

Run `npm run test:swap-review`, `npm run test:trading-browser`,
`npm run test:trading-rpc`, `npm run test:trading-signing`,
`npm run test:swap-attempt`, `npm run build`, and
`npx tsc --noEmit`. Browser checks use an isolated VM with
WebCrypto and no require/process/global Buffer; they are not an installed wallet
or a full browser UI test. The standalone test forbids network requests.

A separate private Chromium 133 harness has rendered the actual SSR review
with the built application CSS and fonts: EN/RU, BUY/SELL, 320/390/768/1440px,
maximum-u64 and one-atom display fixtures. A 320px/200%-text regression exposed
currency units breaking across lines; the review now keeps each SOL/PLOV token
indivisible while allowing long numbers and addresses to wrap. Visible text
and arithmetic are unchanged. The old markup fails the geometric regression;
the updated markup passes. The same browser also runs the preparation/signing
pipeline with mock RPC and a synthetic wallet, including closed-gate refusal.
This is isolated SSR/browser-engine evidence, not a mounted Next route,
React hydration test, installed wallet integration or mainnet acceptance.

## Injected Phantom compatibility candidate

`createInjectedPhantomReviewSession({provider, connection, preflight,
readAppState, subscribeAppState})` supplies the session wiring for a traditional
injected Phantom-compatible provider. It requires an already connected provider
with `signTransaction`, `on` and `removeListener`; the `isPhantom` flag is only
a compatibility check, not proof of provider authenticity. The trusted host
supplies the provider. This code never searches window globals, connects,
reconnects or uses a sign-and-send fallback.

It subscribes to `connect`, `accountChanged` (including null) and `disconnect`.
Every event latches invalidation even when the public key is unchanged. The
application separately supplies its selected RPC/network and launch flag via
`readAppState`, and synchronously publishes every change through
`subscribeAppState(callback)`, returning an unsubscribe function. Network comes
from that app/RPC selection; this adapter does not infer a network from the
Solana provider or assume an undocumented network-change event. Verified RPC
genesis/connection checks still run in `refreshVerifiedSwapContext`.

The returned session exposes only `sign()` and `dispose()`. Bind it while showing
the review; invoke `sign()` only on explicit approval. Dispose on unmount,
provider/RPC replacement or review replacement. Provider and app listeners are
removed on all completed attempts and on explicit disposal. Partial registration
failure rolls back already attempted registrations. Cleanup attempts all
listeners even if one removal fails, and propagates the failure.

This is a narrow legacy capability, not Wallet Standard or embedded-wallet
support. Phantom's current traditional-provider documentation says sign-only
methods are outside its Wallet Standard implementation and may be removed.
If `signTransaction` is absent or rejects, this adapter fails closed. Do not
replace it with `signAndSendTransaction`: that would bypass our post-sign,
pre-submission checks and requires a separate architecture/security decision.
Actual installed-extension preservation of the temporary WSOL signature,
provider event delivery and signing behavior remain acceptance requirements.

Sources checked 2026-10-20 (Asia/Dushanbe):
- https://docs.phantom.com/solana/establishing-a-connection
- https://docs.phantom.com/solana/sending-a-transaction
- https://github.com/anza-xyz/wallet-adapter/blob/master/packages/wallets/phantom/src/adapter.ts

No provider SDK dependency, mounted wallet UI, public trading route or submission
flow is introduced by this candidate.

## Continuous swap attempt core (unmounted candidate)

`createWalletSwapAttempt({prepared,review,wallet,readContext,readWalletState,
subscribe,intentId,lastValidBlockHeight,claimIntent,enqueue})` adds one explicit
`approve()` attempt from review binding through a supplied enqueue boundary.
It shares review-use identity with the sign-only session, so a review cannot
be rebound between the two APIs. Its other public method is `dispose()`.
It has no default provider, connection, storage or network transport.

Subscriptions remain active across the wallet response, intent persistence and
a further signed-context refresh. Every delivered event permanently invalidates
the attempt before enqueue, including A→B→A. State, current review identity,
wall-clock rollback and monotonic expiry are rechecked. This cannot recover
events the trusted publisher never delivers. Use the existing verified-preflight
reader with the original connection; its account/pinning/slot/fee/simulation
checks remain mandatory. Arbitrary callbacks or `launchEnabled=true` are not
independent evidence or release authorization.

The core copies the signed transaction before exposing it to later context
work, verifies all signatures and byte identity, and returns only a frozen
public receipt with `PENDING` or `UNKNOWN`. The expected transaction signature
is encoded with direct pinned bs58 4.0.1, already present in the lockfile; no
transitive package version changes. Returned receipts contain no signed bytes.

`claimIntent(receipt)` must atomically reserve the stable intent and durably
persist the receipt before resolving strictly `true`. The receipt contains
intent/review IDs, expected signature, genesis, original blockhash/last valid
height and expiry, never private keys or signed transaction bytes. False,
undefined or rejection prevents enqueue. An ambiguous claim may still have
committed; reconcile the store before a new user action. Reuse the original
intent for a pending operation; automatically generating a new intent ID on
retry would bypass the caller's duplicate-operation protection. This generic
core alone does not certify storage. The optional IndexedDB adapter below
supplies a separately tested implementation.

After persistence, the core invokes the signed context reader again, requires
the original last-valid height and `signatureVerification=true`, verifies the
returned transaction, then allocates a transport byte copy. A final synchronous
state/time/latch check immediately precedes the single supplied
`enqueue(bytes,receipt,{minContextSlot,currentBlockHeight})` invocation. This
third argument is frozen and preserves the final simulation slot floor.

The trusted enqueue implementation must consume that copy at its actual enqueue
boundary, without delaying the decision through another await or hidden retry,
and must preserve all bytes/options. It necessarily receives signed bytes and
could retain them; this is an integration contract, not confinement against a
malicious transport or same-realm script. No production enqueue adapter is
implemented. Tests use in-memory fake enqueue only. A single invocation is not
an exactly-once network-delivery guarantee, and RPC forwarding behavior remains
the future transport's responsibility.

Once enqueue is entered, throws/rejections, missing responses and mismatched
returned signatures yield `UNKNOWN` with the expected receipt. A matching
signature yields `PENDING`, never confirmation. Events/disposal after entry
cannot cancel the network or discard that receipt. Listener cleanup failure
after entry is reported as `cleanupFailed` on the receipt instead of throwing
an error that might look definitely unsubmitted. No automatic retry occurs.
Before enqueue, errors reject and listeners are cleaned; the same attempt and
review remain consumed. Durable storage may already hold DISPATCH_INTENT even
if a later gate fails, so its recovery policy must handle that safe ambiguity.

Actual status lookup, on-chain reconciliation, transport errors/retry
configuration, concrete injected-provider wiring and production UI are still
open. Local receipt storage and recovery are described below. The application
remains unmounted with launch false; this is not a completed submission feature
or launch approval.

## Explicit IndexedDB receipt storage candidate

`openSwapReceiptStore({indexedDB,storageManager,databaseName,epochId,
initialize:false})` opens an expected version1 database. It never discovers a
wallet, sends, requests persistent-storage permission, or accesses storage on
import. Both browser dependencies and stable database/epoch identities are
explicit trusted-host inputs. Public APIs are `claim`, `get`, `recordOutcome`,
`recover`, `isOpen`, `subscribeInvalidation` and `close`.

First initialization requires a separately authorized `initialize:true` and an
already persistent storage bucket (`storageManager.persisted()===true`).
Normal opening defaults to refusing a missing DB, unknown schema or mismatched
epoch; it does not silently recreate lost history. Do not retry opening with
initialize:true after data loss. The host must preserve the expected epoch
independently of that database and perform reconciliation before any reset.

`claim` validates and copies exactly the public receipt fields before its first
await. Extra fields, invalid encodings and unsupported states are rejected;
private keys, full signed bytes/base64 and arbitrary payloads are never stored.
It uses a unique-key `add`, not an application read-then-write. Concurrent
readwrite transactions serialize competing claims; only one receives true.
ConstraintError yields false without replacing the original. Other errors and
transaction abort reject. True is resolved only after `complete`, never merely
after request success, and persistence policy is checked before and after.

All writes request `durability:'strict'` and reject when the transaction does
not report strict. Initial metadata is also rewritten through a strict
readwrite transaction. This is the browser's durability hint, not a guarantee
against power loss, hardware failure, user/origin deletion or hostile same-realm
scripts. No relaxed/default durability fallback is used. Reads/recovery remain
available when persistence permission is absent, but claims/outcome writes fail.

`recordOutcome` accepts only matching PENDING/UNKNOWN public receipts, preserving
all original identity fields. UNKNOWN cannot be overwritten by a late PENDING
ack. Terminal network outcomes are deliberately unsupported until the chain
status/reconciliation adapter exists. There is no deletion, expiry purge,
reset, automatic intent release or retransmission API.

`recover` validates all rows and returns frozen public snapshots marked
`recoveryState:'RECONCILE',canAutomaticallyDispatch:false`, including expired
receipts. Corruption rejects instead of silently skipping a record. Close,
unexpected connection close and versionchange invalidate the handle. The host
must compose `store.subscribeInvalidation(callback)` with wallet/app events
when constructing the continuous attempt. A closed handle cannot acknowledge
a later successful claim. `isOpen()` alone does not prove continued persistence
permission or absence of future deletion.

An isolated persistent Chromium133 profile exercised 20 storage scenarios,
including a two-tab claim race, request success followed by real transaction
abort, strict-mode refusal, injected quota exception, metadata mismatch,
post-commit acknowledgement failure, abrupt browser-process SIGKILL/restart and
missing/deleted DB refusal. Five continuous-core cases used actual IndexedDB
claims/outcomes with a synthetic signer/context and fake enqueue, including
storage-close invalidation before enqueue. Persistent-storage permission was
granted only to the isolated test origin by the test harness. This does not
verify the owner's Edge/profile, OS power loss, real quota exhaustion, network
status recovery or installed Phantom.

Run `npm run test:receipt-store-browser` with the optional developer browser
runtime. `PLOV_BROWSER_RUNTIME` identifies the directory containing the pinned
Playwright package and extracted Chromium (the existing v58 runtime is the
local default); `PLOV_CHROMIUM` can override its executable. Set
`PLOV_RECEIPT_RESULTS` for logs/results. The runner uses its own temporary
profile, grants only its origin, and kills only its own browser process for the
recovery case. It never uses a real wallet or sends to a network.

Sources checked2026-10-20: https://www.w3.org/TR/IndexedDB/ (API3 working draft,
strict durability is a hint) and https://storage.spec.whatwg.org/ (bucket
persistence, permission and user/origin removal). Browser-policy handling is
this candidate's design; it is not new owner-approved launch policy. Production
initialization/consent, retention, status reconciliation and UI wiring remain
open. MAINNET_GO=NO.
## Explicit RPC adapter and recovery observations (v75)

`await createSwapRpcAdapter({connection, fetch, timeoutMs})` creates an unmounted
candidate. Pass the **same connection used for verified preparation/refresh** and
an explicitly trusted fetch implementation. The adapter pins its HTTPS endpoint,
rejects URL credentials/fragments, checks genesis on initialization, and rejects
later endpoint changes. No default fetch, wallet, storage, route or RPC is selected.
Initialization performs a read-only genesis request; importing does nothing.
Host wiring must still establish connection identity across the loader, core and
adapter. Genesis/JSON-RPC responses are trusted RPC evidence, not cryptographic
proof of a server's network; same-origin hostile JS/fetch is outside this model.

Bind `adapter.enqueue` to the core's enqueue contract only after the host has
opened/validated the receipt store. The core remains responsible for durable
claim, review/message identity, continuous wallet/storage events and final live
signed refresh. The adapter is not an independent authorization API: it verifies
signatures, canonical bytes, expected first signature and original blockhash, but
does not re-evaluate the approved pools/instructions or review digest itself.

Enqueue synchronously copies bytes and validates signature/blockhash/receipt,
packet length, expiry and safe dispatch slot/height. It enters its one explicit
HTTP request without an intervening await. The payload uses base64 with
`skipPreflight:false`, `preflightCommitment:'confirmed'`, `maxRetries:0` and the
core's final `minContextSlot`. It does not refresh a blockhash, re-sign, retry or
follow redirects. Fetch credentials are omitted, cache is disabled. Each intent
is consumed before fetch; its in-memory latch is supplemental to the durable
store and does **not** survive reload. Do not infer a network exactly-once
guarantee from either latch or `maxRetries:0`.

A bounded timer aborts the request and settles the caller even if an injected
fetch ignores AbortSignal. The HTTP server can still receive/process bytes after
timeout/abort. A wrong RPC signature, RPC/HTTP/JSON error, close, changed endpoint
or timeout rejects; once core enqueue is entered these become UNKNOWN with the
original signature. Never interpret them as a safe reason to release the intent.
Late results do not cause another submission. The adapter never logs signed
bytes; the trusted transport/server necessarily sees and may retain them.

`await adapter.reconcile(receipt, {minContextSlot})` performs one read-only
observation of the original receipt. The host supplies a trusted slot floor (also
on recovery; the v74 receipt does not persist this floor). It checks genesis
again, queries the exact original signature with `searchTransactionHistory:true`,
and rejects stale/malformed status evidence as `UNRESOLVED_RPC`. Processed or
confirmed success/error produces a **nonfinal observation**; finalized produces
`FINALIZED_SUCCESS_OBSERVED` or `FINALIZED_ERROR_OBSERVED`.

For null history it checks the original blockhash at finalized commitment, with
a floor at least the returned status context slot. Results remain
`UNRESOLVED_VALID_BLOCKHASH` or `UNRESOLVED_EXPIRED_BLOCKHASH`. A pruned/partial RPC
can return null for an executed transaction; an invalid hash proves no absence
of past execution. No observation releases or replaces an intent, even after
the local quote deadline. Every result preserves the original receipt state and
signature and has `canAutomaticallyDispatch:false`.

In v75 observations were not persisted as terminal store states. The v76
companion described below adds persistent evidence without changing the v74
receipt schema, which still accepts only DISPATCH_INTENT/PENDING/UNKNOWN.
Host must persist the core's public
outcome using `store.recordOutcome`; if that fails the earlier committed intent
must remain available for reconciliation. No polling scheduler,
receipt-schema migration, UI or production composition is implemented.
**LP-15 remains OPEN and MAINNET_GO=NO.**

Validation: `npm run test:swap-rpc` covers 44 synthetic/mock-fetch cases.
`npm run test:swap-rpc-browser` uses a fresh isolated Chromium persistent profile,
real IndexedDB and actual HTTP to a loopback fixture through an explicit
test-only HTTPS-to-loopback fetch bridge. Its six scenarios cover ACK, claim
event suppression, lost send response, post-dispatch wallet event, wrong returned
signature and HTTP429. The server verifies both signatures and byte digest;
there are zero external requests and no real wallet/mainnet activity. A synthetic
finalized status after a lost response demonstrates reconciliation mechanics,
not actual chain confirmation. Test RPC payloads are ephemeral; delivered
evidence contains public signature/digest/options, never raw signed bytes.

Primary API references (checked 20 October 2026, Dushanbe):
https://solana.com/docs/rpc/http/sendtransaction
https://solana.com/docs/rpc/http/getsignaturestatuses
https://solana.com/docs/rpc/http/isblockhashvalid

## Persistent observation history and replay (v76)

`await openSwapObservationStore({indexedDB, storageManager, databaseName,
receiptStore, rpcIdentities, initialize:false})` opens a **separate companion
database**, not a new version of the receipt DB. `receiptStore` must be the
original module-issued open handle. The companion identity binds its schema,
mainnet genesis, receipt database name/epoch and a copied/sorted approved list of
RPC endpoint SHA-256 identities. It cannot use the receipt database's name.
Missing DB, changed epoch/list/schema/version fail closed. Initialization is an
explicit first-time operation requiring an existing persistent-storage grant;
there is no permission prompt, automatic migration/reset or history import.

`createSwapRpcAdapter` now exposes a frozen `identity` with `rpcIdentity` and
genesis. The digest covers the normalized HTTPS URL, including any query; only
the digest is persisted, never raw endpoint/API credentials. The host must
obtain its allowed identities from the approved connection configuration.
Hash/genesis matching is not cryptographic verification of an RPC server.

`await observations.recordObservation(originalObservation)` requires the exact
frozen object issued by `adapter.reconcile`, validated through a module-private
WeakMap. JSON, a spread clone and fabricated terminal fields are rejected. The
adapter includes its endpoint digest and execution slot in each observation.
Persisted history is read through validation/replay; it is not re-imported as a
new RPC proof. These mechanisms do not constrain hostile same-realm JavaScript.

Before writing, the companion checks the original committed receipt and every
immutable identity field. Dispatch state can differ because delivery outcomes
continue to be stored separately. The companion stores that initial receipt
snapshot and an append-only logical history with sequence, observation,
contextSlot, executionSlot and rpcIdentity. Its `receipt.state` is a snapshot,
not a substitute for `receiptStore.get()` when displaying current delivery state.
There is no two-database transaction; this relies on the receipt API having no
delete/release/identity-replacement operation. Reads/recovery check the original
claim again; missing/mismatched claims reject. Closing the receipt handle closes
the dependent companion.

Each update reads the row, validates/replays its history, appends one event and
puts it in **one strict readwrite transaction**. Concurrent tabs serialize on the
same records store; sequence numbers and both events survive. A result resolves
only on complete and a post-commit policy check. Abort/quota/unsupported strict
reject; an acknowledgment failure after commit may leave the event persisted.
Read before deciding how to recover an ambiguous write; there is no automatic
retry. Strict durability remains a browser hint, not a power-loss guarantee.

Replay rules:

- Context below the highest observed context is retained as STALE and does not
  replace the current projection. Null-context RPC failures remain in history
  without erasing prior evidence. Sequence determines commit order, not wall time.
- The first accepted finalized result is retained through later nonfinal,
  missing-history, timeout or agreeing finalized observations.
- Any finalized success/error contradiction, or a different finalized execution
  slot, latches FINALIZED_CONFLICT. This includes finalized evidence previously
  classified STALE and an older contrary response. All evidence remains visible;
  neither a higher slot nor a third agreeing response clears the conflict.
- A null history/expired blockhash remains unresolved, never definitely absent.
  Every projection and recovered row has canAutomaticallyDispatch=false.

`get(intentId)` and `recover()` return frozen validated projections/history:
receipt snapshot, revision, maxContextSlot, observation, terminalEvidence,
conflict and history with derived dispositions. There is no persisted cached
projection to override contradictory events. Corruption fails the operation;
rows are never silently skipped. A host can combine a trusted initial floor
with the recovered maxContextSlot for its next explicit status query. Reading
is permitted without a writable grant; writing still requires persistence.

Repeated observations are separate sequenced events, not de-duplicated sends.
History has no automatic truncation/purge/retention reset; growth and browser
quota remain production integration concerns. A missing/deleted companion never
releases the receipt claim, and even a finalized observation does not authorize
replacement or new spend. No conflict-resolution API is included.

`npm run test:observation-store` checks 26 pure replay/schema cases.
`npm run test:observation-store-browser` checks real IndexedDB in isolated
Chromium, including cross-tab ordering/conflicts, strict/abort/quota paths,
provenance, binding, permissions and SIGKILL/reopen. `test:swap-rpc-browser` now
also persists and replays the six HTTP integration observations. Browser RPC
statuses/signers remain synthetic; no real wallet/network acceptance is claimed.
The application is still unmounted and trading disabled. Production controller wiring,
UI, independent connection/epoch/list approval and real wallet/RPC acceptance
remain open; **LP-15 remains OPEN and MAINNET_GO=NO**.

## Unified lifecycle candidate (v77)

`createSwapLifecycleController({connection, receiptStore, observationStore,
rpcAdapter, minimumContextSlot})` borrows genuine module-issued handles. The
companion must bind that exact receipt handle; the adapter must bind the exact
same connection object and an approved companion RPC identity. Copied API
objects fail. The initial floor is explicitly supplied by the trusted host,
including after restart; the controller does not invent or recover a missing
dispatch-simulation floor. It combines this floor with persisted observation
maxContextSlot for subsequent explicit queries.

Construction opens no resources and performs no wallet/network requests. The
host separately opens/validates storage and creates the RPC adapter (whose
initialization checks genesis). No default provider/connection/manifest/epoch,
permission flow, wallet discovery/connect, launch authorization or route is added.

`bindSwap({preflight, wallet, readWalletState, subscribe, intentId})` accepts only
the exact verified preflight from prepareVerifiedSwap and its original
connection, prepared/review identities, height and slot. It supplies its own
refreshVerifiedSwapContext, receipt claim and RPC enqueue to the existing core;
callers cannot substitute readContext/claim/enqueue callbacks through this API.
Wallet events and receipt/observation/RPC invalidation share the core lifetime.
Each controller consumes an intent at binding; each bound approval is one-use.

`await attempt.approve()` checks for an existing committed intent before asking
the wallet. If found it returns EXISTING_INTENT with no new prompt/send. A race
between different tabs can still prompt both wallets; the durable unique claim
arbitrates dispatch. A signature/claim interruption returns ATTEMPT_INTERRUPTED
with the original public receipt and PRESENT/NOT_FOUND/UNACKNOWLEDGED claim
readback. None of these results permits automatic retry or replacement. A
rejection before any claim/candidate remains an exception; subscriptions stop.

After core enqueue is entered, the original public receipt is always returned.
The controller records the delivery outcome and reports ACKNOWLEDGED,
PRESENT_AFTER_READBACK or UNACKNOWLEDGED. Readback checks identity and conservative
state rather than blindly repeating a failed write. An already persisted UNKNOWN
is never presented as PENDING after a later matching ACK. Closed/quota-failed
storage does not become a definitely-unsent exception. No signed bytes are
returned or persisted by the controller.

The v77 composition review found that v75 transport preflight used finalized
while preparation, blockhash and signed simulation use confirmed. Transport
preflight is now **confirmed**, with preflight still enabled, maxRetries0 and the
final signed minContextSlot preserved. The loopback test checks all three
commitments. Finalized status observations/invalid-blockhash checks keep their
separate confirmation meaning; this change does not claim real RPC acceptance.

`await controller.recover()` reads/joins the original receipt and observation
stores without signing or network queries. It returns each retained receipt,
projection (or null), combined minimum floor, RECONCILE state and
canAutomaticallyDispatch=false. Orphan/corrupt/mismatched evidence fails closed.
There is no automatic resubmission, release, replacement or polling timer.

`controller.reconcile(intentId)` requires a committed receipt and uses only its
original signature/network evidence. Same-intent concurrent calls on this
controller share one in-flight promise. Different controllers/tabs still use
the companion's atomic history rules. Observation write acknowledgment loss
triggers one readback: matching evidence must occur after the previously read
revision. Equivalent concurrent evidence can satisfy this readback; it is not
an exactly-once write claim. There is no blind retry or second automatic query.

`attempt.dispose()` and `controller.dispose()` detach every available
subscription even if one unsubscribe throws. Controller disposal prevents new
commands and disposes bound attempts; it does **not** close borrowed stores or
the shared RPC adapter. Already-entered send/read operations may finish and
persist public outcomes. A read operation may include its remaining read-only
RPC requests after disposal. There is no disposal-driven signature/send/query.
Post-enqueue cleanup failures remain attached to the receipt. The host owns
closing the borrowed resources and creating any explicit replacement controller.

`npm run test:swap-lifecycle-browser` exercises actual verified-account preflight,
signature-preserving core, both real IndexedDBs, HTTP adapter and controller in
isolated Chromium. Accounts/signer/RPC chain responses are synthetic and the
test-only fetch bridge targets loopback. It covers wrong identities/floors,
existing-intent suppression, ambiguity/quota/readback, disposed/closed resources,
conservative UNKNOWN, coalescing, persisted floors and SIGKILL joined recovery.
Real wallet acceptance, current approved pools/manifest/RPC, production UI wiring, origin bootstrap,
quota/conflict policy and separate release authorization remain open.
**LP-15 remains OPEN; MAINNET_GO=NO; TRADE_LAUNCH_ENABLED=false.**


### v78: read-only recovery panel (unmounted)

`SwapRecoveryPanel` accepts only the controller's `recover` and `reconcile`
methods. Mounting, SSR/hydration and React StrictMode do not read history or
query RPC. The user explicitly loads local history and checks an original
signature. There are no wallet, signing, send, replacement, reset or release
controls. The panel is not imported by application routes.

The presentation session copies public values and history fingerprints into
immutable snapshots. Shape validation is a presentation guard, not proof of
source authenticity: the host must supply the genuine lifecycle controller.
History-prefix rollback/rewrite, unrelated receipts and acknowledgments without
matching saved evidence are rejected. A failed reread retains cards as stale;
a missing previously loaded row stays visible. Neither appears as empty history.
An unacknowledged observation masks the old successful display, and a local
history reload cannot clear that warning. Saved finalized conflicts remain
explicit. Local quote expiry never implies transaction failure.

The session locks actions synchronously and ignores responses from an obsolete
subscription generation, changed source or unmounted component. It never closes
or disposes the borrowed controller. Error details are replaced by fixed RU/EN
messages. Full original signatures wrap on mobile; status messages use live
regions and the history action supports keyboard operation.

`npm run test:swap-recovery-panel` covers the presentation session and RU/EN SSR.
`npm run test:swap-recovery-panel-browser` runs the actual lifecycle harness plus
React hydration/StrictMode, both IndexedDBs, explicit reconciliation persistence,
read failures, missing rows, duplicate actions, source replacement, unmount and
mobile/keyboard rendering. The browser uses synthetic accounts/signatures and
loopback RPC; its test-only durable-storage grant is not production bootstrap.
These checks do not establish real Phantom acceptance or production browser,
approved-pool, origin/quota/conflict-policy readiness. Production wiring and
separate launch authorization remain open. **LP-15 remains OPEN.**

### v79: explicit isolated recovery host (rehearsal only)

`createSwapRecoveryHost` owns the receipt/observation handles, RPC adapter and
lifecycle controller that it opens. It exposes only a read-only `source`
(`recover`/`reconcile`), explicit `open`/`close` and immutable observable state.
Construction, subscription and the unmounted `SwapRecoveryHostPanel` do not
open databases or query RPC. The React caller owns the host: unmounting the
view does not close it. No application route imports these components.

This candidate accepts **only** `scope: ISOLATED_REHEARSAL` and an exact
`http://127.0.0.1[:port]` origin. It is not production bootstrap or a launch
authorization mechanism. The original v79 configuration supplied schema1, distinct
database names, epoch, canonical HTTPS endpoint, approved SHA256 RPC digest list,
safe slot floor and bounded RPC timeout. These are trusted caller inputs, not
inferred approvals. The host compares the supplied `readOrigin` result and
borrowed connection endpoint at asynchronous boundaries and before source use;
the host cannot authenticate a dishonest caller or hostile same-realm script.

Opening validates the endpoint digest before storage, opens both existing DBs
with `initialize:false`, checks their full identities/policy, then creates the
adapter (one genesis request) and genuine controller. It never requests
persistence, initializes/recreates/deletes storage, discovers/connects a wallet,
binds a swap, signs, sends or automatically loads/checks history. Missing DBs,
wrong epoch/RPC list/origin/endpoint/genesis and acquisition errors are terminal
for that instance, with fixed public errors and no fallback. Existing history
may be read without persistence grant; an explicit status check can return an
unacknowledged observation when durable writes are unavailable.

Duplicate/reentrant opens share one promise. Close is terminal: it aborts the
owned fetch signal, disposes the controller, detaches subscriptions and closes
the owned adapter/stores while leaving the borrowed connection and other store
handles alone. Handles acquired after close are cleaned when acquisition settles;
late results cannot publish READY or escape through `source`. Fetch body abort
remains wired until JSON consumption. A fetch ignoring abort is still bounded
by the adapter timeout; pending IDB acquisition is not given a new timeout or
automatic retry. Cleanup exceptions do not prevent remaining cleanup and are
reported separately. Native store invalidation closes the host.

`test:swap-recovery-host` covers inert construction, configuration rejection,
SSR and terminal closure. `test:swap-recovery-host-browser` also runs the prior
lifecycle32/UI12 scenarios, then exercises the actual host with both native
IndexedDBs, React, the genuine controller and loopback RPC, including missing
DBs, policy errors, timeout/body abort, late acquisition, reentrant subscribers,
cleanup exceptions and native versionchange. Fixtures explicitly initialize
their separate test databases and grant persistence outside the host. This
does not establish a production origin/epoch policy, current approved markets,
quota/history/conflict policy, real Phantom/chain acceptance or launch GO.
**LP-15 remains OPEN; MAINNET_GO=NO; TRADE_LAUNCH_ENABLED=false.**


### v80: logical history write budgets and retained conflict witnesses

The rehearsal host now requires **configuration schema2** and an explicit
`observationWritePolicy` with version1, maxRecords, maxEventsPerRecord,
maxEventsTotal and maxSerializedBytes. Old schema1 host configurations reject;
the receipt/observation databases remain schema1, with no migration or new
persistent metadata. Test values are fixtures, not approved production limits.

A configured companion checks each proposed append in the same native records
readwrite transaction as the final put. It replaces the target row in the
logical calculation and scans other records by cursor, replay-validating them.
Counts and the sum of UTF8 JSON record-value bytes must fit all caps. Concurrent
compliant tabs with the same policy cannot both spend the last available event,
record or byte. This measures logical serialized record values, not IndexedDB
disk allocation, identity-store overhead, storage estimation or free disk space.
The browser may still reject a below-limit write with QuotaExceededError.

Cap failure aborts the transaction, preserving previous evidence and the public
receipt. No trimming, deletion, eviction, sequence reset, automatic cap increase,
retry or replacement is performed. A cap lower than existing history permits
reading/recovery but rejects further over-limit appends. The scan/replay and
legacy reads are not memory- or wall-clock bounded by these new limits.

The optional store-level writePolicy defaults to null for legacy integration;
only the rehearsal host requires explicit limits. Policy is copied per handle
and **is not stored in the DB identity**. Different/unbounded legacy writers can
bypass another handle's policy; consistent host approval and a production policy
protocol remain open. This is a compliant-writer budget, not adversarial quota
isolation or a completed production retention policy.

Lifecycle results add observationWriteIssue: null for acknowledged/readback
presence, HISTORY_LIMIT for module-branded budget rejection, STORAGE_QUOTA for
reported QuotaExceededError, otherwise UNACKNOWLEDGED. Successful readback still
requires matching evidence after the prior revision; equivalent concurrent
presence is allowed. Classification is advisory and never authorizes a send.

The RU/EN panel displays distinct cap/quota warnings and masks the old successful
status. Local reread alone cannot clear a warning in that UI session; a saved
fresh check can. **Warnings about unsaved answers are volatile**: this change
cannot make a failed write durable or reconstruct that missing response after
restart. Reconciliation queries happen before append-budget enforcement; a new
answer, including a contradiction, may remain unsaved when the cap/disk quota is
exhausted. A retained history is not proof that no such answer was seen.

For an already stored FINALIZED_CONFLICT, expandable details show the first
saved finalized witness and first contrary outcome/execution-slot witness,
with context/execution slots and full RPC SHA256 identity. Only two entries
render; neither is ranked as truth. Saved conflict remains explicit even when
a subsequent response cannot be stored. There is no resolve/clear/delete action.

`test:observation-policy` checks logical budgets; `test:observation-policy-browser`
adds actual IndexedDB byte/count boundaries, a two-tab last-event race,
unchanged prior records, lower policy/reopen, genuine adapter provenance,
controller/host propagation, injected QuotaExceededError, RU/EN warnings and
mobile conflict detail. Chain responses in these new policy scenarios are
synthetic fetch responses; they do not add real-chain or disk-exhaustion proof.
Production policy/limits, durable treatment of unsaved answers, quota/conflict
operations, real Phantom/chain acceptance and separate launch GO remain open.
**LP-15 remains OPEN; MAINNET_GO=NO; TRADE_LAUNCH_ENABLED=false.**

### v81: explicit local evidence export and offline integrity check

The unmounted rehearsal host view offers a manual JSON download using only
source.recover. Rendering/SSR, including development StrictMode effect replay,
does not read storage, query RPC, upload, write or download. The export includes
public receipt fields, explicit recovered floors and complete saved observation
histories. Source changes/unmount invalidate pending work; synchronous duplicate
clicks share the busy lock. Object URLs are revoked after initiating download.
The UI says the file was prepared, not that the user saved it successfully.

createRecoveryEvidence copies/validates before hashing awaits, replays every
saved history with projectObservationRecord and rejects mismatched identity,
projection, dispositions, floor, duplicate intents and unexpected fields.
Only the defined public schema is serialized; endpoint URLs/configuration,
arbitrary errors, signed transaction bytes and volatile UI attention are absent.
Rows sort deterministically. The entire operation rejects, without truncation,
above 1000 rows, 10000 saved events or 4MiB canonical JSON output. These are
export bounds, not retention limits or a memory bound on upstream recover.

The version1 envelope contains a canonical saved-local-snapshot payload and
SHA256 of its compact canonical UTF8 JSON. verifyRecoveryEvidence checks bounds,
strict schema, replay, digest and the exact generated pretty-JSON/newline format.
Duplicate JSON keys, changed whitespace/order, unknown fields and modified
content therefore reject. It does no network/storage access and exposes no
import/restore/send API. Parsed/verified values cannot become module-branded
RPC observations and remain ineligible for recordObservation.

A checksum is not a digital signature: anyone can change the data and compute
a fresh digest. Successful verification proves internal consistency with that
checksum, not RPC/source authenticity, real-chain execution, capture time or
complete evidence. The payload always says UNSAVED_RESPONSES_UNKNOWN; a fresh
read cannot reconstruct failed writes or volatile warnings. Controller recovery
still joins separate databases rather than taking an atomic two-DB snapshot.
The export is for manual analysis and cannot resolve FINALIZED_CONFLICT.

test:recovery-evidence covers canonical replay/integrity and RU/EN SSR.
test:recovery-evidence-browser runs prior lifecycle/UI/host/policy scenarios and
adds actual Chromium downloads, independent Node SHA256 verification, rejected
file-as-proof use, development StrictMode, duplicate clicks, fixed errors,
source replacement/unmount and genuine read-only host wiring. It uses synthetic
accounts/signer/RPC responses and loopback fixtures, not real Phantom/chain
acceptance. No application route mounts the export/recovery UI.


### v82: production readiness review and target-wallet protocol

The source-pinned [readiness inventory](trading-release-gates.json) and
[Russian acceptance plan](phantom-acceptance-plan-ru.md) separate eight open
production gates from historical local test results. The acceptance record is
entirely NOT_RUN/null; the files are not executable authorization or a ready
wallet package. No application code, dependencies, route, feature flag, wallet
request, funding or network submission changes in v82. No runtime test is
claimed newly rerun for this documentation-only block.

The plan distinguishes independent private sign-only acceptance from full
storage/send acceptance and release GO, keeps the retired v67 probe closed,
and maps current traditional Phantom limitations to the actual source modules.
Current LP-03/09/13/15/17/18 gaps remain open. The owner-deferred budget and
60PLOV decisions are not reopened. **LP-15 OPEN; MAINNET_GO=NO.**
