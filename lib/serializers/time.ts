export const toRFC3339 = (v: string | Date): string =>
  new Date(v).toISOString().replace(/\.\d{3}Z$/, "Z");