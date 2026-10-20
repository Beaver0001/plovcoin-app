'use strict';
const path=require('node:path');
if(process.argv[2])process.env.PLOV_LOCAL_FIXTURES=path.resolve(process.argv[2]);
if(!process.env.PLOV_LOCAL_FIXTURES)throw Error('Provide local fixtures directory; no automatic network download');
process.env.PLOV_DELAYED_REVIEW='1';
process.env.PLOV_CANCEL_REVIEW='1';
require('./runtime.cjs');
