import { z } from 'zod';

export const runStatusSchema = z.enum(['queued', 'investigating', 'verifying', 'bug_confirmed', 'not_reproduced', 'inconclusive', 'cancelled', 'error']);
export type RunStatus = z.infer<typeof runStatusSchema>;
export const createRunSchema = z.object({
  targetUrl: z.string().url().max(2048), complaint: z.string().trim().min(10).max(8000),
  expected: z.string().trim().min(5).max(4000), oracleKind: z.literal('cart_preserved_after_checkout_change'),
}).strict();
export type CreateRun = z.infer<typeof createRunSchema>;
export const locatorSpecSchema = z.object({
  role: z.enum(['button', 'link', 'textbox', 'combobox', 'checkbox']), name: z.string().min(1).max(500),
  exact: z.literal(true), scope: z.object({ role: z.enum(['region', 'dialog', 'listitem']), name: z.string().min(1) }).optional(),
}).strict();
export type LocatorSpec = z.infer<typeof locatorSpecSchema>;
const base = { id: z.string().min(1).max(100) };
export const reproStepSchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('goto'), path: z.string().regex(/^\/(?!\/)/) }).strict(),
  z.object({ ...base, kind: z.literal('click'), locator: locatorSpecSchema }).strict(),
  z.object({ ...base, kind: z.literal('fill'), locator: locatorSpecSchema, value: z.string().max(2000) }).strict(),
  z.object({ ...base, kind: z.literal('select'), locator: locatorSpecSchema, value: z.string().max(500) }).strict(),
  z.object({ ...base, kind: z.literal('check'), locator: locatorSpecSchema, checked: z.boolean() }).strict(),
]);
export type ReproStep = z.infer<typeof reproStepSchema>;
export const reproductionSchema = z.object({
  version: z.literal(1), complaint: z.string(), expected: z.string(), observed: z.string(),
  steps: z.array(reproStepSchema).min(2).max(40),
  oracle: z.object({ kind: z.literal('cart_preserved_after_checkout_change'), captureAfterStepId: z.string(), compareAfterStepId: z.string() }).strict(),
}).strict();
export type Reproduction = z.infer<typeof reproductionSchema>;
export const runEventSchema = z.object({
  id: z.number().int().positive(), runId: z.string(), at: z.string().datetime(),
  type: z.enum(['status', 'hypothesis', 'action', 'observation', 'tool_error', 'verification', 'artifact', 'completed']),
  message: z.string(), status: runStatusSchema.optional(), screenshotUrl: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type RunEvent = z.infer<typeof runEventSchema>;
export const artifactSchema = z.object({
  kind: z.enum(['test', 'report', 'reproduction', 'video', 'screenshot', 'verification']),
  name: z.string(), url: z.string(), mimeType: z.string(),
});
export type Artifact = z.infer<typeof artifactSchema>;
export const verificationSummarySchema = z.object({
  attempts: z.number().int().nonnegative(), matchedFailures: z.number().int().nonnegative(),
  verdict: z.enum(['confirmed', 'not_matched', 'inconclusive']),
});
export const runViewSchema = z.object({
  id: z.string(), status: runStatusSchema, input: createRunSchema,
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
  events: z.array(runEventSchema), artifacts: z.array(artifactSchema), verification: verificationSummarySchema.optional(),
  metrics: z.object({ actions: z.number().int().nonnegative(), elapsedMs: z.number().nonnegative(), inputTokens: z.number().optional(), outputTokens: z.number().optional(), costUsd: z.number().optional() }),
});
export type RunView = z.infer<typeof runViewSchema>;

// Internal, trusted browser state. These fields are never supplied by the model.
export type ActionSemantic = 'navigation' | 'cart-add' | 'cart-remove' | 'cart-clear' | 'checkout-edit' | 'checkout-save' | 'checkout-submit' | 'unknown';
export interface CartItem { productId: string; quantity: number }
export interface ShopState { cart: CartItem[]; address: string; saveSeq: number; saved: boolean; busy: boolean }
export interface BrowserObservation {
  snapshotId: number; episodeId: string; url: string; text: string;
  elements: Array<{ ref: string; locator: LocatorSpec; value?: string; options?: Array<{ label: string; value: string }> }>;
  state: ShopState; screenshotName: string;
}
export interface ActionRecord { episodeId: string; step: ReproStep; semantic: ActionSemantic; before?: ShopState; after: ShopState }
export interface CartCheckpoint { id: string; episodeId: string; afterStepId: string; state: ShopState }
export interface Candidate { episodeId: string; checkpointId: string; endStepId: string; observed: string }
export interface VerificationAttempt {
  attempt: number; classification: 'matched_failure' | 'passed' | 'inconclusive';
  stage: string; errorType?: string; error?: string; initialCart?: CartItem[]; actualCart?: CartItem[];
  videoName?: string; evidence?: Record<string, unknown>; exitCode: number | null;
}
export interface VerificationResult {
  attempts: VerificationAttempt[]; matchedFailures: number; verdict: 'confirmed' | 'not_matched' | 'inconclusive';
}
export const terminalStatuses: RunStatus[] = ['bug_confirmed', 'not_reproduced', 'inconclusive', 'cancelled', 'error'];
