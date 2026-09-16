import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

test('core declarations compile without React types and reject invalid public options', () => {
  const directory = mkdtempSync(path.resolve('.type-consumer-'));
  try {
    const file = path.join(directory, 'consumer.mts');
    const compile = (source) => {
      writeFileSync(file, source);
      const program = ts.createProgram([file], {
        target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true,
        noEmit: true, types: [], skipLibCheck: false,
      });
      assert.equal(program.getSourceFiles().some((item) => item.fileName.includes('/@types/react/')), false);
      return ts.getPreEmitDiagnostics(program);
    };
    assert.deepEqual(compile(`import type { SenlerWidgetInitConfig } from '../dist/index.js';
      const config: SenlerWidgetInitConfig = { channel_id: 'test', container: document.body, button_only: true };
      window.SenlerWidget?.init(config);`), []);
    const errors = compile(`import type { SenlerWidgetInitConfig } from '../dist/index.js';
      const config: SenlerWidgetInitConfig = { channel_id: 'test', invalidOption: true };`);
    assert.equal(errors.length, 1);
    assert.match(ts.flattenDiagnosticMessageText(errors[0].messageText, '\n'), /invalidOption/);
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(Object.keys(packageJson.dependencies ?? {}).length, 0);
    assert.equal(packageJson.peerDependenciesMeta.react.optional, true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
