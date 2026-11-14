const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const compiled = ts.transpileModule(fs.readFileSync('lib/request-json.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
function setup(fetch, timers = {}) {
  const module = { exports: {} };
  new Function('exports', 'fetch', 'setTimeout', 'clearTimeout', compiled)(
    module.exports, fetch, timers.setTimeout || setTimeout, timers.clearTimeout || clearTimeout
  );
  return module.exports.requestJson;
}
test('returns successful import count', async () => {
  const request = setup(async () => Response.json({ imported: 2 }));
  assert.deepEqual(await request('/api/words/import'), { imported: 2 });
});
test('preserves server error message', async () => {
  const request = setup(async () => Response.json({ error: 'บันทึกไม่สำเร็จ' }, { status: 500 }));
  await assert.rejects(request('/api/words/import'), /บันทึกไม่สำเร็จ/);
});
test('handles HTML error pages and malformed successful responses', async () => {
  for (const status of [200, 502]) {
    const request = setup(async () => new Response('<html>error</html>', { status }));
    await assert.rejects(request('/api/words/import'), /กรุณาลองใหม่/);
  }
});
test('handles network rejection', async () => {
  const request = setup(async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(request('/api/words/import'), /ตรวจสอบอินเทอร์เน็ต/);
});
test('aborts stalled requests and clears timeout', async () => {
  let expire;
  let cleared = false;
  const request = setup((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }), { setTimeout: (callback) => { expire = callback; return 1; }, clearTimeout: () => { cleared = true; } });
  const pending = request('/api/words/import');
  expire();
  await assert.rejects(pending, /ใช้เวลานานเกินไป/);
  assert.equal(cleared, true);
});
