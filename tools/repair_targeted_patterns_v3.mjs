#!/usr/bin/env node
// Compatibility entrypoint: the pipeline and existing tests call V3 by name.
// V4 fixes initialization order and rebuilds M2 gerund items as unambiguous exercises.
await import('./repair_targeted_patterns_v4.mjs');
