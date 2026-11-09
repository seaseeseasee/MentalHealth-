// Regression guard: scoring results must stay identical to the frozen fixture,
// which was generated from the original scoring code before the redesign.
// Regenerate only on an approved change to the scoring rules:
//   node api/test/scoring.test.ts --write
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ASSESSMENTS, getAssessment, scoreAssessment, validateAnswers } from '../../shared/assessments.ts';
import { buildCases, scoreCase } from './scoring-cases.ts';

const fixturePath = fileURLToPath(new URL('./scoring-fixture.json', import.meta.url));

if (process.argv.includes('--write')) {
  const out = buildCases().map((c) => ({ ...c, expected: scoreCase(c) }));
  writeFileSync(fixturePath, JSON.stringify(out, null, 1) + '\n');
  console.log(`wrote ${out.length} cases`);
  process.exit(0);
}

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as (ReturnType<typeof buildCases>[number] & { expected: unknown })[];

test('fixture covers all 9 assessments', () => {
  assert.equal(new Set(fixture.map((c) => c.id)).size, ASSESSMENTS.length);
  assert.equal(ASSESSMENTS.length, 9);
});

test('scores match frozen fixture', () => {
  for (const c of fixture) {
    assert.deepEqual(scoreCase(c), c.expected, `${c.id} ${c.sex ?? ''} ${c.answers.join(',')}`);
  }
});

test('hand-checked cases', () => {
  const phq9 = getAssessment('phq9')!;
  const top = scoreAssessment(phq9, Array(9).fill(3));
  assert.equal(top.score, 27);
  assert.equal(top.band.label, 'ระดับรุนแรง');
  assert.equal(top.crisis, true);
  const item9Only = scoreAssessment(phq9, [0, 0, 0, 0, 0, 0, 0, 0, 1]);
  assert.equal(item9Only.crisis, true);
  assert.equal(item9Only.band.level, 'good');

  // THI-15: items 4–6 are reverse scored, so answering 0 everywhere gives 3 points each on those.
  const thi = getAssessment('thi15')!;
  assert.equal(scoreAssessment(thi, Array(15).fill(0)).score, 9);

  // AUDIT-C: a score of 3 is low risk for men but risky drinking for women.
  const audit = getAssessment('auditc')!;
  assert.equal(scoreAssessment(audit, [1, 1, 1], 'male').band.label, 'ความเสี่ยงต่ำ');
  assert.equal(scoreAssessment(audit, [1, 1, 1], 'female').band.label, 'ดื่มแบบเสี่ยง');
});

test('validation rejects malformed answers', () => {
  const st5 = getAssessment('st5')!;
  assert.ok(validateAnswers(st5, [0, 0, 0]));
  assert.ok(validateAnswers(st5, [0, 0, 0, 0, 9]));
  assert.equal(validateAnswers(st5, [0, 1, 2, 3, 0]), null);
  assert.ok(validateAnswers(getAssessment('auditc')!, [0, 0, 0], undefined));
});
