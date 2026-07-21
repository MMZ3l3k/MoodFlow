import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

// NF2: lista haseł trywialnych odrzucanych niezależnie od spełnienia
// wymogów złożoności (porównanie bez rozróżniania wielkości liter).
const TRIVIAL_PASSWORDS = [
  'password',
  'password1',
  'password123',
  'haslo123',
  'haslo1234',
  'hasło123',
  'qwerty123',
  'qwertyuiop',
  '12345678',
  '123456789',
  '1234567890',
  'abc12345',
  'admin123',
  'zaq12wsx',
  'polska123',
];

/**
 * NF2: polityka haseł — hasło musi zawierać co najmniej jedną literę
 * i jedną cyfrę oraz nie może znajdować się na liście haseł trywialnych.
 * Minimalną długość (8 znaków) wymusza osobno @MinLength w DTO.
 */
export function IsSecurePassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSecurePassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          if (!/\p{L}/u.test(value)) return false;
          if (!/\d/.test(value)) return false;
          return !TRIVIAL_PASSWORDS.includes(value.toLowerCase());
        },
        defaultMessage(_args: ValidationArguments): string {
          return 'Hasło musi zawierać literę i cyfrę oraz nie może być hasłem powszechnie używanym';
        },
      },
    });
  };
}
