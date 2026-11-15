// Saving and loading TestPal's data file. Owner: Rafi.
//
// Everything lives in one JSON file: { checklists: [...] }. By default that's data/testpal.json next to
// server.js. Tests (or anyone) can point it elsewhere with createStore(file) or the TESTPAL_DATA env var.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FILE = path.join(here, '..', 'data', 'testpal.json');

export function emptyData() {
  return { checklists: [] };
}

export function createStore(file = process.env.TESTPAL_DATA || DEFAULT_FILE) {
  return {
    file,

    /** Reads the data file. A missing file means "no data yet". A broken file is an error, not a wipe. */
    load() {
      let text;
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch (e) {
        if (e.code === 'ENOENT') return emptyData();
        throw e;
      }
      if (text.trim() === '') return emptyData();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`The data file ${file} isn't valid JSON. Fix it or delete it to start from empty.`);
      }
      if (!data || typeof data !== 'object' || !Array.isArray(data.checklists)) {
        throw new Error(`The data file ${file} doesn't look like TestPal data (no "checklists" list).`);
      }
      return data;
    },

    /** Writes the data file, creating the folder if needed. Writes to a temp file first so a crash can't leave half a file. */
    save(data) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
      fs.renameSync(tmp, file);
    },
  };
}
