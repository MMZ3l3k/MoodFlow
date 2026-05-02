import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const ICONS: Record<string, string> = {
  ASSIGNMENT_NEW: '📋',
  ASSESSMENT_COMPLETED: '✅',
  USER_APPROVED: '🎉',
  USER_REJECTED: '⚠️',
  RISK_ALERT: '🚨',
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'przed chwilą';
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} dni temu`;
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

export default function NotificationBell({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const [list, count] = await Promise.all([
        axiosClient.get<Notification[]>('/notifications'),
        axiosClient.get<{ count: number }>('/notifications/unread-count'),
      ]);
      setItems(list.data);
      setUnread(count.data.count);
    } catch {
      // brak sesji / 401 — interceptor obsłuży
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // poll co 30s
    return () => clearInterval(interval);
  }, []);

  // Zamykanie dropdown po kliknięciu obok
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id: number) => {
    try {
      await axiosClient.post(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await axiosClient.post('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  const handleClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.link) {
      navigate(n.link.startsWith('/app') ? n.link : `/app${n.link}`);
      setOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Powiadomienia${unread > 0 ? ` (${unread} nieprzeczytanych)` : ''}`}
        className="theme-toggle"
        style={{
          width: compact ? 32 : 36,
          height: compact ? 32 : 36,
          position: 'relative',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 9,
            background: '#C06226',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--bg-page)',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 480,
            overflowY: 'auto',
            background: 'var(--bg-elevated, var(--bg-surface))',
            border: '1px solid var(--border-base)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 50,
          }}
        >
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-base)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-elevated, var(--bg-surface))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-base)' }}>
              Powiadomienia {unread > 0 && <span style={{ color: '#C06226' }}>({unread})</span>}
            </span>
            {items.length > 0 && unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  color: '#C06226',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Oznacz wszystkie
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-subtle)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
              <div style={{ fontSize: 13 }}>Brak powiadomień</div>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: n.link ? 'pointer' : 'default',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    background: n.read ? 'transparent' : 'rgba(192, 98, 38, 0.06)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { if (n.link) e.currentTarget.style.background = 'var(--bg-muted)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(192, 98, 38, 0.06)'; }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{ICONS[n.type] ?? '🔔'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-base)',
                      marginBottom: 2,
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                      marginBottom: 4,
                    }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                      {formatRelativeTime(n.createdAt)}
                    </div>
                  </div>
                  {!n.read && (
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#C06226',
                      flexShrink: 0,
                      marginTop: 6,
                    }} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
