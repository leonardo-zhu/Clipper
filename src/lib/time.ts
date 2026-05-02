export type RelativeTimeToken =
  | { key: 'time.just_now' }
  | { key: 'time.minutes_ago'; params: { count: number } }
  | { key: 'time.hours_ago'; params: { count: number } }
  | { key: 'time.days_ago'; params: { count: number } }
  | { key: 'time.weeks_ago'; params: { count: number } };

export function getRelativeTimeToken(timestamp: number, now = Date.now()): RelativeTimeToken {
  const diffMs = Math.max(0, now - timestamp);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMinutes < 5) return { key: 'time.just_now' };
  if (diffMinutes < 60) return { key: 'time.minutes_ago', params: { count: diffMinutes } };
  if (diffHours < 24) return { key: 'time.hours_ago', params: { count: diffHours } };
  if (diffDays < 7) return { key: 'time.days_ago', params: { count: diffDays } };
  return { key: 'time.weeks_ago', params: { count: Math.max(1, diffWeeks) } };
}

