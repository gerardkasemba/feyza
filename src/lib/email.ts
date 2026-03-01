// email.ts — barrel file for backward compatibility
// All email templates are split into focused category files:
//   email-core.ts          — sendEmail() + emailWrapper()
//   email-loan.ts          — loan request & acceptance emails
//   email-funds.ts         — disbursement emails
//   email-payments.ts      — payment received & missed emails
//   email-invites.ts       — loan invite, cancelled, payment reminder
//   email-confirmations.ts — payment confirmation & loan accepted
//   email-overdue.ts       — overdue, missed payment lender, cash pickup
//   email-dashboard.ts     — dashboard access, auto-pay, match notifications
//   email-verification.ts  — identity & business verification emails

export { sendEmail, emailWrapper } from './email-core';
export { getLoanRequestSubmittedEmail, getNewLoanRequestForLenderEmail, getNoMatchFoundEmail, getLoanAcceptedBorrowerEmail, getLoanAcceptedLenderEmail } from './email-loan';
export { getFundsOnTheWayEmail, getFundsArrivedEmail, getDisbursementFailedEmail } from './email-funds';
export { getPaymentReceivedLenderEmail, getMissedPaymentEmail, getBusinessApprovedEmail, getBusinessRejectedEmail } from './email-payments';
export { getLoanCancelledEmail, getLoanInviteEmail, getPaymentReminderEmail } from './email-invites';
export { getPaymentConfirmationEmail, getLoanAcceptedEmail } from './email-confirmations';
export { getOverduePaymentEmail, getMissedPaymentLenderNotification, getCashPickupReminderEmail } from './email-overdue';
export { getDashboardAccessEmail, getAutoPayReminderEmail, getNewMatchForLenderEmail, getPaymentProcessedEmail, getPaymentReceivedEmail, getPaymentConfirmationNeededEmail, getAccessLoansEmail, getLoanRematchedEmail, getNoLendersAvailableEmail, getAutoChargeWarningEmail, getGuestLenderAcceptedEmail, getBusinessLoanRequestEmail, getEarlyPaymentLenderEmail, getPaymentProcessedBorrowerEmail, getPaymentReceivedGuestLenderEmail } from './email-dashboard';
export { getVerificationApprovedEmail, getVerificationRejectedEmail, getBusinessVerificationApprovedEmail, getBusinessVerificationRejectedEmail, getReverificationReminderEmail } from './email-verification';
