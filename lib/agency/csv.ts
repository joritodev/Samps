/**
 * Célula de CSV. Além das aspas, neutraliza fórmula: texto que começa com
 * `=`, `+`, `-`, `@`, tab ou retorno vira fórmula no Excel/Sheets. O prefixo `'`
 * mostra o texto como veio. Números de verdade não são tocados.
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text) && !/^-?\d+([.,]\d+)?%?$/.test(text)) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvFromRows(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
