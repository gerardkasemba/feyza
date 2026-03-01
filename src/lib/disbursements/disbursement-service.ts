/**
 * Disbursement service — status change logging and helpers.
 * Used by agent disbursement API and any code that needs to record or react to
 * disbursement status changes.
 */

import { logger } from '@/lib/logger';

const log = logger('disbursement-service');

export type DisbursementStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface LogDisbursementStatusChangeParams {
  disbursementId: string;
  loanId?: string;
  oldStatus: DisbursementStatus | string;
  newStatus: DisbursementStatus | string;
  details?: string;
  dwollaTransferId?: string;
}

/**
 * Log a disbursement status change. Use this when updating disbursement/transfer
 * status so that audits and agent dashboards can reflect the change.
 * (DB persistence can be added here if disbursement_history is re-introduced.)
 */
export async function logDisbursementStatusChange(
  params: LogDisbursementStatusChangeParams
): Promise<void> {
  const { disbursementId, loanId, oldStatus, newStatus, details, dwollaTransferId } = params;
  log.info('Disbursement status change', {
    disbursementId,
    loanId,
    oldStatus,
    newStatus,
    ...(details && { details }),
    ...(dwollaTransferId && { dwollaTransferId }),
  });
}

// ─── Pickup (cash pickup) fields ─────────────────────────────────────────────

export interface PickupFieldsInput {
  pickerFullName?: string | null;
  recipientName?: string | null;
  cashPickupLocation?: string | null;
  pickerPhone?: string | null;
  pickerIdType?: string | null;
  pickerIdNumber?: string | null;
  pickup_person_name?: string | null;
  pickup_person_location?: string | null;
  pickup_person_phone?: string | null;
  pickup_person_id_type?: string | null;
  pickup_person_id_number?: string | null;
  cash_pickup_location?: string | null;
  picker_full_name?: string | null;
  picker_phone?: string | null;
  picker_id_type?: string | null;
  picker_id_number?: string | null;
}

export interface PreparedPickupFields {
  cash_pickup_location?: string | null;
  picker_full_name?: string | null;
  picker_id_type?: string | null;
  picker_id_number?: string | null;
  picker_phone?: string | null;
  pickup_person_name?: string | null;
  pickup_person_location?: string | null;
  pickup_person_phone?: string | null;
  pickup_person_id_type?: string | null;
  pickup_person_id_number?: string | null;
}

/**
 * Normalize cash-pickup / recipient fields from form or API input into the shape
 * used by the loans table and disbursement flows.
 */
export function preparePickupFields(input: PickupFieldsInput): PreparedPickupFields {
  const name =
    input.pickerFullName ??
    input.recipientName ??
    input.picker_full_name ??
    input.pickup_person_name ??
    null;
  const location =
    input.cashPickupLocation ??
    input.cash_pickup_location ??
    input.pickup_person_location ??
    null;
  const phone =
    input.pickerPhone ?? input.picker_phone ?? input.pickup_person_phone ?? null;
  const idType =
    input.pickerIdType ?? input.picker_id_type ?? input.pickup_person_id_type ?? null;
  const idNumber =
    input.pickerIdNumber ?? input.picker_id_number ?? input.pickup_person_id_number ?? null;

  return {
    cash_pickup_location: location,
    picker_full_name: name,
    picker_id_type: idType,
    picker_id_number: idNumber,
    picker_phone: phone,
    pickup_person_name: name,
    pickup_person_location: location,
    pickup_person_phone: phone,
    pickup_person_id_type: idType,
    pickup_person_id_number: idNumber,
  };
}

// ─── Disbursement created logging ───────────────────────────────────────────

export interface LogDisbursementCreatedParams {
  disbursementId?: string;
  loanId: string;
  amount: number;
  method?: string;
  currency?: string;
  dwollaTransferId?: string;
}

/**
 * Log when a new disbursement is created (for audit and agent dashboards).
 */
export async function logDisbursementCreated(
  params: LogDisbursementCreatedParams
): Promise<void> {
  log.info('Disbursement created', {
    ...params,
  });
}
