'use server';
/**
 * @fileOverview Generates an invoice for a selected debtor using AI.
 *
 * - generateInvoice - A function that handles the invoice generation process.
 * - GenerateInvoiceInput - The input type for the generateInvoice function.
 * - GenerateInvoiceOutput - The return type for the generateInvoice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInvoiceInputSchema = z.object({
  debtorName: z.string().describe('The name of the debtor.'),
  debtAmount: z.number().describe('The total debt amount of the debtor.'),
  creditorName: z.string().describe('The name of the person or entity issuing the invoice (the creditor).'),
});
export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceInputSchema>;

const GenerateInvoiceOutputSchema = z.object({
  invoiceNumber: z.string().describe('A unique invoice number, e.g., INV-001.'),
  issueDate: z.string().describe('The date the invoice was issued, in YYYY-MM-DD format.'),
  dueDate: z.string().describe('The date the payment is due, in YYYY-MM-DD format.'),
  notes: z.string().describe('A brief, friendly note for the debtor regarding the payment.'),
});
export type GenerateInvoiceOutput = z.infer<typeof GenerateInvoiceOutputSchema>;

export async function generateInvoice(
  input: GenerateInvoiceInput
): Promise<GenerateInvoiceOutput> {
  return generateInvoiceFlow(input);
}

const generateInvoicePrompt = ai.definePrompt({
  name: 'generateInvoicePrompt',
  input: {schema: GenerateInvoiceInputSchema},
  output: {schema: GenerateInvoiceOutputSchema},
  prompt: `You are an accounting assistant. Your task is to generate a simple invoice based on the provided details.

Creditor Name: {{{creditorName}}}
Debtor Name: {{{debtorName}}}
Debt Amount: {{{debtAmount}}}

Generate the following invoice details:
- A unique invoice number (e.g., INV-XXXX where XXXX is a random 4-digit number).
- The issue date (today's date).
- The due date (14 days from today's date).
- A short, professional, and friendly note in Arabic for the debtor, reminding them of the payment.

Current Date: ${new Date().toISOString().split('T')[0]}
`,
});

const generateInvoiceFlow = ai.defineFlow(
  {
    name: 'generateInvoiceFlow',
    inputSchema: GenerateInvoiceInputSchema,
    outputSchema: GenerateInvoiceOutputSchema,
  },
  async input => {
    const {output} = await generateInvoicePrompt(input);
    return output!;
  }
);
