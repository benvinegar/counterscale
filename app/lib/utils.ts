import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function invariant(
  condition: any,
  // Can provide a string, or a function that returns a string for cases where
  // the message takes a fair amount of effort to compute
  message?: string | (() => string)
): asserts condition {
  if (condition) {
    return;
  }

  const prefix = "[Invariant failed]"

  const provided: string | undefined =
    typeof message === "function" ? message() : message

  const value = provided ? `${prefix}: ${provided}` : prefix
  // Don't throw in tests, so that in mocks we don't have to stub entire objects
  if (process.env.NODE_ENV !== "test") throw new Error(value)
}
