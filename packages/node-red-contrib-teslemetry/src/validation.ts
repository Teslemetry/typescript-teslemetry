export interface ValidationRule {
  required?: boolean;
  type?: "number" | "string" | "boolean" | "object";
  min?: number;
  max?: number;
  allowedValues?: string[];
  integer?: boolean;
  /** Only meaningful with type: "object" - whether the value must be an array (true) or a plain object (false/omitted). */
  isArray?: boolean;
  /** Never echo this parameter's actual value in a thrown validation error (PINs, passwords). */
  sensitive?: boolean;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

const REDACTED = "[redacted]";

export function validateParameters(msg: any, rules: ValidationRules): void {
  const errors: string[] = [];

  for (const [paramName, rule] of Object.entries(rules)) {
    const value = msg[paramName];
    const displayValue = rule.sensitive ? REDACTED : value;

    // Check if required parameter is missing
    if (
      rule.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`Required parameter '${paramName}' is missing`);
      continue;
    }

    // Skip validation if parameter is not provided and not required
    if (value === undefined || value === null || value === "") {
      continue;
    }

    // Type validation
    if (rule.type === "number") {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(
          `Parameter '${paramName}' must be a valid number, got '${displayValue}'`,
        );
        continue;
      }

      // Integer validation
      if (rule.integer && !Number.isInteger(numValue)) {
        errors.push(
          `Parameter '${paramName}' must be an integer, got '${displayValue}'`,
        );
        continue;
      }

      // Range validation
      if (rule.min !== undefined && numValue < rule.min) {
        errors.push(
          `Parameter '${paramName}' must be at least ${rule.min}, got ${rule.sensitive ? REDACTED : numValue}`,
        );
      }

      if (rule.max !== undefined && numValue > rule.max) {
        errors.push(
          `Parameter '${paramName}' must be at most ${rule.max}, got ${rule.sensitive ? REDACTED : numValue}`,
        );
      }
    } else if (rule.type === "string") {
      if (typeof value !== "string") {
        errors.push(
          `Parameter '${paramName}' must be a string, got ${typeof value}`,
        );
        continue;
      }

      // Allowed values validation
      if (rule.allowedValues && !rule.allowedValues.includes(value)) {
        errors.push(
          `Parameter '${paramName}' must be one of: ${rule.allowedValues.join(", ")}, got '${displayValue}'`,
        );
      }
    } else if (rule.type === "boolean") {
      if (typeof value !== "boolean") {
        errors.push(
          `Parameter '${paramName}' must be a boolean, got ${typeof value}`,
        );
      }
    } else if (rule.type === "object") {
      const isArray = Array.isArray(value);
      if (typeof value !== "object" || value === null || isArray !== !!rule.isArray) {
        errors.push(
          `Parameter '${paramName}' must be ${rule.isArray ? "an array" : "an object"}, got ${isArray ? "array" : typeof value}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}
