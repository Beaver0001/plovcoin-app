'use strict';
const assert = require('node:assert/strict');

// Exercise the shipped adapter, account verification and both simulation phases.
// This provider signs with a public fixture seed, never an extension or owner key.
module.exports = async ({ page, out }) => {
  const before = out.requests.length;
  const result = await page.evaluate(async () => {
    const E = PLOVTradeEngine, cases = [];
    const ensure = (ok, message) => { if (!ok) throw Error(message); };
    const rejects = async (fn, pattern) => {
      try { await fn(); } catch (error) {
        ensure(pattern.test(String(error)), 'Unexpected rejection: ' + error);
        return error;
      }
      throw Error('Expected rejection');
    };
    await make('phantom_sign_only');
    const key = E.Keypair.fromSeed(Uint8Array.from({ length: 32 }, () => 91));
    const other = E.Keypair.fromSeed(Uint8Array.from({ length: 32 }, () => 92));
    let forbiddenCalls = 0;
    const forbidden = () => { forbiddenCalls++; throw Error('Forbidden submission/connection'); };
    h.connection.sendTransaction = forbidden;
    h.connection.sendRawTransaction = forbidden;
    const original = { ...h.connection };
    const test = async (name, run) => {
      Object.assign(h.connection, original);
      h.state = { launchEnabled: true, wallet: fixture.wallet, network: 'mainnet-beta' };
      const preflight = await h.prepare(), events = new Map(), appEvents = new Set();
      const q = { preflight, prompts: 0, stops: 0, removed: [], simulations: [], behavior: null, onHook: null, stopHook: null };
      const simulate = h.connection.simulateTransaction;
      h.connection.simulateTransaction = async (tx, config) => {
        q.simulations.push({ signatureVerification: config.sigVerify, minimumSlot: config.minContextSlot, commitment: config.commitment, replacement: config.replaceRecentBlockhash });
        return simulate(tx, config);
      };
      q.provider = {
        isPhantom: true, isConnected: true, publicKey: key.publicKey,
        connect: forbidden, signAndSendTransaction: forbidden, signAllTransactions: forbidden,
        on(event, fn) {
          if (!events.has(event)) events.set(event, new Set());
          events.get(event).add(fn);
          if (q.onHook) q.onHook(event);
        },
        removeListener(event, fn) { q.removed.push(event); events.get(event)?.delete(fn); },
        async signTransaction(tx) {
          ensure(this === q.provider, 'Provider receiver lost');
          q.prompts++;
          ensure(events.size === 3 && [...events.values()].every(s => s.size === 1) && appEvents.size === 1, 'Listeners missing at prompt');
          if (q.behavior) return q.behavior(tx);
          tx.partialSign(key); return tx;
        },
      };
      q.emit = event => { for (const fn of [...(events.get(event) || [])]) fn(); };
      q.appEmit = () => { for (const fn of [...appEvents]) fn(); };
      q.open = (overrides = {}) => E.createInjectedPhantomReviewSession({
        provider: q.provider, connection: h.connection, preflight: q.preflight,
        readAppState: () => h.state,
        subscribeAppState: fn => { appEvents.add(fn); return () => { q.stops++; appEvents.delete(fn); if (q.stopHook) q.stopHook(); }; },
        ...overrides,
      });
      q.clean = () => {
        ensure([...events.values()].every(s => s.size === 0) && appEvents.size === 0, 'Leaked listener');
        ensure(q.stops <= 1, 'Repeated app cleanup');
      };
      await run(q);
      q.clean();
      ensure(forbiddenCalls === 0 && !h.sendEntered, 'Unexpected submission or connection');
      cases.push({ name, status: 'PASS', syntheticSignCalls: q.prompts });
    };

    await test('verified sign-only preserves the WSOL signature and exact message', async q => {
      const session = q.open(), tx = await session.sign();
      ensure(q.prompts === 1 && tx.signatures.length === 2 && tx.verifySignatures(true), 'Both signatures required');
      ensure(tx.serializeMessage().every((byte, i) => byte === q.preflight.prepared.message[i]) && tx.serializeMessage().length === q.preflight.prepared.message.length, 'Message changed');
      ensure(q.simulations.length === 2 && q.simulations[0].signatureVerification === false && q.simulations[1].signatureVerification === true, 'Both refresh phases required');
      ensure(q.simulations.every(s => s.commitment === 'confirmed' && s.minimumSlot === fixture.slot && s.replacement === false), 'Simulation policy changed');
      await rejects(() => session.sign(), /already used/);
      session.dispose(); ensure(q.stops === 1, 'Cleanup must be once');
    });
    await test('wallet replacing all signatures loses WSOL signer and is rejected', async q => {
      q.behavior = tx => { tx.sign(key); return tx; };
      await rejects(() => q.open().sign(), /signature/i);
      ensure(q.prompts === 1 && q.simulations.length === 1, 'Bad signature reached post-sign simulation');
    });
    await test('provider returning a changed blockhash is rejected', async q => {
      q.behavior = tx => { tx.recentBlockhash = other.publicKey.toBase58(); tx.partialSign(key); return tx; };
      await rejects(() => q.open().sign(), /signature|changed/i);
    });
    await test('4001 rejection remains a rejection without fallback or retry', async q => {
      q.behavior = () => { throw Object.assign(Error('synthetic rejected'), { code: 4001 }); };
      const session = q.open(), error = await rejects(() => session.sign(), /synthetic rejected/);
      ensure(error.code === 4001 && q.prompts === 1, 'Rejection changed');
      await rejects(() => session.sign(), /already used/);
    });
    await test('unsupported sign-only provider is refused without signAndSend fallback', async q => {
      q.provider.signTransaction = undefined;
      await rejects(() => q.open(), /sign-only provider/); ensure(q.prompts === 0, 'Prompted unsupported provider');
    });
    await test('disconnected provider is refused before prompting', async q => {
      q.provider.isConnected = false;
      await rejects(() => q.open(), /session changed/); ensure(q.prompts === 0, 'Prompted disconnected wallet');
    });
    await test('wrong connected account is refused before prompting', async q => {
      q.provider.publicKey = other.publicKey;
      await rejects(() => q.open(), /session changed/); ensure(q.prompts === 0, 'Prompted wrong wallet');
    });
    for (const event of ['connect', 'accountChanged', 'disconnect']) {
      await test(event + ' before signing permanently invalidates the review', async q => {
        const session = q.open(); q.emit(event);
        await rejects(() => session.sign(), /session changed/); ensure(q.prompts === 0, 'Prompted invalidated wallet');
      });
      await test(event + ' during pending signature rejects the returned signed transaction', async q => {
        let entered, resolve;
        const pending = new Promise(r => { entered = r; });
        q.behavior = tx => new Promise(r => { resolve = () => { tx.partialSign(key); r(tx); }; entered(); });
        const session = q.open(), signing = session.sign();
        await pending; q.emit(event); resolve();
        await rejects(() => signing, /session changed/);
        ensure(q.prompts === 1 && q.simulations.length === 1, 'Invalidated signature advanced');
      });
    }
    await test('accountChanged null and round trip stay invalidated', async q => {
      const session = q.open();
      q.provider.publicKey = null; q.emit('accountChanged');
      q.provider.publicKey = key.publicKey; q.emit('accountChanged');
      await rejects(() => session.sign(), /session changed/); ensure(q.prompts === 0, 'Round trip cleared latch');
    });
    for (const field of ['network', 'launchEnabled']) {
      await test(field + ' app round trip permanently invalidates review', async q => {
        const session = q.open(), old = h.state[field];
        h.state[field] = field === 'network' ? 'devnet' : false; q.appEmit();
        h.state[field] = old; q.appEmit();
        await rejects(() => session.sign(), /session changed/); ensure(q.prompts === 0, 'App round trip cleared latch');
      });
    }
    await test('dispose while wallet prompt is pending rejects late signature', async q => {
      let entered, resolve;
      const pending = new Promise(r => { entered = r; });
      q.behavior = tx => new Promise(r => { resolve = () => { tx.partialSign(key); r(tx); }; entered(); });
      const session = q.open(), signing = session.sign();
      await pending; session.dispose(); resolve();
      await rejects(() => signing, /session changed/); ensure(q.stops === 1, 'Dispose cleanup repeated');
    });
    await test('copied preflight is refused by genuine binding before signature request', async q => {
      await rejects(() => q.open({ preflight: { ...q.preflight } }).sign(), /Unknown verified preflight/);
      ensure(q.prompts === 0, 'Copied preflight prompted');
    });
    await test('same review cannot be bound to a second wallet lifetime', async q => {
      const session = q.open();
      await rejects(() => q.open(), /already bound/); session.dispose();
    });
    await test('provider subscription that installs then throws is rolled back', async q => {
      q.onHook = event => { if (event === 'accountChanged') throw Error('synthetic on failed'); };
      await rejects(() => q.open(), /synthetic on failed/);
      ensure(q.removed.join(',') === 'connect,accountChanged' && q.stops === 0, 'Partial registration cleanup failed');
    });
    await test('app cleanup failure still removes all provider listeners', async q => {
      q.stopHook = () => { throw Error('synthetic stop failed'); };
      await rejects(() => q.open().sign(), /cleanup failed/);
      ensure(q.removed.join(',') === 'connect,accountChanged,disconnect', 'Provider listeners not all removed');
    });
    await test('fee changed after preflight prevents wallet prompt', async q => {
      h.connection.getFeeForMessage = async () => ({ context: { slot: fixture.slot }, value: 10001 });
      await rejects(() => q.open().sign(), /fee changed/); ensure(q.prompts === 0, 'Stale fee prompted');
    });
    await test('post-sign simulation failure prevents successful sign-only result', async q => {
      const simulate = h.connection.simulateTransaction;
      h.connection.simulateTransaction = async (tx, config) => {
        const result = await simulate(tx, config);
        return config.sigVerify ? { ...result, value: { err: { InstructionError: [0, 'synthetic'] } } } : result;
      };
      await rejects(() => q.open().sign(), /Simulation failed/); ensure(q.prompts === 1, 'Post-sign check not reached');
    });
    await test('blockhash expiring during wallet signature is rejected', async q => {
      q.behavior = tx => { tx.partialSign(key); h.connection.getBlockHeight = async () => 21; return tx; };
      await rejects(() => q.open().sign(), /Blockhash expired/);
    });
    await test('wrong genesis after wallet signature is rejected', async q => {
      q.behavior = tx => { tx.partialSign(key); h.connection.getGenesisHash = async () => 'wrong-chain'; return tx; };
      await rejects(() => q.open().sign(), /Wrong chain/);
    });
    await test('corrupted program bytes after wallet signature are rejected', async q => {
      q.behavior = tx => {
        tx.partialSign(key);
        const read = h.connection.getMultipleAccountsInfoAndContext;
        h.connection.getMultipleAccountsInfoAndContext = async keys => {
          const result = await read(keys);
          const account = result.value[keys.findIndex(key => key.toBase58() === fixture.manifest.programData)];
          if (account) account.data[account.data.length - 1] ^= 1;
          return result;
        };
        return tx;
      };
      await rejects(() => q.open().sign(), /Program bytes changed/);
    });
    Object.assign(h.connection, original);
    const receipts = await h.receipts.recover();
    ensure(receipts.length === 0 && forbiddenCalls === 0 && !h.sendEntered, 'Sign-only created delivery state');
    h.controller.dispose(); h.receipts.close(); h.observations.close(); h.rpc.close();
    return { cases, forbiddenCalls, receiptCount: receipts.length };
  });
  assert.equal(out.requests.length, before + 1); // Explicit fixture setup genesis only.
  assert.equal(out.requests.at(-1).method, 'getGenesisHash');
  assert.equal(out.requests.filter(q => q.mode === 'phantom_sign_only' && q.method === 'sendTransaction').length, 0);
  assert.equal(result.forbiddenCalls, 0);
  assert.equal(result.receiptCount, 0);
  out.phantomCases = result.cases;
  out.phantomChecks = result.cases.length;
  out.phantomScope = 'SHIPPED_INJECTED_ADAPTER_WITH_VERIFIED_SYNTHETIC_PREFLIGHT; BOTH_SIGNATURES_CHECKED; NO_EXTENSION_OR_MAINNET_OR_DISPATCH';
};
