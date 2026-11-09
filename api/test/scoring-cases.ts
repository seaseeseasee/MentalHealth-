// Builds a deterministic set of answer vectors for every assessment.
// Used both to generate the frozen fixture and to re-check it in the test.
import { ASSESSMENTS, optionsFor, scoreAssessment, type Sex } from '../../shared/assessments.ts';

export interface ScoringCase {
  id: string;
  sex: Sex | null;
  answers: number[];
}

export function buildCases(): ScoringCase[] {
  const cases: ScoringCase[] = [];
  for (const a of ASSESSMENTS) {
    const patterns: ((i: number, n: number) => number)[] = [
      () => 0,
      () => 1,
      () => 2,
      (_i, n) => n - 1, // top option everywhere
      (i, n) => i % n, // mixed
      (i, n) => (n - 1 - (i % n) + n) % n // mixed, reversed
    ];
    const sexes: (Sex | null)[] = a.askSex ? ['male', 'female'] : [null];
    for (const sex of sexes) {
      for (const p of patterns) {
        const answers = a.items.map((_item, i) => {
          const opts = optionsFor(a, i);
          return opts[Math.min(p(i, opts.length), opts.length - 1)].value;
        });
        cases.push({ id: a.id, sex, answers });
      }
    }
  }
  return cases;
}

export function scoreCase(c: ScoringCase) {
  const a = ASSESSMENTS.find((x) => x.id === c.id)!;
  const r = scoreAssessment(a, c.answers, c.sex);
  return { score: r.score, max: r.max, level: r.band.level, label: r.band.label, crisis: r.crisis, domains: r.domains };
}
