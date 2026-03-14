const configs: Record<string, { label: string; bg: string; color: string }> = {
  minimal:            { label: 'Minimalny',           bg: 'rgba(156,184,183,0.18)', color: '#5A8A89' },
  mild:               { label: 'Łagodny',             bg: 'rgba(197,218,218,0.35)', color: '#4A7A79' },
  moderate:           { label: 'Umiarkowany',         bg: 'rgba(234,180,100,0.18)', color: '#A0700A' },
  moderately_severe:  { label: 'Umiarkowanie ciężki', bg: 'rgba(192,98,38,0.15)',   color: '#C06226' },
  severe:             { label: 'Ciężki',              bg: 'rgba(152,70,25,0.15)',   color: '#984619' },
  low:                { label: 'Niski',               bg: 'rgba(156,184,183,0.18)', color: '#5A8A89' },
  high:               { label: 'Wysoki',              bg: 'rgba(192,98,38,0.15)',   color: '#C06226' },
  low_wellbeing:      { label: 'Obniżony dobrostan',  bg: 'rgba(192,98,38,0.12)',   color: '#C06226' },
  adequate_wellbeing: { label: 'Dobry dobrostan',     bg: 'rgba(156,184,183,0.18)', color: '#5A8A89' },
  very_bad:           { label: 'Bardzo źle',          bg: 'rgba(152,70,25,0.15)',   color: '#984619' },
  bad:                { label: 'Źle',                 bg: 'rgba(192,98,38,0.15)',   color: '#C06226' },
  neutral:            { label: 'Neutralnie',           bg: 'rgba(46,33,28,0.08)',    color: 'rgba(46,33,28,0.55)' },
  good:               { label: 'Dobrze',              bg: 'rgba(156,184,183,0.2)',  color: '#4A7A79' },
  very_good:          { label: 'Bardzo dobrze',       bg: 'rgba(156,184,183,0.3)',  color: '#3A6A69' },
  very_low:           { label: 'Bardzo niski',        bg: 'rgba(192,98,38,0.12)',   color: '#C06226' },
  unknown:            { label: 'Nieznany',             bg: 'rgba(46,33,28,0.06)',    color: 'rgba(46,33,28,0.35)' },
};

export default function SeverityBadge({ severity }: { severity: string }) {
  const cfg = configs[severity] ?? configs.unknown;
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}
