import { formatoCOP } from "@/lib/agregaciones";

interface Props {
  titulo: string;
  monto: number;
  destacado?: boolean;
  comparacion?: { anterior: number };
}

export function TarjetaKPI({ titulo, monto, destacado, comparacion }: Props) {
  let variacion: number | null = null;
  if (comparacion && comparacion.anterior > 0) {
    variacion = ((monto - comparacion.anterior) / comparacion.anterior) * 100;
  }

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        destacado ? "border-banco-verde bg-banco-verde/5" : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-gray-500">{titulo}</p>
      <p className={`mt-2 text-3xl font-bold ${destacado ? "text-banco-verde" : "text-gray-900"}`}>
        {formatoCOP(monto)}
      </p>
      {variacion !== null && (
        <p
          className={`mt-1 text-sm ${
            variacion > 0 ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {variacion > 0 ? "▲" : "▼"} {Math.abs(variacion).toFixed(0)}% vs mes anterior
        </p>
      )}
    </div>
  );
}
