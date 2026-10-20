'use strict';
process.env.PLOV_RECOVERY_UI = '1';
process.env.PLOV_RECOVERY_HOST = '1';
process.env.PLOV_OBSERVATION_POLICY = '1';
process.env.PLOV_RECOVERY_EVIDENCE = '1';
process.env.PLOV_PHANTOM_SESSION = '1';
require('./test-swap-lifecycle-browser.cjs');
