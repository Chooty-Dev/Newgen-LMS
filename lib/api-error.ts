import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";

export class ApiFieldError extends Error {
  fields?: Record<string, string[]>;

  constructor(message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = "ApiFieldError";
    this.fields = fields;
  }
}

export function applyApiFieldErrors<T extends FieldValues>(
  err: ApiFieldError,
  setError: UseFormSetError<T>
): void {
  if (!err.fields) return;
  Object.entries(err.fields).forEach(([field, messages]) => {
    if (messages?.length) {
      setError(field as FieldPath<T>, { message: messages[0] });
    }
  });
}
