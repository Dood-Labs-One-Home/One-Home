/* One Home v14.67.141 — clean large 7Z staged extraction.
   Architecture:
   1. Open the already-staged private 7Z with one normal signed Storage GET.
   2. Stream the response body directly to browser OPFS as bytes arrive.
      No HTTP Range requests, no Netlify read relay, and no whole-archive RAM allocation.
   3. Verify the 7Z signature from the first streamed bytes and verify the final byte count.
   4. Mount the OPFS-backed File into 7z-wasm through Emscripten WORKERFS.
   5. Extract only Mint-relevant JSON/images in bounded output batches, copy each batch
      to the destination OPFS tree, and release the working set before continuing.

   A complete valid OPFS source copy is reused. An incomplete copy is restarted cleanly
   from byte zero because the source read is intentionally a standard full-object GET.
   No One Home archive-size/count cutoff is enforced here. */

const VERSION = '14.67.141';
const COPY_BYTES = 8 * 1024 * 1024;
const OUTPUT_WORKING_SET = 96 * 1024 * 1024;
const RESPONSE_START_TIMEOUT_MS = 20000;
const STREAM_IDLE_TIMEOUT_MS = 90000;
const SEVEN_Z_SIGNATURE = [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c];
const SEVEN_Z_MODULE_URL = '/assets/vendor/7z-wasm-1.2.0/7zz.es6.js?v=1467141';
const SEVEN_Z_WASM_URL = '/assets/vendor/7z-wasm-1.2.0/7zz.wasm?v=1467141';

