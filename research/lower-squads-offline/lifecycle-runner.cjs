'use strict';
const path=require('node:path');
if(process.argv[2])process.env.PLOV_LOCAL_FIXTURES=path.resolve(process.argv[2]);
if(!process.env.PLOV_LOCAL_FIXTURES)throw Error('Provide the local fixtures directory as an argument; no network download is automatic');
process.env.PLOV_LIFECYCLE='1';
require('./runtime.cjs');
