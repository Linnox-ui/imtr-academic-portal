"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { generatePerformanceCSV } from "@/app/(dashboard)/academic-director/reports/actions";

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    try {
      setIsExporting(true);

      // Fetch the CSV string from the secure server action
      const csvData = await generatePerformanceCSV();

      // Create a Blob (a file object in the browser)
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      // Create a hidden link and click it programmatically
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "IMTR_Academic_Performance_Report.csv");
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isExporting}
      className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 transition-colors px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer disabled:opacity-50"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? "Exporting..." : "Export Global Report"}
    </button>
  );
}
