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
      return ts.getPreEmitDiagnostics(program).map(item => ts.flattenDiagnosticMessageText(item.messageText, "\n"));
    };
    assert.deepEqual(compile(`import type { SenlerWidgetInitConfig, SenlerWidgetSettings, SenlerWidgetRuntimeContext, SenlerWidgetResolvedRuntimeConfig } from '../dist/index.js';
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
      const runtime: SenlerWidgetSettings = { surfaceVisible: true };
      window.SenlerWidget?.configure(runtime);
      // @ts-expect-error Visibility must be a boolean in both public config paths.
      config.surfaceVisible = 'false';
      // @ts-expect-error Runtime visibility must be a boolean.
      window.SenlerWidget?.configure({ surfaceVisible: 'false' });
      window.SenlerWidget?.ask({ text: 'Hello', onAnswer(answer) { answer.hasMore; answer.respondersTotal; } });
      window.SenlerWidget?.ask({ text: 'Stream', onChunk(chunk) {
        const index: number = chunk.index;
        const ids: string[] = [chunk.requestId, chunk.dialogId, chunk.agentId, chunk.streamId, chunk.text];
      } });
      // @ts-expect-error Chunk callbacks receive a typed fragment.
      window.SenlerWidget?.ask({ text: 'Stream', onChunk: (text: string) => {} });
      window.SenlerWidget?.startNewDialog({ contextItems: [], focusInput: true });
      window.SenlerWidget?.create({ channel_id: 'test', headless: true });
      window.SenlerWidget?.getMessages({ dialogId: 'id', limit: 20 });
      window.SenlerWidget?.getScheduledActions({ dialogId: 'id', cursor: 'next' }).then(page => {
        const enabled: boolean = page.enabled;
        const status: 'pending' | 'processing' = page.items[0].status;
      });
      window.SenlerWidget?.cancelScheduledAction({ dialogId: 'id', actionId: 'timer' });
      window.SenlerWidget?.subscribeDialog({ dialogId: 'id', onError(error) { error.code; },
        onUpdate(update) {
          if (update.type === 'snapshot') {
            const revision: number = update.messages.items[0].version;
            const queueId: string | undefined = update.state.pending[0]?.id;
          }
          if (update.type === 'chunk') { const fragment: string = update.text; }
          if (update.type === 'streamEnded') {
            const request: string | undefined = update.requestId;
            const status: 'completed' | 'failed' | 'skipped' | 'scheduled' = update.status;
          }
        }
      });
      // @ts-expect-error A subscription must handle terminal failures.
      window.SenlerWidget?.subscribeDialog({ dialogId: 'id', onUpdate() {} });
      // @ts-expect-error Headless is a boolean.
      window.SenlerWidget?.create({ channel_id: 'test', headless: 'yes' });
      window.SenlerWidget?.selectDialog('discussion', { contextItems: [], focusInput: true });
      // @ts-expect-error Selecting a chat cannot send a message.
      window.SenlerWidget?.selectDialog('discussion', { text: 'Hello' });
      // @ts-expect-error Sending through settings is not supported.
      window.SenlerWidget?.configure({ message: { text: 'Hello' } });
      // @ts-expect-error Removed legacy API.
      window.SenlerWidget?.createInlineTextEdit({});
      // @ts-expect-error Settings and commands must be separate.
      window.SenlerWidget?.open({ startNewDialog: true });`), []);
    const errors = compile(`import type { SenlerWidgetInitConfig } from '../dist/index.js';
      const config: SenlerWidgetInitConfig = { channel_id: 'test', invalidOption: true };`);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /invalidOption/);
    const resolverErrors = compile(`import type { SenlerWidgetInitConfig } from '../dist/index.js';
      const config: SenlerWidgetInitConfig = { channel_id: 'test',
        resolveRuntime(context) {
          context.dialogs.count = 5;
          return { lang: 'ru', startNewDialog: true };
        } };`);
    assert.equal(resolverErrors.length, 2);
    assert.match(resolverErrors.join('\n'), /read-only/);
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
