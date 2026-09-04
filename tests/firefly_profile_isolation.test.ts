import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {resolveFireflyProfileCandidates} from '../config/fireflySessionLive';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'firefly-profile-isolation-'));
const localProfile = path.join(tempRoot, 'data', 'chrome_profile', 'Default');
fs.mkdirSync(localProfile, {recursive: true});

const previousExplicit = process.env.FIREFLY_CHROME_PROFILE_DIR;
try {
  delete process.env.FIREFLY_CHROME_PROFILE_DIR;
  assert.deepStrictEqual(resolveFireflyProfileCandidates(tempRoot), [path.dirname(localProfile)]);

  const explicitProfile = path.join(tempRoot, 'explicit-profile');
  fs.mkdirSync(path.join(explicitProfile, 'Default'), {recursive: true});
  process.env.FIREFLY_CHROME_PROFILE_DIR = explicitProfile;
  assert.deepStrictEqual(resolveFireflyProfileCandidates(tempRoot), [path.resolve(explicitProfile)]);
} finally {
  if (previousExplicit === undefined) delete process.env.FIREFLY_CHROME_PROFILE_DIR;
  else process.env.FIREFLY_CHROME_PROFILE_DIR = previousExplicit;
  fs.rmSync(tempRoot, {recursive: true, force: true});
}

console.log('firefly_profile_isolation.test.ts: OK');
