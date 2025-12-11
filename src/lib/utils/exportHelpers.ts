import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export a DOM element to PDF using html2canvas
 * @param element The DOM element to export
 * @param filename The filename for the PDF
 * @param title Optional title to display on top of PDF
 * @param company Optional company info to display on top
 */
export async function exportElementToPDF(
	element: HTMLElement,
	filename: string,
	title?: string,
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
	if (!element) throw new Error('No element provided for PDF export');

	// Use html2canvas to render element as canvas
	const canvas = await html2canvas(element, {
		scale: 2, // increase for better resolution
		useCORS: true // allow cross-origin images
	});

	const imgData = canvas.toDataURL('image/png');

	// PDF in landscape
	const pdf = new jsPDF({ orientation: 'landscape' });

	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();

	// Optionally add company header
	let yOffset = 10;
	if (company) {
		if (company.logoPath) {
			const img = new Image();
			img.src = company.logoPath;
			// Width 30, height 30
			pdf.addImage(img, 'PNG', 10, yOffset, 30, 30);
		}
		pdf.setFontSize(16);
		pdf.text(company.name || '', 50, yOffset + 10);
		pdf.setFontSize(10);
		pdf.text(`${company.address || ''}, ${company.country || ''}`, 50, yOffset + 15);
		pdf.text(`Email: ${company.email || ''} | Phone: ${company.phone || ''}`, 50, yOffset + 20);
		pdf.text(`Reg No: ${company.regNo || ''}`, 50, yOffset + 25);
		pdf.setLineWidth(0.5);
		pdf.line(10, yOffset + 30, pageWidth - 10, yOffset + 30);

		yOffset += 35;
	}

	// Optionally add title
	if (title) {
		pdf.setFontSize(12);
		pdf.text(title, 10, yOffset);
		yOffset += 10;
	}

	// Add the rendered element image to PDF
	const imgProps = pdf.getImageProperties(imgData);
	const pdfWidth = pageWidth - 20; // leave some margin
	const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

	pdf.addImage(imgData, 'PNG', 10, yOffset, pdfWidth, pdfHeight);

	// Footer with printed date
	pdf.setFontSize(8);
	pdf.setTextColor(120);
	pdf.text(`Printed at: ${new Date().toLocaleString()}`, 10, pageHeight - 10);

	// Save PDF
	pdf.save(filename);
}

/**
 * Legacy wrapper to keep similar interface
 */
export async function fetchExcelExport(element: HTMLElement, title: string, company?: any) {
	const filename = `${title}.pdf`;
	await exportElementToPDF(element, filename, title, company);
}
