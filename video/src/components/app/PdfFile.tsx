import React from "react"
import { FileText } from "lucide-react"

/** Ein Lebenslauf als PDF-Datei, wie er vom Desktop in die Dropzone gezogen wird. */
export const PdfFile: React.FC<{ name: string; initials: string; fullName: string }> = ({ name, initials, fullName }) => (
  <div className="w-[230px] rounded-2xl bg-white p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,.55)] ring-1 ring-black/5">
    {/* Seitenvorschau */}
    <div className="relative h-[200px] overflow-hidden rounded-lg border border-slate-100 bg-white p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-[#0C1A16]" style={{ backgroundImage: "var(--rv-gradient)" }}>
          {initials}
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-900">{fullName}</div>
          <div className="text-[9px] text-slate-500">Lebenslauf</div>
        </div>
      </div>
      {[70, 92, 84, 88, 40, 90, 76, 86, 64].map((w, i) => (
        <div key={i} className="mt-2 h-[5px] rounded-full" style={{ width: `${w}%`, background: i === 4 ? "#DCE2E6" : "#EEF1F3" }} />
      ))}
      <span className="absolute right-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">PDF</span>
    </div>
    <div className="mt-3 flex items-center gap-2">
      <FileText className="h-4 w-4 text-red-500" />
      <span className="truncate text-xs font-semibold text-slate-700">{name}</span>
    </div>
  </div>
)
