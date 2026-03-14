const configs = {
  active:   { label: 'Aktywny',    classes: 'bg-green-100 text-green-700' },
  pending:  { label: 'Oczekujący', classes: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'Odrzucony',  classes: 'bg-red-100 text-red-700' },
};

export default function UserStatusBadge({ status }: { status: 'active' | 'pending' | 'rejected' }) {
  const cfg = configs[status] ?? configs.pending;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}