function safeMessage(error) {
  return error instanceof Error ? error.message : String(error || 'unknown error');
}
function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}
function unsafePath(value) {
  const raw = String(value || '').replace(/\\/g, '/');
  if (!raw || raw.includes('\0') || /[\r\n]/.test(raw)) return true;
  if (/^(?:[a-zA-Z]:|\/)/.test(raw)) return true;
  return raw.split('/').some(part => part === '..');
}
function isRelevantPath(value) {
  const path = normalizePath(value);
  return /\.(?:json|png|jpe?g|webp|gif|svg|avif)$/i.test(path);
}
function sevenZSignatureOk(bytes) {
  if (!bytes || bytes.length < SEVEN_Z_SIGNATURE.length) return false;
  return SEVEN_Z_SIGNATURE.every((value, index) => bytes[index] === value);
}
async function opfsRoot() {
  if (!self.navigator?.storage || typeof self.navigator.storage.getDirectory !== 'function') {
    throw new Error('This browser does not provide Origin Private File System storage required for large 7Z imports.');
  }
  return await self.navigator.storage.getDirectory();
}
async function sourceHandleFor(destPath) {
  const root = await opfsRoot();
  const safe = String(destPath || 'onehome-mint').replace(/[^a-zA-Z0-9_-]/g, '') || 'onehome-mint';
  const name = `${safe}-staged-source.7z`;
  return { root, name, handle: await root.getFileHandle(name, { create: true }) };
}
async function existingSourceState(handle, expectedSize) {
  try {
    const file = await handle.getFile();
    if (!file.size) return { size: 0, validSignature: false, complete: false };
    const sig = new Uint8Array(await file.slice(0, SEVEN_Z_SIGNATURE.length).arrayBuffer());
    const validSignature = sevenZSignatureOk(sig);
    return { size: Number(file.size || 0), validSignature, complete: validSignature && Number(file.size) === expectedSize };
  } catch (_error) {
    return { size: 0, validSignature: false, complete: false };
  }
}
async function fetchWithStartTimeout(sourceUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESPONSE_START_TIMEOUT_MS);
  try {
    const response = await fetch(sourceUrl, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { response, controller };
  } catch (error) {
    clearTimeout(timer);
    if (error?.name === 'AbortError') {
      throw new Error('One Home Storage did not start the staged-package download within 20 seconds.');
    }
    throw error;
  }
}
async function readWithIdleTimeout(reader, controller) {
  let timer = null;
  try {
    return await Promise.race([
      reader.read(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          try { controller.abort(); } catch (_error) {}
          reject(new Error('The staged-package download stopped sending data for 90 seconds.'));
        }, STREAM_IDLE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
async function stageRemoteArchiveToOpfs({ sourceUrl, expectedSize, destPath, id }) {
  const size = Number(expectedSize || 0);
  if (!sourceUrl) throw new Error('The staged 7Z package signed read URL is unavailable.');
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error('The staged 7Z package size is invalid.');

  const { root, name, handle } = await sourceHandleFor(destPath);
  const state = await existingSourceState(handle, size);
  if (state.complete) {
    self.postMessage({
      type: 'progress', id, phase: 'download', processedBytes: size, totalBytes: size, currentFile: null,
      detail: `Reusing the complete ${(size / 1024 / 1024).toFixed(1)} MB staged browser-disk copy; no archive download is needed.`
    });
    return { root, name, handle, file: await handle.getFile(), reused: true };
  }

  const access = await handle.createSyncAccessHandle();
  let reader = null;
  let controller = null;
  let processed = 0;
  let signature = new Uint8Array(0);
  try {
    access.truncate(0);
    self.postMessage({ type: 'progress', id, phase: 'connecting', processedBytes: 0, totalBytes: size, currentFile: null,
      detail: 'Opening the private staged archive from One Home Storage.' });

    const opened = await fetchWithStartTimeout(sourceUrl);
    const response = opened.response;
    controller = opened.controller;
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.text()).slice(0, 240); } catch (_error) {}
      throw new Error(`One Home Storage could not open the staged package (HTTP ${response.status}${detail ? `: ${detail}` : ''}).`);
    }
    if (!response.body) throw new Error('One Home Storage opened the staged package but did not provide a readable response stream.');

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 0 && contentLength !== size) {
      throw new Error(`The staged package is ${contentLength} bytes in Storage, but the import record expects ${size}. One Home stopped before extraction.`);
    }

    reader = response.body.getReader();
    while (true) {
      const part = await readWithIdleTimeout(reader, controller);
      if (part.done) break;
      const value = part.value;
      if (!value?.byteLength) continue;
      if (processed + value.byteLength > size) {
        throw new Error(`One Home Storage sent more data than the staged package record allows (${processed + value.byteLength} > ${size}).`);
      }
      if (signature.length < SEVEN_Z_SIGNATURE.length) {
        const needed = SEVEN_Z_SIGNATURE.length - signature.length;
        const take = value.subarray(0, Math.min(needed, value.byteLength));
        const merged = new Uint8Array(signature.length + take.length);
        merged.set(signature, 0); merged.set(take, signature.length); signature = merged;
        if (signature.length === SEVEN_Z_SIGNATURE.length && !sevenZSignatureOk(signature)) {
          throw new Error('The staged source opened successfully, but it is not a valid 7Z archive.');
        }
      }
      const written = access.write(value, { at: processed });
      if (written !== value.byteLength) {
        throw new Error(`Browser storage wrote ${written} bytes but expected ${value.byteLength} while staging the 7Z archive.`);
      }
      processed += value.byteLength;
      if (processed % (64 * 1024 * 1024) < value.byteLength) access.flush();
      self.postMessage({ type: 'progress', id, phase: 'download', processedBytes: processed, totalBytes: size, currentFile: null,
        detail: `${(processed / 1024 / 1024).toFixed(1)} MB of ${(size / 1024 / 1024).toFixed(1)} MB` });
    }
    access.flush();
    if (!sevenZSignatureOk(signature)) throw new Error('The staged package ended before One Home could verify the 7Z signature.');
    if (processed !== size) throw new Error(`The staged package download ended at ${processed} bytes; One Home expected ${size}.`);
  } catch (error) {
    if (/quota|space|capacity/i.test(safeMessage(error))) {
      throw new Error(`This browser does not currently have enough private disk quota to stage the ${(size / 1024 / 1024).toFixed(1)} MB 7Z archive. The original copy remains safe in One Home Storage. (${safeMessage(error)})`);
    }
    throw error;
  } finally {
    try { reader?.releaseLock(); } catch (_error) {}
    try { controller?.abort(); } catch (_error) {}
    try { access.close(); } catch (_error) {}
  }

  const finalState = await existingSourceState(handle, size);
  if (!finalState.complete) throw new Error(`The browser-disk staged archive ended at ${finalState.size} bytes but One Home expected ${size}.`);
  return { root, name, handle, file: await handle.getFile(), reused: false };
}

