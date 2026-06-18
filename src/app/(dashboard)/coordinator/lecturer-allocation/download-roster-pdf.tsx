"use client";

import { Printer } from "lucide-react";

export type RosterData = {
  lecturerName: string;
  email: string;
  unitCode: string;
  unitTitle: string;
  role: string;
  assignedOn: string;
};

export function DownloadRosterPdf({
  roster,
  intakeCode,
}: {
  roster: RosterData[];
  intakeCode: string;
}) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${intakeCode} Lecturer Roster</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; color: #0f172a; }
            .header { margin-bottom: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; }
            h1 { font-size: 1.5rem; margin: 0 0 0.5rem 0; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.025em; }
            p { color: #64748b; margin: 0; font-size: 0.875rem; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.875rem; }
            th { background-color: #f8fafc; font-weight: 800; text-align: left; padding: 0.75rem 1rem; border-bottom: 2px solid #cbd5e1; color: #475569; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
            td { padding: 1rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            .strong { font-weight: 800; color: #0f172a; }
            .sub { color: #64748b; font-size: 0.75rem; display: block; margin-top: 0.25rem; font-weight: 600; }
            .badge { display: inline-block; padding: 0.25rem 0.5rem; background-color: #d1fae5; color: #047857; border-radius: 9999px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
            @media print {
              @page { margin: 1cm; }
              body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Lecturer Allocation Roster</h1>
            <p>Intake: ${intakeCode} | Generated on: ${new Date().toLocaleDateString("en-KE")}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Lecturer</th>
                <th>Unit Details</th>
                <th>Role</th>
                <th>Assigned On</th>
              </tr>
            </thead>
            <tbody>
              ${roster
                .map(
                  (r) => `
                <tr>
                  <td>
                    <span class="strong">${r.lecturerName}</span>
                    <span class="sub">${r.email}</span>
                  </td>
                  <td>
                    <span class="strong">${r.unitCode}</span>
                    <span class="sub">${r.unitTitle}</span>
                  </td>
                  <td>
                    <span class="badge">${r.role}</span>
                  </td>
                  <td>
                    <span class="strong">${r.assignedOn}</span>
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <button
      onClick={handlePrint}
      className="group inline-flex h-9 items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 text-[10px] font-black uppercase tracking-wider text-sky-700 transition-all hover:bg-sky-100"
    >
      <Printer className="h-3.5 w-3.5" />
      Print / Save PDF
    </button>
  );
}
