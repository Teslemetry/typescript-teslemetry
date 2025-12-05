export interface ValidationRule {
  required?: boolean;
  type?: "number" | "string" | "boolean";
  min?: number;
  max?: number;
  allowedValues?: string[];
  integer?: boolean;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export function validateParameters(msg: any, rules: ValidationRules): void {
  const errors: string[] = [];

  for (const [paramName, rule] of Object.entries(rules)) {
    const value = msg[paramName];

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
          `Parameter '${paramName}' must be a valid number, got '${value}'`,
        );
        continue;
      }

      // Integer validation
      if (rule.integer && !Number.isInteger(numValue)) {
        errors.push(
          `Parameter '${paramName}' must be an integer, got '${value}'`,
        );
        continue;
      }

      // Range validation
      if (rule.min !== undefined && numValue < rule.min) {
        errors.push(
          `Parameter '${paramName}' must be at least ${rule.min}, got ${numValue}`,
        );
      }

      if (rule.max !== undefined && numValue > rule.max) {
        errors.push(
          `Parameter '${paramName}' must be at most ${rule.max}, got ${numValue}`,
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
          `Parameter '${paramName}' must be one of: ${rule.allowedValues.join(", ")}, got '${value}'`,
        );
      }
    } else if (rule.type === "boolean") {
      if (typeof value !== "boolean") {
        errors.push(
          `Parameter '${paramName}' must be a boolean, got ${typeof value}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}
