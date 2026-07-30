"use client";

// Campo de dinero con separador de miles mientras se escribe. Guarda el texto
// formateado ("1.250.000"); quien lo use lo convierte con parsearMiles().

import { formatearMiles } from "@/lib/formato-numero";

interface Props {
  valor: string;
  onChange: (valor: string) => void;
  id?: string;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}

export function CampoMonto({
  valor,
  onChange,
  id,
  autoFocus,
  className,
  placeholder = "0",
}: Props) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      value={valor}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => onChange(formatearMiles(e.target.value))}
    />
  );
}
