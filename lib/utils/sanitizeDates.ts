// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeDates<T extends Record<string, any>>(payload: T, dateFields: (keyof T)[]): T {
  const sanitized = { ...payload };
  for (const field of dateFields) {
    if (sanitized[field] === "" || sanitized[field] === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sanitized[field] = null as any;
    }
  }
  return sanitized;
}
