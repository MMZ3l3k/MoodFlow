import { validate } from 'class-validator';
import { MinLength } from 'class-validator';
import { IsSecurePassword } from './password-policy.decorator';

// Testowy obiekt z tymi samymi regulami co prawdziwe DTO rejestracji.
class TestDto {
  @MinLength(8)
  @IsSecurePassword()
  password: string;
  constructor(password: string) {
    this.password = password;
  }
}

async function isValid(password: string): Promise<boolean> {
  const errors = await validate(new TestDto(password));
  return errors.length === 0;
}

describe('Polityka hasel', () => {
  it('akceptuje poprawne haslo (litera + cyfra, min. 8 znakow)', async () => {
    expect(await isValid('Bezpieczne1')).toBe(true);
  });

  it('odrzuca haslo bez cyfry', async () => {
    expect(await isValid('samelitery')).toBe(false);
  });

  it('odrzuca haslo bez litery', async () => {
    expect(await isValid('12345678')).toBe(false);
  });

  it('odrzuca haslo krotsze niz 8 znakow', async () => {
    expect(await isValid('Abc123')).toBe(false);
  });

  it('odrzuca popularne haslo z listy (np. Password123)', async () => {
    expect(await isValid('Password123')).toBe(false);
  });
});
