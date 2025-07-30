'use server';
/**
 * @fileOverview Suggests a payment plan for a selected debtor based on the debt amount and an average income ratio.
 *
 * - suggestPaymentPlan - A function that handles the payment plan suggestion process.
 * - SuggestPaymentPlanInput - The input type for the suggestPaymentPlan function.
 * - SuggestPaymentPlanOutput - The return type for the suggestPaymentPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPaymentPlanInputSchema = z.object({
  debtorName: z.string().describe('The name of the debtor.'),
  debtAmount: z.number().describe('The total debt amount of the debtor.'),
  averageIncomeRatio: z
    .number()
    .default(0.1)
    .describe(
      'The average income ratio that the debtor can allocate to debt payment (e.g., 0.1 for 10%).'
    ),
});
export type SuggestPaymentPlanInput = z.infer<typeof SuggestPaymentPlanInputSchema>;

const SuggestPaymentPlanOutputSchema = z.object({
  suggestedPaymentAmount: z
    .number()
    .describe('The suggested payment amount for the debtor.'),
  paymentDurationInMonths: z
    .number()
    .describe('The estimated payment duration in months.'),
  reasoning: z.string().describe('Explanation of how the payment plan was derived'),
});
export type SuggestPaymentPlanOutput = z.infer<typeof SuggestPaymentPlanOutputSchema>;

export async function suggestPaymentPlan(
  input: SuggestPaymentPlanInput
): Promise<SuggestPaymentPlanOutput> {
  return suggestPaymentPlanFlow(input);
}

const suggestPaymentPlanPrompt = ai.definePrompt({
  name: 'suggestPaymentPlanPrompt',
  input: {schema: SuggestPaymentPlanInputSchema},
  output: {schema: SuggestPaymentPlanOutputSchema},
  prompt: `You are a financial advisor specializing in debt management. Given the debtor's name,
 debt amount, and the average income ratio they can allocate to debt payment, suggest a payment plan.

Debtor Name: {{{debtorName}}}
Debt Amount: {{{debtAmount}}}
Average Income Ratio: {{{averageIncomeRatio}}}

Calculate a reasonable payment amount and estimate the payment duration in months. Provide a brief
reasoning for your suggestion.

Considerations:
- Aim for a payment plan that is realistic and sustainable for the debtor.
- Take into account the average income ratio to ensure the payment amount is affordable.
- Provide a clear and concise explanation of your suggestion.

Based on this information, suggest a payment plan with the following details:
Suggested Payment Amount:
Payment Duration in Months:
Reasoning: `,
});

const suggestPaymentPlanFlow = ai.defineFlow(
  {
    name: 'suggestPaymentPlanFlow',
    inputSchema: SuggestPaymentPlanInputSchema,
    outputSchema: SuggestPaymentPlanOutputSchema,
  },
  async input => {
    // Note: This flow is now a placeholder as Server Actions are disabled for static export.
    // In a real application, you would replace this with a call to a backend service.
    
    if (input.debtAmount <= 0) {
        return {
            suggestedPaymentAmount: 0,
            paymentDurationInMonths: 0,
            reasoning: "لا يوجد دين للسداد."
        };
    }

    const ratio = input.averageIncomeRatio > 0 ? input.averageIncomeRatio : 0.1;
    const suggestedPayment = input.debtAmount * ratio;
    const duration = Math.ceil(input.debtAmount / suggestedPayment);

    return {
        suggestedPaymentAmount: Math.round(suggestedPayment * 100) / 100,
        paymentDurationInMonths: duration,
        reasoning: `بناءً على تخصيص ${ratio * 100}% من الدين كدفعة، تم اقتراح هذا المبلغ لتحقيق التوازن بين السداد السريع والقدرة على تحمل التكاليف.`
    };
  }
);
