// utils/InvoicePDF.ts
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// Corporate Company Details
const COMPANY_DETAILS = {
    name: 'Sparklers Infotech Pvt. Ltd.',
    address: 'Indira Nagar, Nashik, Maharashtra, India - 422009',
    email: 'support@sparklersinfotech.com',
    phone: '+91 98765 43210'
};

// Plan Description Mapper based on package_id
const getPlanDescription = (payment: any) => {
    const packageId = Number(payment.package_id);
    const title = payment.package_title ? payment.package_title.toLowerCase() : '';

    if (packageId === 10 || title.includes('starter')) {
        return 'Entry-level AI image generation - Weekly 2 Images';
    } else if (packageId === 8 || title.includes('ultimate')) {
        return 'Ultimate AI image generation - Daily 5 images';
    } else if (title.includes('pro') || title.includes('premium')) {
        return 'Professional AI image generation with advanced tools';
    }
    return `Premium Digital Services for ${payment.package_title || 'AI Subscription'}`;
};

const formatDateForInvoice = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

export const generateInvoicePDF = async (payment: any) => {
    try {
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Design Palette (RGB)
        const brandColor = [79, 70, 229];
        const darkSlate = [15, 23, 42];
        const borderGray = [226, 232, 240];
        const textMuted = [100, 116, 139];

        // Build PDF Content
        const paymentDate = payment.created_at ? new Date(payment.created_at) : new Date();
        const day = String(paymentDate.getDate()).padStart(2, '0');
        const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
        const year = paymentDate.getFullYear();
        const formattedPaymentDate = `${day}${month}${year}`;

        const invoiceNo = payment.invoice_no || `INV-${formattedPaymentDate}`;

        // 1. HEADER - COMPANY DETAILS & PAID BADGE
        doc.setFontSize(15.5);
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(COMPANY_DETAILS.name, 54, 21);

        doc.setFontSize(8.5);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.setFont('helvetica', 'normal');
        doc.text(COMPANY_DETAILS.address, 54, 26);
        doc.text(`Email: ${COMPANY_DETAILS.email}  |  Phone: ${COMPANY_DETAILS.phone}`, 54, 31);

        // PAID RECEIPT Badge (Top Right)
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(pageWidth - 46, 16, 32, 8, 1.5, 1.5, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(21, 128, 61);
        doc.text('PAID RECEIPT', pageWidth - 30, 21.5, { align: 'center' });

        // Horizontal Separator Line
        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.setLineWidth(0.4);
        doc.line(14, 40, pageWidth - 14, 40);

        // 2. META DATA (BILLED TO & INVOICE DETAILS)
        // Left: User Info
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text('BILLED TO:', 14, 50);

        doc.setFontSize(11);
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        doc.text(payment.user_name || 'Customer', 14, 56);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text(payment.user_email || 'customer@email.com', 14, 61);

        // Right: Invoice Metadata
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        doc.text('Invoice Details', pageWidth - 80, 50);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);

        doc.text('Invoice No:', pageWidth - 80, 56);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        doc.text(invoiceNo, pageWidth - 42, 56);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text('Billing Date:', pageWidth - 80, 61);
        doc.text(formatDateForInvoice(payment.created_at), pageWidth - 42, 61);

        // 3. MAIN BILLING TABLE
        const planDescription = getPlanDescription(payment);
        const finalAmount = parseFloat(payment.amount) || 0;

        const platformCount = payment.social_media_addons && payment.social_media_addons.length > 0
            ? payment.social_media_addons.length
            : 2;

        const basePricePerPlatform = 499;
        const monthlyTotalAllPlatforms = basePricePerPlatform * platformCount;
        const isAnnual = payment.duration_type === 'year' || finalAmount > 5000;

        const tableHeaders = [['Billing Parameter', 'Transaction Value / Details']];
        const tableRows = [
            ['Subscription Package', `${payment.package_title || 'AI Plan'} (${payment.duration_type || (isAnnual ? 'year' : 'month')})`],
            ['Plan Description', planDescription],
            ['Razorpay Sub ID', payment.razorpay_subscription_id || 'N/A'],
            ['Transaction / Payment ID', payment.payment_id || 'N/A'],
            ['Payment Status', 'Payment Successful / Settled']
        ];

        if (payment.social_media_addons && payment.social_media_addons.length > 0) {
            const platformsList = payment.social_media_addons.map((a: any) => a.platform).join(', ');
            tableRows.push(['Selected Platforms', `${platformCount} Platforms (${platformsList})`]);
        } else {
            tableRows.push(['Selected Platforms', '2 Platforms (Google My Business, Instagram)']);
        }

        tableRows.push(['Service Period', `${formatDateForInvoice(payment.start_date)} to ${formatDateForInvoice(payment.end_date)}`]);

        autoTable(doc, {
            startY: 70,
            head: tableHeaders,
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: 4.5
            },
            bodyStyles: {
                fontSize: 9.5,
                textColor: [51, 65, 85],
                halign: 'left',
                cellPadding: 4.5
            },
            columnStyles: {
                0: { cellWidth: 55, fontStyle: 'bold', textColor: [15, 23, 42] },
                1: { cellWidth: 'auto' }
            },
            styles: {
                lineColor: borderGray,
                lineWidth: 0.3
            },
            margin: { left: 14, right: 14 }
        });

        // 4. CALCULATION & TOTAL BOX
        let currentY = doc.lastAutoTable.finalY + 8;

        const calcXLabel = pageWidth - 90;
        const calcXValue = pageWidth - 16;

        doc.setFontSize(9.5);
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

        doc.setFont('helvetica', 'normal');
        doc.text(`Social Media Platforms (${platformCount} x Rs. ${basePricePerPlatform})`, calcXLabel, currentY);
        doc.text(`Rs. ${monthlyTotalAllPlatforms.toFixed(2)}`, calcXValue, currentY, { align: 'right' });

        if (isAnnual) {
            currentY += 5.5;
            const annualSubtotal = monthlyTotalAllPlatforms * 12;
            const discount = Math.round(annualSubtotal * 0.10);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
            doc.text('  x 12 months', calcXLabel, currentY);
            doc.text(`Rs. ${annualSubtotal.toFixed(2)}`, calcXValue, currentY, { align: 'right' });

            currentY += 5.5;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129);
            doc.text('Annual Discount (10%)', calcXLabel, currentY);
            doc.text(`- Rs. ${discount.toFixed(2)}`, calcXValue, currentY, { align: 'right' });
        }

        currentY += 4;
        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.setLineWidth(0.3);
        doc.line(calcXLabel, currentY, calcXValue, currentY);

        currentY += 4;
        doc.setFillColor(79, 70, 229);
        doc.roundedRect(calcXLabel, currentY, 76, 11, 1.2, 1.2, 'F');

        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Total Amount:', calcXLabel + 4, currentY + 7);
        doc.text(`Rs. ${finalAmount.toFixed(2)}`, calcXValue - 4, currentY + 7, { align: 'right' });

        // 5. TERMS & CONDITIONS BOX
        const termsBoxY = doc.lastAutoTable.finalY + 8;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.roundedRect(14, termsBoxY, 95, 28, 1.2, 1.2, 'FD');

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        doc.text('Terms & Important Notes:', 18, termsBoxY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.setFontSize(7.5);

        const termsText = [
            '1. Valid strictly for the specified service period.',
            '2. Prices include all applicable structural software taxes.',
            '3. Auto-renewals processed via integrated Razorpay instructions.'
        ];

        let termsY = termsBoxY + 11;
        termsText.forEach(line => {
            doc.text(line, 18, termsY);
            termsY += 4.5;
        });

        // 6. BOTTOM FOOTER
        const footerY = 268;

        doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.setLineWidth(0.4);
        doc.line(14, footerY, pageWidth - 14, footerY);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text('Thank you for choosing Sparklers Infotech!', pageWidth / 2, footerY + 6, { align: 'center' });

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);

        // ... तुमचा सर्व कोड जसाचा तसा (जोपर्यंत file save करत नाही तोपर्यंत) ...

