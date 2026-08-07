import { PRIME_CATALOGS, PRIME_EXAMPLE_ROWS } from './generated/prime.generated';
import { PrimeFieldName } from './schema';

export type PrimeGeneratedRow = (typeof PRIME_EXAMPLE_ROWS)[number];
export type PrimeRowValue = string | number | null;
export type PrimeRowRecord = Record<PrimeFieldName, PrimeRowValue>;
export type CurrentStatus = (typeof PRIME_CATALOGS.CurrentStatus)[number];
export type ConditionClass = (typeof PRIME_CATALOGS.ConditionClass)[number];
export type DetectionSource = (typeof PRIME_CATALOGS.DetectionSource)[number];
export type DiagnosisStatus = (typeof PRIME_CATALOGS.DiagnosisStatus)[number];
export type ResponsibleGroup = (typeof PRIME_CATALOGS.ResponsibleGroup)[number];
export type STTReadiness = (typeof PRIME_CATALOGS.STTReadiness)[number];
export type PlannedAction = (typeof PRIME_CATALOGS.PlannedAction)[number];
export type WorkStatus = (typeof PRIME_CATALOGS.WorkStatus)[number];
export type ResolutionOutcome = (typeof PRIME_CATALOGS.ResolutionOutcome)[number];
