// Carga las variables desde el archivo .env cuando se ejecuta en local.
// En CI (GitHub Actions) el archivo no existe y las variables ya vienen del
// entorno, así que ignoramos el error.
try {
  process.loadEnvFile(".env");
} catch {
  // Sin .env: se asume que las variables están definidas en el entorno.
}
