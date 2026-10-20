'use strict';
const assert = require('node:assert/strict');
module.exports = async ({ page, out }) => {
  const result = await page.evaluate(async () => {
    const E = PLOVTradeEngine, cases = [];
    const ensure = (ok, message) => { if (!ok) throw Error(message); };
    const rejected = async (fn, pattern) => {
      try { await fn(); } catch (e) { ensure(pattern.test(String(e)), 'Unexpected error: ' + e); return; }
      throw Error('Expected rejection');
    };
    const key = E.Keypair.fromSeed(Uint8Array.from({ length: 32 }, () => 91));
    let forbidden = 0;
    const test = async (name, run) => {
      const mode = 'phantom_controller_' + cases.length;
      await make(mode);
      const listeners = new Map(), appListeners = new Set();
      const q = { mode, prompts: 0, stops: 0, removals: [], simulations: [], behavior: null, cleanupHook: null, maxStops: 1 };
      const no = () => { forbidden++; throw Error('Forbidden connect/fallback/direct send'); };
      q.provider = {
        isPhantom: true, isConnected: true, publicKey: key.publicKey,
        connect: no, signAndSendTransaction: no, signAllTransactions: no,
        on(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); if (q.onHook) q.onHook(event); },
        removeListener(event, fn) { q.removals.push(event); listeners.get(event)?.delete(fn); },
        async signTransaction(tx) {
          ensure(this === q.provider, 'Provider receiver changed'); q.prompts++;
          ensure([...listeners.values()].filter(s => s.size === 1).length === 3 && appListeners.size === 1, 'Provider/app event lifetime absent');
          if (q.behavior) return q.behavior(tx);
          tx.partialSign(key); return tx;
        },
      };
      q.emit = event => { for (const fn of [...(listeners.get(event) || [])]) fn(); };
      q.appEmit = () => { for (const fn of [...appListeners]) fn(); };
      q.preflight = await h.prepare();
      const simulate = h.connection.simulateTransaction;
      h.connection.simulateTransaction = async (tx, cfg) => { q.simulations.push(cfg.sigVerify); return simulate(tx, cfg); };
      h.connection.sendTransaction = no; h.connection.sendRawTransaction = no;
      q.subscribeApp = fn => { appListeners.add(fn); return () => { q.stops++; appListeners.delete(fn); if (q.cleanupHook) q.cleanupHook(); }; };
      q.bind = (overrides = {}) => E.bindInjectedPhantomSwapAttempt({
        controller: h.controller, provider: q.provider, preflight: q.preflight, intentId: 'injected_' + mode,
        readAppState: () => h.state,
        subscribeAppState: q.subscribeApp,
        ...overrides,
      });
      const fetchOriginal = window.fetch;
      try {
        await run(q);
        ensure([...listeners.values()].every(s => s.size === 0) && appListeners.size === 0, 'Listener leak');
        ensure(q.stops <= q.maxStops, 'App cleanup repeated');
        const receipts = await h.receipts.recover();
        ensure(forbidden === 0 && h.prompts === 0, 'Fallback or generic-wallet path entered');
        cases.push({ name, status: 'PASS', mode, syntheticSignCalls: q.prompts, receipts: receipts.map(r => ({ intentId: r.intentId, state: r.state })) });
      } finally {
        window.fetch = fetchOriginal;
        h.controller.dispose(); h.receipts.close(); h.observations.close(); h.rpc.close();
      }
    };
    const stable = async q => {
      q.maxStops = 2;
      const attempt = q.bind();
      ensure(q.prompts === 0 && !h.sendEntered && q.simulations.length === 0 && h.receiptChecks === 0 && h.observationChecks === 0, 'Binding performed source work');
      const result = await attempt.approve();
      ensure(result.phase === 'ENQUEUE_ENTERED' && result.receipt.state === 'PENDING' && result.outcomePersistence === 'ACKNOWLEDGED', 'Delivery not durably acknowledged');
      ensure(result.canAutomaticallyDispatch === false && q.prompts === 1 && q.stops === 1, 'Lifetime/one-use mismatch');
      ensure(q.simulations.join(',') === 'false,true,true', 'Missing final signed refresh after durable claim');
      await rejected(() => attempt.approve(), /already used/);
      h.controller.dispose(); h.controller = h.create();
      const fresh = await h.prepare(), next = q.bind({ preflight: fresh });
      ensure((await next.approve()).phase === 'EXISTING_INTENT' && q.prompts === 1, 'Existing intent prompted again');
      const recovered = await h.controller.recover();
      ensure(recovered.length === 1 && recovered[0].receipt.signature === result.receipt.signature, 'Original receipt lost');
      const reconciled = await h.controller.reconcile(result.receipt.intentId);
      ensure(reconciled.projection.observation === 'FINALIZED_SUCCESS_OBSERVED' && reconciled.receipt.signature === result.receipt.signature, 'Original signature not reconciled');
      ensure(q.stops === 2, 'Each binding must clean up exactly once');
    };
    await test('shared provider adapter signs, claims, sends once and reconciles original signature', stable);
    for (const event of ['connect', 'accountChanged', 'disconnect']) {
      await test(event + ' before approval prevents signature, intent and send', async q => {
        const attempt = q.bind(); q.emit(event);
        await rejected(() => attempt.approve(), /session changed/);
        ensure(q.prompts === 0 && !h.sendEntered && (await h.receipts.recover()).length === 0, 'Invalidation advanced');
      });
      await test(event + ' during wallet await prevents durable claim and send', async q => {
        let enter, resolve;
        const entered = new Promise(r => { enter = r; });
        q.behavior = tx => new Promise(r => { resolve = () => { tx.partialSign(key); r(tx); }; enter(); });
        const pending = q.bind().approve(); await entered; q.emit(event); resolve();
        await rejected(() => pending, /session changed/);
        ensure(q.prompts === 1 && !h.sendEntered && (await h.receipts.recover()).length === 0, 'Late signed result advanced');
      });
      await test(event + ' at native claim commit preserves intent without dispatch', async q => {
        const original = IDBObjectStore.prototype.add;
        IDBObjectStore.prototype.add = function (...args) {
          if (this.name === 'receipts') this.transaction.addEventListener('complete', () => q.emit(event), { once: true });
          return original.apply(this, args);
        };
        try {
          const result = await q.bind().approve();
          ensure(result.phase === 'ATTEMPT_INTERRUPTED' && result.claimPersistence === 'PRESENT' && result.receipt.state === 'DISPATCH_INTENT' && !h.sendEntered, 'Committed intent not retained');
        } finally { IDBObjectStore.prototype.add = original; }
      });
    }
    await test('account null and return cannot clear the invalidation latch', async q => {
      const attempt = q.bind(); q.provider.publicKey = null; q.emit('accountChanged');
      q.provider.publicKey = key.publicKey; q.emit('accountChanged');
      await rejected(() => attempt.approve(), /session changed/); ensure(q.prompts === 0 && !h.sendEntered, 'Round trip cleared latch');
    });
    for (const field of ['network', 'launchEnabled']) await test(field + ' round trip before approval remains invalid', async q => {
      const attempt = q.bind(), old = h.state[field];
      h.state[field] = field === 'network' ? 'devnet' : false; q.appEmit(); h.state[field] = old; q.appEmit();
      await rejected(() => attempt.approve(), /session changed/); ensure(q.prompts === 0 && !h.sendEntered, 'App round trip cleared latch');
    });
    await test('invalidation inside final post-claim refresh retains committed intent', async q => {
      const simulate = h.connection.simulateTransaction;
      let after = 0;
      h.connection.simulateTransaction = async (tx, cfg) => {
        const result = await simulate(tx, cfg);
        if (cfg.sigVerify && ++after === 2) q.emit('accountChanged');
        return result;
      };
      const result = await q.bind().approve();
      ensure(result.phase === 'ATTEMPT_INTERRUPTED' && result.claimPersistence === 'PRESENT' && !h.sendEntered, 'Final refresh invalidation dispatched');
    });
    for (const action of ['disconnect', 'dispose', 'cleanup_failure', 'ack_lost']) await test(action + ' after transport entry preserves outcome without resend', async q => {
      const original = window.fetch;
      let entered = 0;
      if (action === 'cleanup_failure') q.cleanupHook = () => { throw Error('synthetic app cleanup'); };
      window.fetch = (url, init) => {
        const promise = original(url, init);
        if (JSON.parse(init?.body || '{}').method === 'sendTransaction') {
          entered++;
          if (action === 'disconnect') { q.provider.isConnected = false; q.emit('disconnect'); }
          if (action === 'dispose') h.controller.dispose();
          if (action === 'ack_lost') { q.emit('accountChanged'); return promise.then(async response => { await response.json(); throw Error('synthetic lost acknowledgment'); }); }
        }
        return promise;
      };
      const result = await q.bind().approve();
      ensure(entered === 1 && result.phase === 'ENQUEUE_ENTERED' && result.receipt.state === (action === 'ack_lost' ? 'UNKNOWN' : 'PENDING') && result.outcomePersistence === 'ACKNOWLEDGED', 'Post-entry error lost delivery');
      ensure(result.canAutomaticallyDispatch === false, 'Automatic dispatch allowed');
      if (action === 'cleanup_failure') ensure(result.receipt.cleanupFailed === true, 'Cleanup failure hidden');
      ensure((await h.receipts.get(result.receipt.intentId)).signature === result.receipt.signature, 'Receipt identity lost');
      if (action === 'ack_lost') {
        const reconciled = await h.controller.reconcile(result.receipt.intentId);
        ensure(reconciled.receipt.state === 'UNKNOWN' && reconciled.receipt.signature === result.receipt.signature && reconciled.projection.observation === 'FINALIZED_SUCCESS_OBSERVED' && entered === 1, 'Lost ACK resent or lost original signature');
      }
    });
    await test('4001 refusal leaves no intent and never falls back to send', async q => {
      q.behavior = () => { throw Object.assign(Error('synthetic 4001 rejection'), { code: 4001 }); };
      await rejected(() => q.bind().approve(), /4001 rejection/);
      ensure(q.prompts === 1 && !h.sendEntered && (await h.receipts.recover()).length === 0, 'Rejection persisted delivery');
    });
    await test('missing WSOL signature is refused before native claim', async q => {
      q.behavior = tx => { tx.sign(key); return tx; };
      await rejected(() => q.bind().approve(), /signature/i);
      ensure(!h.sendEntered && (await h.receipts.recover()).length === 0, 'Invalid signature claimed intent');
    });
    await test('sign-only and dispatch cannot bind the same review', async q => {
      const session = E.createInjectedPhantomReviewSession({ provider: q.provider, connection: h.connection, preflight: q.preflight, readAppState: () => h.state, subscribeAppState: q.subscribeApp });
      try { await rejected(() => q.bind(), /already bound/); } finally { session.dispose(); }
      ensure(q.prompts === 0 && !h.sendEntered, 'Shared binding prompted');
    });
    await test('partial provider registration rollback leaves no app or resource lifetime', async q => {
      q.onHook = event => { if (event === 'accountChanged') throw Error('synthetic registration'); };
      await rejected(() => q.bind(), /synthetic registration/);
      ensure(q.removals.join(',') === 'connect,accountChanged' && q.stops === 0 && !h.sendEntered, 'Partial registration leaked');
    });
    await test('unsupported sign-only provider is refused before controller binds', async q => {
      q.provider.signTransaction = undefined;
      await rejected(() => q.bind(), /sign-only provider/); ensure(q.prompts === 0 && !h.sendEntered, 'Fallback entered');
    });
    return { cases, forbidden };
  });
  const modes = new Set(result.cases.map(c => c.mode));
  const requests = out.requests.filter(q => modes.has(q.mode));
  const sends = requests.filter(q => q.method === 'sendTransaction');
  assert.equal(sends.length, 5);
  for (const entry of sends) {
    assert.equal(sends.filter(q => q.mode === entry.mode).length, 1);
    assert.equal(entry.options.skipPreflight, false);
    assert.equal(entry.options.preflightCommitment, 'confirmed');
    assert.equal(entry.options.minContextSlot, 100);
    assert.equal(entry.options.maxRetries, 0);
  }
  assert.equal(result.forbidden, 0);
  out.phantomControllerCases = result.cases;
  out.phantomControllerChecks = result.cases.length;
  out.phantomControllerLoopbackSends = sends.length;
  out.phantomControllerScope = 'SHARED_INJECTED_PROVIDER_BINDINGS_THROUGH_GENUINE_CONTROLLER_2IDB_HTTP; SYNTHETIC_PROVIDER_ACCOUNTS_RPC_NOT_INSTALLED_PHANTOM_OR_MAINNET';
};
