import { PRIME_FAILURE_RULES } from './generated/prime.generated';

export { PRIME_FAILURE_RULES };
export type PrimeFailureRule = (typeof PRIME_FAILURE_RULES)[number];

export function findFailureRule(failureReason: string): PrimeFailureRule | null {
  return PRIME_FAILURE_RULES.find((rule) => rule.FailureReason === failureReason) ?? null;
}

export function requiresTechnicalValidation(rule: PrimeFailureRule | null): boolean {
  return rule?.RuleStatus === 'Draft - technical validation required';
}
