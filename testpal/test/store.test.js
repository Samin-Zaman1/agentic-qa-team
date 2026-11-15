import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore, emptyData } from '../lib/store.js';

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testpal-store-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('store', () => {
  it('returns empty data when the file does not exist', () => {
    expect(createStore(path.join(dir, 'none.json')).load()).toEqual(emptyData());
  });

  it('returns empty data when the file is empty', () => {
    const file = path.join(dir, 'empty.json');
    fs.writeFileSync(file, '');
    expect(createStore(file).load()).toEqual(emptyData());
  });

  it('saves and loads the same data, creating the folder', () => {
    const file = path.join(dir, 'nested', 'data', 'testpal.json');
    const store = createStore(file);
    const data = { checklists: [{ id: 'a', name: 'A', createdAt: '2026-11-11T00:00:00.000Z', cases: [] }] };
    store.save(data);
    expect(fs.existsSync(file)).toBe(true);
    expect(store.load()).toEqual(data);
  });

  it('leaves no temp file behind', () => {
    const file = path.join(dir, 'testpal.json');
    createStore(file).save(emptyData());
    expect(fs.readdirSync(dir)).toEqual(['testpal.json']);
  });

  it('refuses to load a broken file instead of wiping it', () => {
    const file = path.join(dir, 'bad.json');
    fs.writeFileSync(file, '{ not json');
    expect(() => createStore(file).load()).toThrow(/isn't valid JSON/);
    expect(fs.readFileSync(file, 'utf8')).toBe('{ not json');
  });

  it('refuses a file that is JSON but not TestPal data', () => {
    const file = path.join(dir, 'other.json');
    fs.writeFileSync(file, '{"hello": 1}');
    expect(() => createStore(file).load()).toThrow(/doesn't look like TestPal data/);
  });

  it('uses TESTPAL_DATA when no file is given', () => {
    const file = path.join(dir, 'env.json');
    const old = process.env.TESTPAL_DATA;
    process.env.TESTPAL_DATA = file;
    try {
      expect(createStore().file).toBe(file);
    } finally {
      if (old === undefined) delete process.env.TESTPAL_DATA;
      else process.env.TESTPAL_DATA = old;
    }
  });
});
