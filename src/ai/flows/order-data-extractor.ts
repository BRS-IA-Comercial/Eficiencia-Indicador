
'use server';
/**
 * @fileOverview Este arquivo implementa um fluxo de IA para extrair e categorizar dados de pedidos de documentos PDF.
 *
 * - extractOrderData - Uma função que gerencia o processo de extração de dados de pedidos.
 * - OrderDataExtractorInput - O tipo de entrada para a função extractOrderData.
 * - OrderDataExtractorOutput - O tipo de retorno para a função extractOrderData.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OrderDataExtractorInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "O conteúdo de um documento PDF, fornecido como uma data URI que deve incluir o tipo MIME (ex: 'application/pdf') e usar codificação Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type OrderDataExtractorInput = z.infer<typeof OrderDataExtractorInputSchema>;

const OrderLineItemSchema = z.object({
  productName: z.string().describe('O nome do produto pedido.'),
  quantity: z.number().int().positive().describe('A quantidade do produto pedido.'),
  unitPrice: z.number().positive().describe('O preço unitário do produto.'),
});

const OrderDataExtractorOutputSchema = z.object({
  orderId: z.string().describe('O identificador único para o pedido.'),
  customerName: z.string().describe('O nome completo do cliente.'),
  customerEmail: z.string().email().optional().describe('O endereço de e-mail do cliente.'),
  customerAddress: z.string().describe('O endereço de entrega ou cobrança do cliente.'),
  orderDate: z.string().datetime().describe('A data em que o pedido foi feito (formato ISO 8601).'),
  items: z.array(OrderLineItemSchema).describe('Uma lista de itens incluídos no pedido.'),
  totalAmount: z.number().positive().describe('O valor monetário total do pedido.'),
  currency: z.string().length(3).describe('A moeda do valor total (ex: "BRL", "USD").'),
  orderCategory: z.enum(['Varejo', 'Atacado', 'Serviço', 'Digital', 'Produto Físico', 'Outro']).describe('Uma categoria que descreve a natureza do pedido.'),
  paymentStatus: z.enum(['Paid', 'Pending', 'Failed', 'Refunded']).describe('O status de pagamento do pedido.'),
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
  prompt: `Você é um especialista em extração de dados estruturados de pedidos a partir de diversos tipos de documentos.
Sua tarefa é extrair com precisão todos os campos especificados do documento de entrada de pedido fornecido.
Se um campo não for encontrado, use um padrão razoável ou infira se possível, mas priorize a informação explícita.
O documento é fornecido como uma data URI de PDF codificada em Base64, que você deve interpretar como uma imagem para extração de dados.
Categorize o pedido com base em seu conteúdo em uma das seguintes categorias: 'Varejo', 'Atacado', 'Serviço', 'Digital', 'Produto Físico', 'Outro'.
Responda sempre em Português do Brasil para nomes de produtos e categorias.

Documento do Pedido: {{media url=pdfDataUri}}
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
