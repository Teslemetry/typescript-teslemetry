import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const packageRoot = path.dirname(__dirname);

test('io-package.json common.version matches package.json version', () => {
	const pkg = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
	const ioPkg = JSON.parse(readFileSync(path.join(packageRoot, 'io-package.json'), 'utf8'));

	assert.equal(
		ioPkg.common.version,
		pkg.version,
		'io-package.json common.version must be bumped alongside package.json version (changesets does not do this automatically)',
	);
});
