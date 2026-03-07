import { CheckCircle, XCircle, Clock } from "lucide-react";

interface Props {
  sent: boolean;
  label: string;
}

export function StatusBadge({ sent, label }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
        sent
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {sent ? (
        <CheckCircle size={12} />
      ) : (
        <XCircle size={12} />
      )}
      {label}
    </span>
  );
}

export function PendingBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
      <Clock size={12} />
      {label}
    </span>
  );
}
