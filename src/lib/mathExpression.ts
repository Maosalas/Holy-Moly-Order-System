/**
 * Evaluador seguro de expresiones aritméticas simples.
 * Soporta + - * / ( ) y decimales con punto o coma.
 * Devuelve null cuando la expresión no es válida.
 */
export function evaluateMathExpression(input: string): number | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/\s+/g, "")
    .replace(/[×xX]/g, "*")
    .replace(/÷/g, "/")
    .replace(/,/g, ".");

  if (!/^[0-9.+\-*/()]+$/.test(normalized)) return null;
  // Un número simple no necesita evaluación
  if (/^-?\d*\.?\d+$/.test(normalized)) return Number(normalized);
  if (!/[+\-*/]/.test(normalized)) return null;

  let pos = 0;

  const peek = () => normalized[pos];

  const parseNumber = (): number | null => {
    const start = pos;
    while (pos < normalized.length && /[0-9.]/.test(normalized[pos])) pos++;
    if (pos === start) return null;
    const value = Number(normalized.slice(start, pos));
    return Number.isFinite(value) ? value : null;
  };

  const parseFactor = (): number | null => {
    const ch = peek();
    if (ch === "+" ) {
      pos++;
      return parseFactor();
    }
    if (ch === "-") {
      pos++;
      const v = parseFactor();
      return v === null ? null : -v;
    }
    if (ch === "(") {
      pos++;
      const v = parseExpression();
      if (v === null || peek() !== ")") return null;
      pos++;
      return v;
    }
    return parseNumber();
  };

  const parseTerm = (): number | null => {
    let left = parseFactor();
    if (left === null) return null;
    while (peek() === "*" || peek() === "/") {
      const op = peek();
      pos++;
      const right = parseFactor();
      if (right === null) return null;
      if (op === "/") {
        if (right === 0) return null;
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  };

  function parseExpression(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    while (peek() === "+" || peek() === "-") {
      const op = peek();
      pos++;
      const right = parseTerm();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  const result = parseExpression();
  if (result === null || pos !== normalized.length || !Number.isFinite(result)) return null;
  // Evita ruido de punto flotante
  return Math.round(result * 1e6) / 1e6;
}

export function isMathExpression(input: string): boolean {
  const raw = (input ?? "").trim();
  if (!raw) return false;
  if (/^-?[\d.,]+$/.test(raw)) return false;
  return /^[0-9.,\s+\-*/()×÷xX]+$/.test(raw) && /[+\-*/×÷xX]/.test(raw.slice(1));
}
