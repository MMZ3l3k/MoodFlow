const configs: Record<string, { label: string; classes: string }> = {
  minimal:           { label: 'Minimalny',         classes: 'bg-green-100 text-green-700' },
  mild:              { label: 'Łagodny',            classes: 'bg-yellow-100 text-yellow-700' },
  moderate:          { label: 'Umiarkowany',        classes: 'bg-orange-100 text-orange-700' },
  moderately_severe: { label: 'Umiarkowanie ciężki', classes: 'bg-red-100 text-red-700' },
  severe:            { label: 'Ciężki',             classes: 'bg-red-200 text-red-800' },
  low:               { label: 'Niski',              classes: 'bg-green-100 text-green-700' },
  high:              { label: 'Wysoki',             classes: 'bg-red-100 text-red-700' },
  low_wellbeing:     { label: 'Obniżony dobrostan', classes: 'bg-orange-100 text-orange-700' },
  adequate_wellbeing:{ label: 'Dobry dobrostan',   classes: 'bg-green-100 text-green-700' },
  very_bad:          { label: 'Bardzo źle',         classes: 'bg-red-200 text-red-800' },
  bad:               { label: 'Źle',               classes: 'bg-red-100 text-red-700' },
  neutral:           { label: 'Neutralnie',         classes: 'bg-gray-100 text-gray-600' },
  good:              { label: 'Dobrze',             classes: 'bg-green-100 text-green-700' },
  very_good:         { label: 'Bardzo dobrze',      classes: 'bg-green-200 text-green-800' },
  very_low:          { label: 'Bardzo niski',       classes: 'bg-red-100 text-red-700' },
  unknown:           { label: 'Nieznany',           classes: 'bg-gray-100 text-gray-500' },
};

export default function SeverityBadge({ severity }: { severity: string }) {
  const cfg = configs[severity] ?? configs.unknown;
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
