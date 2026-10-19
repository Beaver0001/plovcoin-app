// Local integration candidate. No RPC, wallet discovery, signing or submission.
export const TRADE_LAUNCH_ENABLED = false;
export const PLOV_MINT = "B4LhtMwbKh8D1nfj7dE6FefKpg7U2qkbYC371DBcJq9x";

export interface SwapReviewData {
  id: string;
  side: "BUY" | "SELL";
  wallet: string;
  network: "mainnet-beta";
  mint: string;
  poolAddresses: string[];
  amountIn: bigint;
  quotedOut: bigint;
  minimumOut: bigint;
  messageFee: bigint;
  temporaryRent: bigint;
  newAtaRent: bigint;
  extraReserve: bigint;
  expiresAtMs: number;
}

export function upfrontRequired(review: SwapReviewData): bigint {
  if ((review.side !== "BUY" && review.side !== "SELL") || !review.wallet || !review.id) throw new Error("Invalid review identity");
  for (const n of [review.amountIn, review.quotedOut, review.minimumOut]) {
    if (typeof n !== "bigint" || n <= 0n) throw new Error("Invalid swap amount");
  }
  for (const n of [review.messageFee, review.temporaryRent, review.newAtaRent, review.extraReserve]) {
    if (typeof n !== "bigint" || n < 0n) throw new Error("Unknown or invalid cost");
  }
  if (review.minimumOut > review.quotedOut || review.mint !== PLOV_MINT || review.network !== "mainnet-beta") {
    throw new Error("Unsupported review");
  }
  if (!Number.isSafeInteger(review.expiresAtMs) || review.poolAddresses.length < 1 || review.poolAddresses.length > 2 || new Set(review.poolAddresses).size !== review.poolAddresses.length) {
    throw new Error("Invalid expiry or route");
  }
  return (review.side === "BUY" ? review.amountIn : 0n) + review.messageFee + review.temporaryRent + review.newAtaRent + review.extraReserve;
}

export function formatAtoms(value: bigint): string {
  if (typeof value !== "bigint" || value < 0n) throw new Error("Invalid amount");
  const whole = value / 1_000_000_000n;
  const fractional = (value % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return fractional ? `${whole}.${fractional}` : whole.toString();
}

export interface SigningContext {
  launchEnabled: boolean;
  accountChecksPassed: boolean;
  wallet: string;
  network: string;
  nowMs: number;
  currentBlockHeight: number;
  lastValidBlockHeight: number;
  nativeBalance: bigint;
  plovBalance: bigint;
  simulation: { reviewId: string; message: Uint8Array; succeeded: boolean };
  message: Uint8Array;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length > 0 && a.length === b.length && a.every((n, i) => n === b[i]);
}

export function assertReviewReady(review: SwapReviewData, reviewedMessage: Uint8Array, context: SigningContext): void {
  const required = upfrontRequired(review);
  if (!context.launchEnabled) throw new Error("Trading is not open");
  if (!context.accountChecksPassed) throw new Error("Live accounts are not verified");
  if (context.wallet !== review.wallet || context.network !== review.network) throw new Error("Wallet or network changed");
  if (!Number.isSafeInteger(context.nowMs) || context.nowMs >= review.expiresAtMs) throw new Error("Quote expired");
  if (!Number.isSafeInteger(context.currentBlockHeight) || !Number.isSafeInteger(context.lastValidBlockHeight) || context.currentBlockHeight < 0 || context.lastValidBlockHeight < 0 || context.currentBlockHeight > context.lastValidBlockHeight) throw new Error("Blockhash expired");
  if (typeof context.nativeBalance !== "bigint" || context.nativeBalance < required) throw new Error("Insufficient SOL before swap");
  if (typeof context.plovBalance !== "bigint" || context.plovBalance < 0n || (review.side === "SELL" && context.plovBalance < review.amountIn)) throw new Error("Insufficient PLOV");
  if (!sameBytes(reviewedMessage, context.message)) throw new Error("Transaction changed after review");
  if (!context.simulation.succeeded || context.simulation.reviewId !== review.id || !sameBytes(context.simulation.message, context.message)) throw new Error("Simulation does not match review");
}

// The caller owns explicit user consent, live account verification and byte decoding.
// This adapter never submits, retries, refreshes blockhash or changes slippage.
export async function signReviewedTransaction<T>(options: {
  review: SwapReviewData;
  reviewedMessage: Uint8Array;
  transaction: T;
  readContext: () => SigningContext;
  getMessage: (transaction: T) => Uint8Array;
  verifySignedTransaction: (transaction: T) => boolean;
  wallet: { signTransaction: (transaction: T) => Promise<T> };
}): Promise<T> {
  const reviewMessage = Uint8Array.from(options.reviewedMessage);
  const review = { ...options.review, poolAddresses: [...options.review.poolAddresses] };
  assertReviewReady(review, reviewMessage, { ...options.readContext(), message: options.getMessage(options.transaction) });
  const signed = await options.wallet.signTransaction(options.transaction);
  assertReviewReady(review, reviewMessage, { ...options.readContext(), message: options.getMessage(signed) });
  if (!options.verifySignedTransaction(signed)) throw new Error("Missing or invalid transaction signature");
  return signed;
}
