// Testy E2E (end-to-end) — sprawdzaja cala aplikacje uruchomiona naprawde:
// zadanie HTTP przechodzi przez kontroler, walidacje, autoryzacje i baze danych.
// Wymagaja dzialajacej bazy PostgreSQL. Uruchomienie:
//   docker compose up -d postgres
//   DB_HOST=localhost npm run test:e2e
//
// Uslugi zewnetrzne (poczta) podmieniamy na atrape, zeby test nie laczyl sie z SMTP.

process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e_test_secret_co_najmniej_32_znaki_1234567890';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'e2e_test_refresh_secret_inny_32_znaki_0987654321';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { MailService } from './../src/modules/notifications/mail.service';

describe('MoodFlow (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // atrapa poczty — nie wysylamy prawdziwych maili w tescie
      .overrideProvider(MailService)
      .useValue({
        sendRegistrationPending: jest.fn(),
        sendAccountApproved: jest.fn(),
        sendOrganizationDecision: jest.fn(),
        sendAssignmentNotification: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    // taka sama walidacja jak w produkcji (main.ts)
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health zwraca status ok i potwierdza polaczenie z baza', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database).toBe('ok');
  });

  it('rejestracja firmy ze zbyt slabym haslem jest odrzucana (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register-company')
      .send({
        companyName: 'Firma E2E',
        nip: '9999999999',
        email: 'e2e-slabe-haslo@test.pl',
        firstName: 'Jan',
        lastName: 'Kowalski',
        password: '12345678', // brak litery — narusza polityke hasel
      });
    expect(res.status).toBe(400);
  });

  it('proba pobrania listy uzytkownikow bez logowania konczy sie 401', async () => {
    const res = await request(app.getHttpServer()).get('/users');
    expect(res.status).toBe(401);
  });
});
