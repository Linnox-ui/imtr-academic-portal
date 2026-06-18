"use client";

import { Download } from "lucide-react";

type StudentData = {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  status: string;
};

type DownloadCsvButtonProps = {
  students: StudentData[];
  filename: string;
};

export function DownloadCsvButton({
  students,
  filename,
}: DownloadCsvButtonProps) {
  const handleDownload = () => {
    // 1. Define the CSV headers
    const headers = [
      "Admission Number",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Gender",
      "Status",
    ];

    // 2. Map the student data into rows
    const rows = students.map((student) => [
      student.admissionNumber,
      student.firstName,
      student.lastName,
      student.email || "N/A",
      student.phone || "N/A",
      student.gender || "N/A",
      student.status,
    ]);

    // 3. Combine headers and rows into a CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")), // Wrap in quotes to handle commas in data
    ].join("\n");

    // 4. Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename.replace(/\s+/g, "_")}_Class_List.csv`,
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleDownload}
      className="group inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/10"
    >
      <Download className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
      Download CSV
    </button>
  );
}
