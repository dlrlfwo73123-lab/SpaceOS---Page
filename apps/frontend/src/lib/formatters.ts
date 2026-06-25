export function formatWon(manwon: number): string {
  return `${manwon.toLocaleString()}만원`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatScore(score: number): string {
  return `${Math.round(score)}점`;
}

export function confidenceLabel(level: 'high' | 'medium' | 'low'): string {
  return level === 'high' ? '높음' : level === 'medium' ? '중간' : '낮음';
}
