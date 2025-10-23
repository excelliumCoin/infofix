import toast from "react-hot-toast";

const EXPLORER = "https://testnet.monadexplorer.com/";

export function toastTx(hash: `0x${string}`, label = "Transaction sent") {
  toast.success(
    <div>
      <div>{label}</div>
      <a
        href={`${EXPLORER}/tx/${hash}`}
        target="_blank"
        rel="noreferrer"
        style={{ textDecoration: "underline" }}
      >
        View on explorer
      </a>
    </div>
  );
}

export function toastErr(e: any, fallback = "Something went wrong") {
  const m = e?.shortMessage || e?.message || String(e);
  toast.error(m || fallback);
}
