"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-card bg-ink px-4 py-2.5 text-sm font-medium text-paper"
    >
      Cetak / Simpan sebagai PDF
    </button>
  );
}
