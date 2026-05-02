const exampleUrl = 'https://aoe4world.com/players/111/games/123456';
const faviconHref = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2032%2032'%3E%3Crect%20width='32'%20height='32'%20rx='6'%20fill='%239b2f1f'/%3E%3Cpath%20d='M8%2022h16v3H8zM10%208h12l-2%2012h-8z'%20fill='%23fff9f5'/%3E%3C/svg%3E";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderHomeHtml(errorText?: string | null): string {
  const escapedError = errorText ? escapeHtml(errorText) : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AoE4 Match Web</title>
  <meta name="description" content="Web view for AoE4 post-match analysis" />
  <link rel="icon" href="${faviconHref}" />
  <style>
    :root {
      --background: #f7f2e8;
      --surface: #fffdf9;
      --border: #d9c9ad;
      --text: #2a1f16;
      --muted: #5f5345;
      --primary: #9b2f1f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: var(--background);
      color: var(--text);
      font-family: "Trebuchet MS", "Avenir Next", "Gill Sans", sans-serif;
    }
    main { width: min(760px, 100%); }
    section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(62, 45, 22, 0.08);
    }
    h1 { margin: 0 0 8px; font-size: 30px; line-height: 1.15; }
    p { margin: 0 0 16px; color: var(--muted); font-size: 14px; line-height: 1.45; }
    form { display: grid; gap: 8px; }
    label { color: var(--text); font-size: 13px; font-weight: 700; }
    input {
      width: 100%;
      min-height: 44px;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font: inherit;
      font-size: 15px;
      background: #fff;
      color: var(--text);
    }
    button {
      width: fit-content;
      min-width: 44px;
      min-height: 44px;
      padding: 10px 14px;
      border: 1px solid #7f2014;
      border-radius: 8px;
      background: var(--primary);
      color: #fff9f5;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .error { margin: 12px 0 0; color: #8f2714; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>AoE4 Match Web</h1>
      <p>Paste an AoE4World match URL. Private links with <code>sig</code> are supported.</p>
      <form method="get" action="/matches/open">
        <label for="match-url">AoE4World match URL</label>
        <input id="match-url" type="text" inputmode="url" name="url" placeholder="${exampleUrl}" required />
        <button type="submit">Open Match</button>
      </form>
      ${escapedError ? `<p class="error">${escapedError}</p>` : ''}
    </section>
  </main>
</body>
</html>`;
}
