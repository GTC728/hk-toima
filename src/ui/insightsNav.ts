/** Insights：`#/insights` */

export function insightsHash(): string {
  return '#/insights'
}

export function isInsightsHash(hash: string): boolean {
  return hash === '#/insights' || hash.startsWith('#/insights?')
}
