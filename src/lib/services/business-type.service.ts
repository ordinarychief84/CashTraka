/**
 * Business-type service — thin re-export of the existing `business-type` lib
 * so new code can follow the `services/*` convention, while old callers
 * continue working via `@/lib/business-type`.
 */
export * from '@/lib/business-type';
