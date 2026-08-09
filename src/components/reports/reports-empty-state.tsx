export function ReportsEmptyState() {
  return (
    <section
      aria-label="Sin reportes"
      className="mt-8 border-2 border-ink bg-blue-600 p-6 text-white shadow-[4px_4px_0_0_#111111]"
    >
      <h2 className="font-extrabold uppercase tracking-tight">
        Aún no hay reportes
      </h2>
      <p className="mt-1 max-w-2xl text-sm font-medium">
        Tu primer reporte se generará al cierre del mes: al llegar el día 1,
        tus movimientos se compactan en un snapshot y el mes nuevo arranca en
        cero. Acá vas a poder comparar tu desempeño mes a mes.
      </p>
    </section>
  );
}