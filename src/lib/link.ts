// 0=Follow, 1=Like, 2=Recast
export type Action = 0 | 1 | 2;

function ensureHttp(u: string) {
  if (!/^https?:\/\//i.test(u)) return "https://" + u;
  return u;
}

function normX(url: string): URL | null {
  try {
    const u = new URL(ensureHttp(url));
    if (u.hostname === "twitter.com") u.hostname = "x.com";
    return u;
  } catch {
    return null;
  }
}

/**
 * Görev URL'sini aksiyona göre hedefe çevirir.
 * - Follow: her durumda profil sayfasına gönderir
 * - Like/Recast: gönderi linkine (verilen URL gönderi ise aynen; profil verilmişse profili açar)
 */
export function actionUrl(base: string, action: Action): string {
  const u = normX(base);
  if (!u) return ensureHttp(base);

  const parts = u.pathname.split("/").filter(Boolean); // ["user", "status", "12345"]
  const handle = parts[0] || "";

  // Follow: her durumda profil
  if (action === 0) {
    return `https://x.com/${handle}`;
  }

  // Like / Recast:
  // Eğer URL zaten status ise olduğu gibi bırak; değilse en azından profil sayfasını açalım
  const isStatus = parts.length >= 3 && parts[1] === "status";
  if (isStatus) {
    return u.toString();
  } else {
    return `https://x.com/${handle}`;
  }
}
