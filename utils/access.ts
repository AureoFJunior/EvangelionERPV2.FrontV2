const MANAGERIAL_ACCESS_LEVELS = new Set(['admin', 'administrator', 'manager', 'supervisor']);
const ACCESS_LEVEL_BY_INDEX = new Map<number, string>([
  [0, 'admin'],
  [1, 'manager'],
  [2, 'supervisor'],
  [3, 'employee'],
]);

const splitRoleTokens = (role: string) =>
  role
    .toLowerCase()
    .split(/[\s,;|/:_-]+/)
    .map((token) => token.trim())
    .filter(Boolean);

const normalizeRoleValue = (role?: string | number | null) => {
  if (typeof role === 'number' && Number.isFinite(role)) {
    return ACCESS_LEVEL_BY_INDEX.get(role) ?? '';
  }

  const raw = String(role ?? '').trim();
  if (!raw) {
    return '';
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return ACCESS_LEVEL_BY_INDEX.get(numeric) ?? raw.toLowerCase();
  }

  return raw.toLowerCase();
};

export const hasManagementAccess = (role?: string | number | null) => {
  const normalizedRole = normalizeRoleValue(role);
  if (!normalizedRole) {
    return false;
  }

  const tokens = splitRoleTokens(normalizedRole);
  return tokens.some((token) => MANAGERIAL_ACCESS_LEVELS.has(token));
};
