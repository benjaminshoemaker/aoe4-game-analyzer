interface HomePageProps {
  searchParams?: Promise<{
    error?: string | string[];
  }>;
}

const exampleUrl = 'https://aoe4world.com/players/111/games/123456';

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const errorText = firstParam(resolvedSearchParams?.error);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
    >
      <section
        style={{
          width: 'min(760px, 100%)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 24,
          boxShadow: '0 10px 30px rgba(62, 45, 22, 0.08)',
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: 30 }}>AoE4 Match Web</h1>
        <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 14 }}>
          Paste an AoE4World match URL. Private links with <code>sig</code> are supported.
        </p>
        <form method="get" action="/matches/open" style={{ display: 'grid', gap: 8 }}>
          <label
            htmlFor="match-url"
            style={{
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            AoE4World match URL
          </label>
          <input
            id="match-url"
            type="text"
            inputMode="url"
            name="url"
            placeholder={exampleUrl}
            required
            style={{
              width: '100%',
              minHeight: 44,
              padding: '12px 14px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 15,
            }}
          />
          <button
            type="submit"
            style={{
              width: 'fit-content',
              minWidth: 44,
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #7f2014',
              background: 'var(--primary)',
              color: '#fff9f5',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Open Match
          </button>
        </form>
        {errorText ? (
          <p style={{ margin: '12px 0 0', color: '#8f2714', fontSize: 13 }}>
            {errorText}
          </p>
        ) : null}
      </section>
    </main>
  );
}
