'use client';
import { VARIANTS, AuthVariant } from './AuthVariants';

interface Props {
  active: AuthVariant;
}

const ORDER: AuthVariant[] = ['employee', 'admin', 'super'];

export default function RolePicker({ active }: Props) {
  const activeTheme = VARIANTS[active];

  return (
    <div
      className="role-picker"
      style={{
        background: 'rgba(46,33,28,0.04)',
        border: `1px solid ${activeTheme.inputBorder}`,
      }}
    >
      {ORDER.map((v) => {
        const t = VARIANTS[v];
        const isActive = v === active;
        const content = (
          <span className="role-picker-content">
            <span
              className="role-picker-dot"
              style={{ background: isActive ? '#fff' : t.primary, opacity: isActive ? 1 : 0.55 }}
            />
            {t.panelLabel}
          </span>
        );

        if (isActive) {
          return (
            <div
              key={v}
              className="role-picker-segment role-picker-active"
              style={{
                background: t.heroGradient,
                color: '#fff',
                boxShadow: t.buttonShadow,
              }}
            >
              {content}
            </div>
          );
        }

        return (
          <a
            key={v}
            href={t.loginRoute}
            className="role-picker-segment"
            style={{ color: activeTheme.textMuted }}
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}
