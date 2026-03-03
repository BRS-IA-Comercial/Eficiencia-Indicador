'use server';
/**
 * @fileOverview This file implements an AI flow for extracting and categorizing order data from PDF documents.
 *
 * - extractOrderData - A function that handles the extraction of order data.
 * - OrderDataExtractorInput - The input type for the extractOrderData function.
 * - OrderDataExtractorOutput - The return type for the extractOrderData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OrderDataExtractorInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF document content, provided as a data URI that must include a MIME type (e.g., 'application/pdf') and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type OrderDataExtractorInput = z.infer<typeof OrderDataExtractorInputSchema>;

const OrderLineItemSchema = z.object({
  productName: z.string().describe('The name of the ordered product.'),
  quantity: z.number().int().positive().describe('The quantity of the product ordered.'),
  unitPrice: z.number().positive().describe('The unit price of the product.'),
});

const OrderDataExtractorOutputSchema = z.object({
  orderId: z.string().describe('The unique identifier for the order.'),
  customerName: z.string().describe('The full name of the customer.'),
  customerEmail: z.string().email().optional().describe('The email address of the customer.'),
  customerAddress: z.string().describe('The shipping or billing address of the customer.'),
  orderDate: z.string().datetime().describe('The date the order was placed (ISO 8601 format).'),
  items: z.array(OrderLineItemSchema).describe('A list of items included in the order.'),
  totalAmount: z.number().positive().describe('The total monetary amount of the order.'),
  currency: z.string().length(3).describe('The currency of the total amount (e.g., "USD", "BRL").'),
  orderCategory: z.enum(['Retail', 'Wholesale', 'Service', 'Digital', 'Physical Product', 'Other']).describe('A category describing the nature of the order.'),
  paymentStatus: z.enum(['Paid', 'Pending', 'Failed', 'Refunded']).describe('The payment status of the order.'),
});
export type OrderDataExtractorOutput = z.infer<typeof OrderDataExtractorOutputSchema>;

export async function extractOrderData(
  input: OrderDataExtractorInput
): Promise<OrderDataExtractorOutput> {
  return orderDataExtractorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'orderDataExtractorPrompt',
  input: { schema: OrderDataExtractorInputSchema },
  output: { schema: OrderDataExtractorOutputSchema },
  prompt: `You are an expert in extracting structured order data from various document types.
Your task is to accurately extract all specified fields from the provided order intake document.
If a field is not found, use a reasonable default or infer if possible, but prioritize explicit information.
The document is provided as a Base64 encoded PDF data URI, which you should interpret as an image for data extraction.
Categorize the order based on its contents into one of the following: 'Retail', 'Wholesale', 'Service', 'Digital', 'Physical Product', 'Other'.

Order Document: {{media url=pdfDataUri}}
`,
});

const orderDataExtractorFlow = ai.defineFlow(
  {
    name: 'orderDataExtractorFlow',
    inputSchema: OrderDataExtractorInputSchema,
    outputSchema: OrderDataExtractorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
