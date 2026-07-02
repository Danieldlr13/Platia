import { formatoCOP } from "@/lib/agregaciones";

interface Props {
  titulo: string;
  monto: number;
  destacado?: boolean;
  comparacion?: { anterior: number };
  /** "cop" formatea como pesos; "numero" muestra un entero (p. ej. # de movimientos). */
  formato?: "cop" | "numero";
}

export function TarjetaKPI({
  titulo,
  monto,
  destacado,
  comparacion,
  formato = "cop",
}: Props) {
  const valor =
    formato === "cop" ? formatoCOP(monto) : monto.toLocaleString("es-CO");

  let variacion: number | null = null;
  if (comparacion && comparacion.anterior > 0) {
    variacion = ((monto - comparacion.anterior) / comparacion.anterior) * 100;
  }

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
        destacado
          ? "border-banco-verde bg-banco-verde/5"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium text-gray-500 sm:text-sm">{titulo}</p>
      <p
        className={`mt-2 text-2xl font-bold sm:text-3xl ${
          destacado ? "text-banco-verde" : "text-gray-900"
        }`}
      >
        {valor}
      </p>
      {variacion !== null && (
        <p
          className={`mt-1 text-xs sm:text-sm ${
            variacion > 0 ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {variacion > 0 ? "▲" : "▼"} {Math.abs(variacion).toFixed(0)}% vs mes anterior
        </p>
      )}
    </div>
  );
}