// ... तुमचा सर्व कोड जसाचा तसा (जोपर्यंत file save करत नाही तोपर्यंत) ...

// Generate PDF and Save/Share
const fileTitle = `Invoice_${(payment.package_title || 'Plan').replace(/\s/g, '_')}_${formattedPaymentDate}.pdf`;

if (Platform.OS === 'web') {
    doc.save(fileTitle);
    return true;
}

try {
    // 1. पीडीएफ बेस-६४ मध्ये मिळवा
    const pdfBase64 = doc.output('datauristring');
    const base64Data = pdfBase64.split(',')[1];
    
    // 2. नवीन FileSystem API वापरा
    const { File, Paths } = await import('expo-file-system');
    const file = new File(Paths.cache, fileTitle);
    
    // 3. फाइल तयार करा (overwrite सह)
    file.create({ overwrite: true });
    
    // 4. बेस-६४ ला Uint8Array मध्ये बदला
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 5. फाइलमध्ये लिहा
    file.write(bytes);
    
    // 6. ✅ शेअर करा (Alert काढून टाकला कारण तोच error देत होता)
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        await Sharing.shareAsync(file.uri);
    } else {
        // ✅ फक्त console.log वापरा, Alert नाही
        console.log('File saved at:', file.uri);
    }
    
    return true;
} catch (error) {
    console.error('Error saving PDF:', error);
    // ✅ फक्त error throw करा, Alert नाही
    throw error;
}

    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
};