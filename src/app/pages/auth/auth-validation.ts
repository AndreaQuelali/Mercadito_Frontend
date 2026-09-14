/** Shared client-side validation for auth forms (SPEC 04). */

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
/** ≥8 chars, 1 uppercase, 1 digit, 1 non-alphanumeric symbol */
export const PASSWORD_COMPLEXITY_RE =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,150}$/;

export const MSG = {
  required: 'Este campo es obligatorio.',
  email: 'Ingresa un correo electrónico válido.',
  passwordRequired: 'Ingresa tu contraseña.',
  passwordPolicy:
    'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo.',
  passwordMatch: 'Las contraseñas no coinciden.',
  firstName: 'Ingresa tu nombre.',
  lastName: 'Ingresa tu apellido.',
} as const;

export type LoginFieldErrors = { email: string; password: string };
export type RegisterFieldErrors = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};
export type ForgotFieldErrors = { email: string };
export type ResetFieldErrors = { password: string; confirmPassword: string };

export function validateRequiredTrim(value: string): string | null {
  if (!value || !value.trim()) return MSG.required;
  return null;
}

export function validateEmail(value: string): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return MSG.required;
  if (!EMAIL_RE.test(trimmed)) return MSG.email;
  return null;
}

/** Login: only non-empty (no complexity). */
export function validateLoginPassword(value: string): string | null {
  if (!value) return MSG.passwordRequired;
  return null;
}

/** Register / reset: min 8 + complexity. Do not trim password. */
export function validatePasswordPolicy(value: string): string | null {
  if (!value) return MSG.passwordRequired;
  if (!PASSWORD_COMPLEXITY_RE.test(value)) return MSG.passwordPolicy;
  return null;
}

export function passwordsMatch(password: string, confirm: string): string | null {
  if (!confirm) return MSG.required;
  if (password !== confirm) return MSG.passwordMatch;
  return null;
}

export function validateName(value: string, kind: 'firstName' | 'lastName'): string | null {
  if (!value || !value.trim()) {
    return kind === 'firstName' ? MSG.firstName : MSG.lastName;
  }
  if (value.trim().length > 100) {
    return 'Máximo 100 caracteres.';
  }
  return null;
}

export function hasFieldErrors(errors: Record<string, string>): boolean {
  return Object.values(errors).some((msg) => !!msg);
}

export function validateLoginForm(email: string, password: string): LoginFieldErrors {
  return {
    email: validateEmail(email) ?? '',
    password: validateLoginPassword(password) ?? '',
  };
}

export function validateRegisterForm(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): RegisterFieldErrors {
  return {
    firstName: validateName(input.firstName, 'firstName') ?? '',
    lastName: validateName(input.lastName, 'lastName') ?? '',
    email: validateEmail(input.email) ?? '',
    password: validatePasswordPolicy(input.password) ?? '',
    confirmPassword: passwordsMatch(input.password, input.confirmPassword) ?? '',
  };
}

export function validateForgotForm(email: string): ForgotFieldErrors {
  return {
    email: validateEmail(email) ?? '',
  };
}

export function validateResetForm(
  password: string,
  confirmPassword: string
): ResetFieldErrors {
  return {
    password: validatePasswordPolicy(password) ?? '',
    confirmPassword: passwordsMatch(password, confirmPassword) ?? '',
  };
}
