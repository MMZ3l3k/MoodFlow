import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface AssignmentNotificationPayload {
  toEmail: string;
  toName: string;
  assessmentName: string;
  availableTo: Date;
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

    try {
      await this.mailerService.sendMail({
        to: payload.toEmail,
        subject: `MoodFlow – przypisano Ci nowy test: ${payload.assessmentName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">MoodFlow – nowy test do wypełnienia</h2>
            <p>Cześć <strong>${payload.toName}</strong>,</p>
            <p>Zostałeś/aś przypisany/a do nowego testu w platformie MoodFlow:</p>
            <div style="background: #f3f4f6; border-left: 4px solid #4f46e5; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <strong style="font-size: 18px;">${payload.assessmentName}</strong>
            </div>
            <p>Test jest dostępny do: <strong>${deadline}</strong></p>
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
      this.logger.error(`Błąd wysyłania e-maila do ${payload.toEmail}: ${error.message}`);
      // Nie rzucamy błędu – brak maila nie może blokować przypisania testu
    }
  }
}
