import { mergeConfig } from 'vite';
import base from '../../vite.config.js';

// The root `npx vitest run` only matches *.test.* files, so generate.verify.js is
// invisible to it. This config is the one way to run the generator.
export default mergeConfig(base, {
    test: {
        include: ['scripts/verify-conventions/**/*.verify.js'],
    },
});
