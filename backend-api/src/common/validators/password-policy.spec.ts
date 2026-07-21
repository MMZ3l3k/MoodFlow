import { validate } from 'class-validator';
import { MinLength } from 'class-validator';
import { IsSecurePassword } from './password-policy.decorator';

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

describe('IsSecurePassword (polityka haseł NF2)', () => {
  it.each([
    'Bezpieczne1',
    'mocneHaslo7',
    'zupa2Pomidorowa',
    'a1b2c3d4',
  ])('akceptuje hasło spełniające politykę: "%s"', async (password) => {
    expect(await isValid(password)).toBe(true);
  });

  it.each([
    ['12345678', 'same cyfry — brak litery'],
    ['abcdefgh', 'same litery — brak cyfry'],
    ['!@#$%^&*', 'brak litery i cyfry'],
  ])('odrzuca hasło bez wymaganej złożoności: "%s" (%s)', async (password) => {
    expect(await isValid(password)).toBe(false);
  });

  it.each([
    'password1',
    'Password123',
    'haslo123',
    'QWERTY123',
    'admin123',
    'zaq12wsx',
  ])('odrzuca hasło trywialne niezależnie od wielkości liter: "%s"', async (password) => {
    expect(await isValid(password)).toBe(false);
  });

  it('odrzuca hasło krótsze niż 8 znaków mimo spełnionej złożoności', async () => {
    expect(await isValid('abc1234')).toBe(false);
  });

  it('akceptuje litery spoza ASCII (polskie znaki) jako spełnienie wymogu litery', async () => {
    expect(await isValid('żółćźęą1')).toBe(true);
  });
});
