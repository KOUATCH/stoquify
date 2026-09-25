export default function ReceiptNotFound() {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-6 py-16">
      <section lang="en" className="space-y-2">
        <h1 className="text-2xl font-semibold">Receipt unavailable</h1>
        <p>This link is invalid, expired, or no longer available. Ask the store for a new receipt link.</p>
      </section>
      <section lang="fr" className="space-y-2">
        <h2 className="text-2xl font-semibold">Reçu indisponible</h2>
        <p>Ce lien est invalide, expiré ou n’est plus disponible. Demandez un nouveau lien au magasin.</p>
      </section>
    </main>
  )
}