async function ensureOpfsDirectory(root, relPath) {
  let current = root;
  for (const segment of normalizePath(relPath).split('/').filter(Boolean)) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }
  return current;
}
async function writeOpfsFromEmscripten(FS, sourcePath, destRoot, relativePath) {
  const clean = normalizePath(relativePath);
  if (unsafePath(clean)) throw new Error(`The 7Z package contains an unsafe path and was stopped: ${relativePath}`);
  const parts = clean.split('/').filter(Boolean);
  const fileName = parts.pop();
  const dir = await ensureOpfsDirectory(destRoot, parts.join('/'));
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const target = await fileHandle.createSyncAccessHandle();
  const source = FS.open(sourcePath, 'r');
  const stat = FS.stat(sourcePath);
  const total = Number(stat.size || 0);
  const buffer = new Uint8Array(Math.min(COPY_BYTES, Math.max(1, total || COPY_BYTES)));
  let position = 0;
  try {
    target.truncate(0);
    while (position < total) {
      const wanted = Math.min(buffer.byteLength, total - position);
      const read = FS.read(source, buffer, 0, wanted, position);
      if (!read) break;
      const written = target.write(buffer.subarray(0, read), { at: position });
      if (written !== read) throw new Error(`Browser storage wrote ${written} bytes but expected ${read} for ${clean}.`);
      position += read;
    }
    target.flush();
  } finally {
    try { FS.close(source); } catch (_error) {}
    try { target.close(); } catch (_error) {}
  }
  if (position !== total) throw new Error(`One Home copied ${position} of ${total} bytes for ${clean}.`);
  return total;
}
function removeFsTree(FS, path) {
  try {
    const stat = FS.stat(path);
    if (FS.isDir(stat.mode)) {
      for (const name of FS.readdir(path)) {
        if (name === '.' || name === '..') continue;
        removeFsTree(FS, `${path}/${name}`);
      }
      if (path !== '/') FS.rmdir(path);
    } else {
      FS.unlink(path);
    }
  } catch (_error) {}
}
function walkFs(FS, path, prefix = '', out = []) {
  for (const name of FS.readdir(path)) {
    if (name === '.' || name === '..') continue;
    const full = `${path}/${name}`;
    const rel = prefix ? `${prefix}/${name}` : name;
    const stat = FS.stat(full);
    if (FS.isDir(stat.mode)) walkFs(FS, full, rel, out);
    else out.push({ full, rel: normalizePath(rel), size: Number(stat.size || 0) });
  }
  return out;
}
function parseSltListing(output) {
  const records = [];
  let current = {};
  const flush = () => {
    if (current.Path != null && current.Size != null && current.Type == null) {
      const path = normalizePath(current.Path);
      const folder = String(current.Folder || '').trim() === '+' || /^D/i.test(String(current.Attributes || ''));
      const size = Number(current.Size || 0);
      if (!folder) records.push({ path, size: Number.isFinite(size) && size >= 0 ? size : 0, block: String(current.Block || '') });
    }
    current = {};
  };
  for (const rawLine of String(output || '').split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) { flush(); continue; }
    const idx = line.indexOf(' = ');
    if (idx > 0) current[line.slice(0, idx)] = line.slice(idx + 3);
  }
  flush();
  const seen = new Set();
  return records.filter(item => {
    if (!item.path || seen.has(item.path)) return false;
    if (unsafePath(item.path)) throw new Error(`The 7Z package contains an unsafe path and was stopped: ${item.path}`);
    seen.add(item.path);
    return true;
  });
}
function groupEntries(entries) {
  const groups = [];
  let group = [], total = 0;
  for (const entry of entries) {
    const size = Math.max(1, Number(entry.size || 0));
    if (group.length && total + size > OUTPUT_WORKING_SET) {
      groups.push(group);
      group = [];
      total = 0;
    }
    group.push(entry);
    total += size;
    if (size >= OUTPUT_WORKING_SET) {
      groups.push(group);
      group = [];
      total = 0;
    }
  }
  if (group.length) groups.push(group);
  return groups;
}
async function loadSevenZipFactory() {
  const module = await import(SEVEN_Z_MODULE_URL);
  const factory = module?.default || module?.SevenZip || module;
  if (typeof factory !== 'function') throw new Error('One Home loaded the 7-Zip runtime, but its module factory is unavailable.');
  return factory;
}
async function extractArchiveFromFile({ archiveFile, destPath, id }) {
  let stdoutText = '';
  let stderrText = '';
  let exitCode = 0;
  const SevenZip = await loadSevenZipFactory();
  const seven = await SevenZip({
    noExitRuntime: true,
    locateFile: (path) => String(path || '').endsWith('.wasm') ? SEVEN_Z_WASM_URL : path,
    stdout: (code) => { if (code != null) stdoutText += String.fromCharCode(code); },
    stderr: (code) => { if (code != null) stderrText += String.fromCharCode(code); },
    print: (line) => { stdoutText += String(line ?? '') + '\n'; },
    printErr: (line) => { stderrText += String(line ?? '') + '\n'; },
    quit: (code) => {
      exitCode = Number(code || 0);
      if (exitCode !== 0) throw new Error(`7-Zip exited with code ${exitCode}.`);
    },
  });
  if (!seven?.FS || !seven?.WORKERFS || typeof seven.callMain !== 'function') {
    throw new Error('The browser 7-Zip runtime does not include the WORKERFS large-file adapter.');
  }
  const FS = seven.FS;
  try { FS.mkdir('/in'); } catch (_error) {}
  try { FS.mkdir('/out'); } catch (_error) {}
  FS.mount(seven.WORKERFS, { files: [archiveFile] }, '/in');
  const archivePath = `/in/${archiveFile.name}`;
  function run(args, label) {
    stdoutText = '';
    stderrText = '';
    exitCode = 0;
    try {
      seven.callMain(args);
    } catch (error) {
      const msg = [safeMessage(error), stderrText.trim(), stdoutText.trim()].filter(Boolean).join(' | ');
      throw new Error(`${label} failed. ${msg}`.trim());
    }
    if (exitCode !== 0) {
      throw new Error(`${label} failed with 7-Zip exit code ${exitCode}. ${stderrText.trim()}`.trim());
    }
    return stdoutText;
  }
  self.postMessage({ type: 'progress', id, phase: 'prepare', processedBytes: 0, totalBytes: archiveFile.size, currentFile: null,
    detail: 'Preparing your Mint package.' });
  const listing = run(['l', '-slt', archivePath], 'Reading the 7Z directory');
  const allEntries = parseSltListing(listing);
  const entries = allEntries.filter(entry => isRelevantPath(entry.path));
  if (!entries.length) throw new Error('The 7Z package contains no JSON or supported artwork images for Mint.');
  const totalBytes = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.size || 0)), 0);
  const groups = groupEntries(entries);
  const root = await opfsRoot();
  try { await root.removeEntry(destPath, { recursive: true }); } catch (_error) {}
  const destRoot = await root.getDirectoryHandle(destPath, { create: true });
  let processedBytes = 0;
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    removeFsTree(FS, '/out');
    try { FS.mkdir('/out'); } catch (_error) {}
    const listPath = '/onehome-selection.txt';
    try { FS.unlink(listPath); } catch (_error) {}
    FS.writeFile(listPath, new TextEncoder().encode(group.map(item => item.path).join('\n') + '\n'));
    const currentFile = group.length === 1 ? group[0].path : `${group.length} Mint files`;
    self.postMessage({ type: 'progress', id, phase: 'extract', processedBytes, totalBytes: Math.max(1, totalBytes), currentFile,
      detail: `Processing Mint files ${groupIndex + 1} of ${groups.length}` });
    run(['x', '-y', '-bb0', '-bso0', '-bsp0', '-scsUTF-8', `-o/out`, archivePath, `-i@${listPath}`], `Extracting 7Z batch ${groupIndex + 1}`);
    const files = walkFs(FS, '/out');
    if (!files.length) throw new Error(`7-Zip completed batch ${groupIndex + 1}, but no selected files were produced.`);
    for (const file of files) {
      const copied = await writeOpfsFromEmscripten(FS, file.full, destRoot, file.rel);
      processedBytes += copied;
      self.postMessage({ type: 'progress', id, phase: 'extract', processedBytes, totalBytes: Math.max(1, totalBytes), currentFile: file.rel,
        detail: `Processed ${file.rel} (${(processedBytes / 1024 / 1024).toFixed(1)} MB)` });
    }
    removeFsTree(FS, '/out');
    try { FS.mkdir('/out'); } catch (_error) {}
  }
  try { FS.unmount('/in'); } catch (_error) {}
  return { entryCount: entries.length, totalBytes };
}

self.onmessage = async (event) => {
  const msg = event.data || {};
  if (msg.type !== 'extract-remote') return;
  const id = msg.id || '';
  let staged = null;
  try {
    staged = await stageRemoteArchiveToOpfs({
      sourceUrl: String(msg.sourceUrl || ''),
      expectedSize: Number(msg.expectedSize || 0), destPath: String(msg.destPath || ''), id,
    });
    self.postMessage({ type: 'progress', id, phase: 'prepare', processedBytes: 0,
      totalBytes: Number(msg.expectedSize || 0), currentFile: null,
      detail: 'Preparing your Mint package.' });
    await extractArchiveFromFile({ archiveFile: staged.file, destPath: String(msg.destPath || ''), id });
    try { await staged.root.removeEntry(staged.name); } catch (_error) {}
    self.postMessage({ type: 'done', id });
  } catch (error) {
    self.postMessage({ type: 'error', id, message: safeMessage(error), stack: error instanceof Error ? error.stack : '' });
  }
};
