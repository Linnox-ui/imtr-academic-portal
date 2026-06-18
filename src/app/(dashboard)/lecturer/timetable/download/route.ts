import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { name: true } },
      },
    });

    if (!currentUser || currentUser.role.name !== "lecturer") {
      return new Response("Unauthorized or User not found", { status: 401 });
    }

    const entries = await prisma.timetableEntry.findMany({
      where: { lecturerId: currentUser.id, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startPeriod: "asc" }],
      select: {
        dayOfWeek: true,
        startPeriod: true,
        endPeriod: true,
        room: true,
        intake: { select: { code: true } },
        unitAssignment: {
          select: { unit: { select: { code: true, title: true } } },
        },
      },
    });

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 40 });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));

        const logoPath = path.join(process.cwd(), "public", "gok-logo.jpg");
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, doc.page.width / 2 - 30, 40, { width: 60 });
        }

        doc.moveDown(4);
        doc
          .fontSize(16)
          .font("Helvetica-Bold")
          .fillColor("#0f172a")
          .text("INSTITUTE FOR METEOROLOGICAL", { align: "center" });
        doc.fontSize(14).text("TRAINING AND RESEARCH", { align: "center" });
        doc.moveDown(0.5);
        doc
          .fontSize(11)
          .font("Helvetica")
          .fillColor("#64748b")
          .text("LECTURER TIMETABLE", { align: "center" });
        doc.moveDown(1.5);

        let currentY = doc.y;

        doc.roundedRect(40, currentY, 515, 65, 8).fill("#f8fafc");
        doc
          .roundedRect(40, currentY, 515, 65, 8)
          .lineWidth(1)
          .stroke("#e2e8f0");

        const lecturerName =
          [currentUser.firstName, currentUser.lastName]
            .filter(Boolean)
            .join(" ") || currentUser.email;
        const uniqueClasses = new Set(entries.map((e) => e.intake.code)).size;
        const totalHours = entries.reduce(
          (sum, e) => sum + (e.endPeriod - e.startPeriod + 1),
          0,
        );

        doc.fillColor("#0f172a");
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text("Lecturer:", 55, currentY + 15);
        doc.font("Helvetica").text(lecturerName, 125, currentY + 15);

        doc.font("Helvetica-Bold").text("Email:", 55, currentY + 35);
        doc.font("Helvetica").text(currentUser.email, 125, currentY + 35);

        doc.font("Helvetica-Bold").text("Total Classes:", 350, currentY + 15);
        doc
          .font("Helvetica")
          .text(uniqueClasses.toString(), 430, currentY + 15);
        doc.font("Helvetica-Bold").text("Weekly Hours:", 350, currentY + 35);
        doc.font("Helvetica").text(totalHours.toString(), 430, currentY + 35);

        currentY += 90;

        const colWidths = { day: 65, block: 150 };
        const startX = 40;
        const cols = {
          day: startX,
          morning: startX + colWidths.day,
          mid: startX + colWidths.day + colWidths.block,
          afternoon: startX + colWidths.day + colWidths.block * 2,
        };

        const drawTableHeader = (y: number) => {
          doc.roundedRect(startX, y, 515, 28, 4).fill("#0f172a");
          doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
          doc.text("DAY", cols.day + 10, y + 10);
          doc.text("MORNING (08:20-10:20)", cols.morning + 10, y + 10);
          doc.text("MID-MORNING (11:00-13:00)", cols.mid + 10, y + 10);
          doc.text("AFTERNOON (14:00-16:00)", cols.afternoon + 10, y + 10);
          return y + 28;
        };

        currentY = drawTableHeader(currentY);

        const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

        const getBlockClasses = (
          dayEntries: any[],
          blockStart: number,
          blockEnd: number,
        ) => {
          return dayEntries.filter(
            (e) => e.startPeriod >= blockStart && e.startPeriod <= blockEnd,
          );
        };

        const calculateCellHeight = (classes: any[]) => {
          if (classes.length === 0) return 30;
          let h = 10;
          classes.forEach((c) => {
            const title = c.unitAssignment.unit.title;
            doc.fontSize(8);
            h += 12;
            h += doc.heightOfString(title, { width: colWidths.block - 20 }) + 4;
            h += 12;
            h += 8;
          });
          return h + 10;
        };

        const drawCellContent = (classes: any[], x: number, y: number) => {
          if (classes.length === 0) {
            doc
              .fillColor("#cbd5e1")
              .font("Helvetica")
              .fontSize(10)
              .text("-", x + colWidths.block / 2 - 5, y + 15);
            return;
          }

          let cy = y + 10;
          classes.forEach((c) => {
            const timeStr = formatSlot(c.startPeriod, c.endPeriod);
            doc
              .fillColor("#0284c7")
              .font("Helvetica-Bold")
              .fontSize(8)
              .text(timeStr, x + 10, cy);
            cy += 12;

            const codeStr = c.unitAssignment.unit.code;
            doc
              .fillColor("#0f172a")
              .font("Helvetica-Bold")
              .fontSize(9)
              .text(codeStr, x + 10, cy);
            cy += 12;

            const titleStr = c.unitAssignment.unit.title;
            doc
              .fillColor("#475569")
              .font("Helvetica")
              .fontSize(8)
              .text(titleStr, x + 10, cy, { width: colWidths.block - 20 });
            cy +=
              doc.heightOfString(titleStr, { width: colWidths.block - 20 }) + 4;

            const roomText = c.room ? ` • Rm: ${c.room}` : "";
            const classStr = `Class: ${c.intake.code}${roomText}`;
            doc
              .fillColor("#64748b")
              .font("Helvetica-Bold")
              .fontSize(8)
              .text(classStr, x + 10, cy, { width: colWidths.block - 20 });
            cy += 16;
          });
        };

        DAYS.forEach((day) => {
          const dayEntries = entries.filter((e) => e.dayOfWeek === day);
          const morning = getBlockClasses(dayEntries, 1, 2);
          const mid = getBlockClasses(dayEntries, 3, 4);
          const afternoon = getBlockClasses(dayEntries, 5, 6);

          const maxH = Math.max(
            30,
            calculateCellHeight(morning),
            calculateCellHeight(mid),
            calculateCellHeight(afternoon),
          );

          if (currentY + maxH > 750) {
            doc.addPage();
            currentY = drawTableHeader(40);
          }

          doc
            .rect(startX, currentY, colWidths.day, maxH)
            .lineWidth(0.5)
            .stroke("#e2e8f0");
          doc
            .rect(cols.morning, currentY, colWidths.block, maxH)
            .stroke("#e2e8f0");
          doc.rect(cols.mid, currentY, colWidths.block, maxH).stroke("#e2e8f0");
          doc
            .rect(cols.afternoon, currentY, colWidths.block, maxH)
            .stroke("#e2e8f0");

          doc
            .fillColor("#0f172a")
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(day, cols.day + 10, currentY + 15);

          drawCellContent(morning, cols.morning, currentY);
          drawCellContent(mid, cols.mid, currentY);
          drawCellContent(afternoon, cols.afternoon, currentY);

          currentY += maxH;
        });

        const pages = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
        for (let i = 0; i < pages; i++) {
          doc.switchToPage(i);
          doc
            .fontSize(8)
            .font("Helvetica-Oblique")
            .fillColor("#94a3b8")
            .text(
              `Generated on ${new Date().toLocaleString("en-GB")} | Document is strictly internal.`,
              40,
              780,
              { align: "center" },
            );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="timetable-${currentUser.firstName || "lecturer"}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

function formatSlot(startPeriod: number, endPeriod: number) {
  const periodTimes: Record<number, string> = {
    1: "08:20",
    2: "09:20",
    3: "11:00",
    4: "12:00",
    5: "14:00",
    6: "15:00",
  };
  const endTimes: Record<number, string> = {
    1: "09:20",
    2: "10:20",
    3: "12:00",
    4: "13:00",
    5: "15:00",
    6: "16:00",
  };
  return `${periodTimes[startPeriod]} - ${endTimes[endPeriod]}`;
}
