import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface AssignmentNotificationPayload {
  toEmail: string;
  toName: string;
  assessmentName: string;
  availableTo: Date;
}

// Escape HTML — chroni przed wstrzyknięciem znaczników/skryptów przez nazwę testu lub użytkownika.
function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendAssignmentNotification(payload: AssignmentNotificationPayload): Promise<void> {
    const deadline = payload.availableTo.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const safeName = escapeHtml(payload.toName);
    const safeAssessment = escapeHtml(payload.assessmentName);
    const safeDeadline = escapeHtml(deadline);

    try {
      await this.mailerService.sendMail({
        to: payload.toEmail,
        // Subject jest plain text — nodemailer sam go enkoduje, nie wstawia do HTML.
        subject: `MoodFlow – przypisano Ci nowy test: ${payload.assessmentName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">MoodFlow – nowy test do wypełnienia</h2>
            <p>Cześć <strong>${safeName}</strong>,</p>
            <p>Zostałeś/aś przypisany/a do nowego testu w platformie MoodFlow:</p>
            <div style="background: #f3f4f6; border-left: 4px solid #4f46e5; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <strong style="font-size: 18px;">${safeAssessment}</strong>
            </div>
            <p>Test jest dostępny do: <strong>${safeDeadline}</strong></p>
            <p>Zaloguj się do platformy MoodFlow, aby wypełnić test przed upływem terminu.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #6b7280; font-size: 12px;">
              Wiadomość wygenerowana automatycznie przez system MoodFlow. Prosimy nie odpowiadać na tę wiadomość.
            </p>
          </div>
        `,
      });
      this.logger.log(`E-mail z powiadomieniem wysłany do ${payload.toEmail}`);
    } catch (error) {
      this.logger.error(`Błąd wysyłania e-maila do ${payload.toEmail}: ${(error as Error).message}`);
      // Nie rzucamy błędu – brak maila nie może blokować przypisania testu
    }
  }

  // PU-2: potwierdzenie rejestracji — konto czeka na zatwierdzenie
  async sendRegistrationPending(toEmail: string, toName: string): Promise<void> {
    await this.sendTransactional(
      toEmail,
      'MoodFlow – konto oczekuje na zatwierdzenie',
      `<p>Cześć <strong>${escapeHtml(toName)}</strong>,</p>
       <p>Twoje konto w platformie MoodFlow zostało utworzone i oczekuje na zatwierdzenie
       przez administratora Twojej firmy. Otrzymasz dostęp po akceptacji konta.</p>`,
    );
  }

  // PU-16: konto pracownika zostało zatwierdzone
  async sendAccountApproved(toEmail: string, toName: string): Promise<void> {
    await this.sendTransactional(
      toEmail,
      'MoodFlow – Twoje konto zostało aktywowane',
      `<p>Cześć <strong>${escapeHtml(toName)}</strong>,</p>
       <p>Twoje konto w platformie MoodFlow zostało zatwierdzone przez administratora.
       Możesz się już zalogować i korzystać z platformy.</p>`,
    );
  }

  // PU-21: decyzja właściciela platformy w sprawie rejestracji firmy
  async sendOrganizationDecision(
    toEmail: string,
    toName: string,
    organizationName: string,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    const safeOrg = escapeHtml(organizationName);
    const body = approved
      ? `<p>Cześć <strong>${escapeHtml(toName)}</strong>,</p>
         <p>Rejestracja firmy <strong>${safeOrg}</strong> w platformie MoodFlow została
         <strong>zatwierdzona</strong>. Możesz się zalogować do panelu administratora —
         kod zaproszenia dla pracowników znajdziesz w widoku swojej organizacji.</p>`
      : `<p>Cześć <strong>${escapeHtml(toName)}</strong>,</p>
         <p>Rejestracja firmy <strong>${safeOrg}</strong> w platformie MoodFlow została
         <strong>odrzucona</strong>.</p>${reason ? `<p>Uzasadnienie: ${escapeHtml(reason)}</p>` : ''}`;
    await this.sendTransactional(
      toEmail,
      approved
        ? `MoodFlow – firma ${organizationName} została zatwierdzona`
        : `MoodFlow – rejestracja firmy ${organizationName} została odrzucona`,
      body,
    );
  }

  // Wspólna otoczka: jednolity layout + logowanie błędów bez propagacji
  // (awaria SMTP nie może blokować logiki biznesowej).
  private async sendTransactional(toEmail: string, subject: string, bodyHtml: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: toEmail,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">MoodFlow</h2>
            ${bodyHtml}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #6b7280; font-size: 12px;">
              Wiadomość wygenerowana automatycznie przez system MoodFlow. Prosimy nie odpowiadać na tę wiadomość.
            </p>
          </div>
        `,
      });
      this.logger.log(`E-mail „${subject}" wysłany do ${toEmail}`);
    } catch (error) {
      this.logger.error(`Błąd wysyłania e-maila do ${toEmail}: ${(error as Error).message}`);
    }
  }
}
