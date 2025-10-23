export type RewardVoucher = {
  taskId: number;
  user: `0x${string}`;
  action: number;
  amount: string;   // wei (string)
  nonce: string;
  deadline: string;
};
export type SignedVoucher = { voucher: RewardVoucher; sig: `0x${string}` };

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SIGN_API || "/api/sign-voucher";
}

export async function fetchVoucher(q: {
  taskId: number;
  user: `0x${string}`;
  action: number;
  amountWei?: string;
  ttl?: number;
}): Promise<SignedVoucher> {
  const u = new URL(baseUrl(), typeof window === "undefined" ? "http://localhost" : window.location.origin);
  u.searchParams.set("taskId", String(q.taskId));
  u.searchParams.set("user", q.user);
  u.searchParams.set("action", String(q.action));
  if (q.amountWei) u.searchParams.set("amountWei", q.amountWei);
  if (q.ttl) u.searchParams.set("ttl", String(q.ttl));

  const res = await fetch(u.toString());
  const contentType = res.headers.get("content-type") || "";

  // sunucu hata mesajını geçir
  if (!res.ok) {
    const text = contentType.includes("application/json") ? JSON.stringify(await res.json()) : await res.text();
    throw new Error(`sign api ${res.status}: ${text}`);
  }

  const data = contentType.includes("application/json") ? await res.json() : null;

  // Esnek doğrulama: {voucher,sig} ya da {signature} varyantını yakala
  const sig = data?.sig ?? data?.signature;
  const v = data?.voucher ?? data;

  if (!sig || !v || v.taskId === undefined || !v.user || v.amount === undefined || !v.deadline) {
    // Tanı için ham yanıtı konsola yaz
    console.warn("Invalid voucher payload:", data);
    throw new Error("Invalid voucher payload");
  }

  return {
    sig,
    voucher: {
      taskId: Number(v.taskId),
      user: v.user,
      action: Number(v.action ?? 1),
      amount: String(v.amount),
      nonce: String(v.nonce ?? "0"),
      deadline: String(v.deadline),
    },
  };
}
