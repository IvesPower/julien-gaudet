// Fallback for requests that never reach a locale (outside the proxy matcher).
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body>
        <main>
          <h1>Page introuvable</h1>
        </main>
      </body>
    </html>
  );
}
