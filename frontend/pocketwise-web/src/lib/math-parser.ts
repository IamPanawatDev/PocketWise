/**
 * Safe Arithmetic Expression Evaluator
 * Safely parses and evaluates basic arithmetic expressions (+, -, *, /, parentheses)
 * without using eval() or Function constructor.
 */

export function evaluateMathExpression(input: string): number | null {
  if (!input || typeof input !== "string") return null;
  const cleaned = input.trim().replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/");
  if (!cleaned) return null;

  // Allow only valid characters: digits, decimal point, operators, parentheses
  if (/[^0-9.+\-*/()]/.test(cleaned)) return null;

  // Tokenize expression
  const tokens: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if ("+-*/()".includes(ch)) {
      // Check for unary minus / plus
      if ((ch === "-" || ch === "+") && (i === 0 || "+-*/(".includes(cleaned[i - 1]))) {
        let numStr = ch;
        i++;
        while (i < cleaned.length && /[0-9.]/.test(cleaned[i])) {
          numStr += cleaned[i];
          i++;
        }
        if (numStr === "-" || numStr === "+") return null;
        tokens.push(numStr);
        continue;
      }
      tokens.push(ch);
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let numStr = "";
      while (i < cleaned.length && /[0-9.]/.test(cleaned[i])) {
        numStr += cleaned[i];
        i++;
      }
      // Check for multiple decimal points in a single number
      if ((numStr.match(/\./g) || []).length > 1) return null;
      tokens.push(numStr);
    } else {
      return null;
    }
  }

  // Shunting-yard algorithm: Infix -> Reverse Polish Notation (RPN)
  const output: string[] = [];
  const ops: string[] = [];
  const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

  for (const token of tokens) {
    if (!isNaN(Number(token))) {
      output.push(token);
    } else if (token in precedence) {
      while (
        ops.length > 0 &&
        ops[ops.length - 1] in precedence &&
        precedence[ops[ops.length - 1]] >= precedence[token]
      ) {
        output.push(ops.pop()!);
      }
      ops.push(token);
    } else if (token === "(") {
      ops.push(token);
    } else if (token === ")") {
      while (ops.length > 0 && ops[ops.length - 1] !== "(") {
        output.push(ops.pop()!);
      }
      if (ops.length === 0 || ops[ops.length - 1] !== "(") return null;
      ops.pop(); // Discard '('
    } else {
      return null;
    }
  }

  while (ops.length > 0) {
    const op = ops.pop()!;
    if (op === "(" || op === ")") return null;
    output.push(op);
  }

  // Evaluate RPN stack
  const stack: number[] = [];
  for (const token of output) {
    if (!isNaN(Number(token))) {
      stack.push(Number(token));
    } else {
      if (stack.length < 2) return null;
      const b = stack.pop()!;
      const a = stack.pop()!;
      let res: number;
      switch (token) {
        case "+":
          res = a + b;
          break;
        case "-":
          res = a - b;
          break;
        case "*":
          res = a * b;
          break;
        case "/":
          if (b === 0) return null; // Avoid division by zero
          res = a / b;
          break;
        default:
          return null;
      }
      stack.push(res);
    }
  }

  if (stack.length !== 1 || isNaN(stack[0]) || !isFinite(stack[0])) return null;

  // Round result to 2 decimal places to prevent floating point inaccuracies
  return Math.round((stack[0] + Number.EPSILON) * 100) / 100;
}

/**
 * Checks whether the input string is a composite math expression (contains +, -, *, /)
 */
export function isMathExpression(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const trimmed = input.trim();
  // Contains at least one operator following digits
  return /[0-9]\s*[\+\-\*\/\×\÷]\s*[0-9]/.test(trimmed);
}
