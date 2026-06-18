export const SYSTEM_ROLES = [
  "super_admin",
  "academic_director",
  "training_admin",
  "ict_admin",
  "coordinator",
  "lecturer",
  "student",
] as const;

// lowercase, starts with a letter, letters/numbers/underscores only
export const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_]{1,49}$/;

export function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
