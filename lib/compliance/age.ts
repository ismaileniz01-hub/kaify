const MINIMUM_AGE_YEARS = 16;

/** Returns true when the person is at least `minimumYears` old on today's date. */
export function meetsMinimumAge(
  birthDateIso: string,
  minimumYears = MINIMUM_AGE_YEARS,
): boolean {
  const dob = new Date(`${birthDateIso}T00:00:00.000Z`);
  if (Number.isNaN(dob.getTime())) return false;

  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age >= minimumYears;
}

/** Latest birth date allowed for 16+ registration (YYYY-MM-DD). */
export function maximumBirthDateForMinimumAge(
  minimumYears = MINIMUM_AGE_YEARS,
): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - minimumYears);
  return d.toISOString().slice(0, 10);
}

export { MINIMUM_AGE_YEARS };
