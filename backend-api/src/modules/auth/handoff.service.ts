import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

// H3: jednorazowy, krótkotrwały kod wymiany zamiast przekazywania tokenów w URL fragment.
// Klient (panel pracownika) po zalogowaniu HR/admina generuje kod i przekazuje go do
// panelu admina, który wymienia go na tokeny. Kod: jednorazowy, ważny 60 s, w pamięci
// procesu (backend to pojedyncza instancja — dla projektu inżynierskiego wystarczające).
interface HandoffEntry {
  accessToken: string;
  refreshToken: string;
  role: string;
  expiresAt: number;
}

const TTL_MS = 60 * 1000;

@Injectable()
export class HandoffService {
  private readonly store = new Map<string, HandoffEntry>();

  create(tokens: { accessToken: string; refreshToken: string }, role: string): string {
    this.purgeExpired();
    const code = randomBytes(32).toString('hex');
    this.store.set(code, { ...tokens, role, expiresAt: Date.now() + TTL_MS });
    return code;
  }

  // Kod jest jednorazowy — po odczytaniu jest usuwany niezależnie od wyniku.
  consume(code: string): HandoffEntry | null {
    const entry = this.store.get(code);
    if (!entry) return null;
    this.store.delete(code);
    if (entry.expiresAt < Date.now()) return null;
    return entry;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [code, entry] of this.store) {
      if (entry.expiresAt < now) this.store.delete(code);
    }
  }
}
