const NBSP = ' ';

export function fmt(n: number, withSign = true): string {
  const sign = !withSign ? '' : n > 0 ? '+' : n < 0 ? '−' : '';
  const abs = Math.abs(n).toLocaleString('ru-RU').replace(/ /g, NBSP);
  return `${sign}${abs}${NBSP}₽`;
}
