// SDK1.5.1 deep-imports Anchor's CJS byte index. Its browser equivalent is
// exposed by Anchor itself; do not bundle the Node-only utf8 fallback.
import { utils } from '@coral-xyz/anchor';
export const bs58 = utils.bytes.bs58;
