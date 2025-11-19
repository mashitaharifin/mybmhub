import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type LogRow = Record<string, any>;

export async function exportToPDF(
	logs: LogRow[],
	filename: string,
	title: string,
	company?: {
		logoPath?: string;
		name?: string;
		address?: string;
		country?: string;
		email?: string;
		phone?: string;
		regNo?: string;
	}
) {
	const doc = new jsPDF({ orientation: 'landscape' });

	// Company header
	if (company) {
		const yStart = 10;
		if (company.logoPath) {
			const img = new Image();
			img.src = company.logoPath;
			doc.addImage(img, 'PNG', 10, yStart, 30, 30);
		}
		doc.setFontSize(16);
		doc.text(company.name || '', 50, yStart + 10);
		doc.setFontSize(10);
		doc.text(`${company.address || ''}, ${company.country || ''}`, 50, yStart + 15);
		doc.text(`Email: ${company.email || ''} | Phone: ${company.phone || ''}`, 50, yStart + 20);
		doc.text(`Reg No: ${company.regNo || ''}`, 50, yStart + 25);
		doc.setLineWidth(0.5);
		doc.line(10, yStart + 30, 280, yStart + 30);
	}

	// Export title
	doc.setFontSize(12);
	doc.text(title, 10, 45);

	// Table content
	if (logs.length) {
		const columns = Object.keys(logs[0]).map((k) => ({ header: k, dataKey: k }));
		autoTable(doc, {
			startY: 50,
			head: [columns.map((c) => c.header)],
			body: logs.map((row: LogRow) => columns.map((c) => row[c.dataKey])),
			styles: { fontSize: 8 }
		});
	}

	// Footer with export date
	doc.setFontSize(8);
	doc.setTextColor(120);
	doc.text(`Printed at: ${new Date().toLocaleString()}`, 10, doc.internal.pageSize.height - 10);

	doc.save(filename);
}


export async function fetchExcelExport(
	logs: any[], 
	title: string, 
	company?: any 
) {
	const filename = `${title}.pdf`;
	await exportToPDF(logs, filename, title, company);
}

