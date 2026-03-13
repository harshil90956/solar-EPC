import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  async generateQuotationPdf(data: any): Promise<Buffer> {
    try {
      const templatePath = path.join(process.cwd(), 'templates', 'quotation-template.html');
      const templateHtml = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(templateHtml);
      const html = template(data);

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw new InternalServerErrorException('Failed to generate PDF');
    }
  }
}
