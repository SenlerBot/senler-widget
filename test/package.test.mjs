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
    assert.deepEqual(compile(`import type { SenlerWidgetInitConfig, SenlerWidgetInlineTextEditStatus, SenlerWidgetRuntimeMessageResult, SenlerWidgetPersistentRuntimeConfig, SenlerWidgetRuntimeContext, SenlerWidgetResolvedRuntimeConfig } from '../dist/index.js';
      const resolveRuntime = (context: SenlerWidgetRuntimeContext): SenlerWidgetResolvedRuntimeConfig => ({
        welcome: { mode: 'centered_text' }, shell: { collapse_button: context.dialogs.count > 0 }
      });
      const config: SenlerWidgetInitConfig = { channel_id: 'test', container: document.body, button_only: true, surfaceVisible: false,
        onReady(detail) { detail.channel_id; detail.button_only; },
        onError(error) { error.code; error.retryable; error.message; },
        resolveRuntime(context) {
          const id: string | undefined = context.currentDialog?.id;
          return resolveRuntime(context);
        },
        pageElementActions: { navigate: async (payload, { execute, signal }) => {
          payload.user_initiated; signal.aborted;
          return execute();
        } } };
      window.SenlerWidget?.init(config);
      window.SenlerWidget?.refreshRuntime();
      const runtime: SenlerWidgetPersistentRuntimeConfig = { surfaceVisible: true };
      window.SenlerWidget?.updateRuntime(runtime);
      // @ts-expect-error Visibility must be a boolean in both public config paths.
      config.surfaceVisible = 'false';
      // @ts-expect-error Runtime visibility must be a boolean.
      window.SenlerWidget?.updateRuntime({ surfaceVisible: 'false' });
      const renderInlineStatus = (status: SenlerWidgetInlineTextEditStatus) => status;
      renderInlineStatus('preview_ready');
      renderInlineStatus('message_sent');
      // @ts-expect-error Runtime acceptance is not an inline edit status.
      renderInlineStatus('accepted');
      const reportMessageResult = (status: SenlerWidgetRuntimeMessageResult['status']) => status;
      reportMessageResult('accepted');
      reportMessageResult('preview_failed');
      // @ts-expect-error Preview readiness is local to the inline edit controller.
      reportMessageResult('preview_ready');
      // @ts-expect-error Public statuses must remain a closed union.
      reportMessageResult('unknown_status');`), []);
    const errors = compile(`import type { SenlerWidgetInitConfig } from '../dist/index.js';
      const config: SenlerWidgetInitConfig = { channel_id: 'test', invalidOption: true };`);
    assert.equal(errors.length, 1);
    assert.match(ts.flattenDiagnosticMessageText(errors[0].messageText, '\n'), /invalidOption/);
    const resolverErrors = compile(`import type { SenlerWidgetInitConfig } from '../dist/index.js';
      const config: SenlerWidgetInitConfig = { channel_id: 'test',
        resolveRuntime(context) {
          context.dialogs.count = 5;
          return { lang: 'ru', message: { text: 'not a presentation setting' } };
        } };`);
    assert.equal(resolverErrors.length, 2);
    assert.match(resolverErrors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'), /read-only/);
    const asyncErrors = compile(`import type { SenlerWidgetInitConfig } from '../dist/index.js';
      const config: SenlerWidgetInitConfig = { channel_id: 'test', resolveRuntime: async () => ({ lang: 'ru' }) };`);
    assert.equal(asyncErrors.length, 1);
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(Object.keys(packageJson.dependencies ?? {}).length, 0);
    assert.equal(packageJson.peerDependenciesMeta.react.optional, true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
