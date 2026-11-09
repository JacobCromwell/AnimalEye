// Neutral age screen. We ask for birth month and year (never the full date) and keep
// only the pass/fail outcome. When the month matches the current month we don't know
// whether the birthday has happened yet, so we assume it hasn't (the conservative choice).

export const MINIMUM_AGE = 13;

export type AgeCheck = 'ok' | 'too_young' | 'invalid';

export function checkAge(
  birthYear: number,
  birthMonth: number,
  now: Date = new Date(),
  minimumAge = MINIMUM_AGE,
): AgeCheck {
  const currentYear = now.getFullYear();
  if (!Number.isInteger(birthYear) || !Number.isInteger(birthMonth)) return 'invalid';
  if (birthMonth < 1 || birthMonth > 12) return 'invalid';
  if (birthYear < currentYear - 120 || birthYear > currentYear) return 'invalid';
  const currentMonth = now.getMonth() + 1;
  if (birthYear === currentYear && birthMonth > currentMonth) return 'invalid';

  let age = currentYear - birthYear;
  if (currentMonth <= birthMonth) age -= 1; // birthday may not have happened yet this year
  return age >= minimumAge ? 'ok' : 'too_young';
}
