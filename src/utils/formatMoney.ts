// src/utils/formatMoney.ts
export function formatWithSymbol(value: number, symbol: string): string {
  // No convierte, solo muestra símbolo + número con 2 decimales y coma
  const num = Number.isFinite(value) ? value : 0;
  return `${num.toFixed(2).replace('.', ',')}${symbol}`;
}
