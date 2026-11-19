const queries = require("../database/queries");
const crypto = require("crypto");
const { httpError, wrap, posInt, idParam, getStudentId, getOwnedEvent } = require("./shared");

async function demoPay(req, res) {
  const registrationId = posInt((req.body || {}).registration_id, "registration_id is required");
  const studentId = await getStudentId(req.user.user_id);

  await queries.withTransaction(async conn => {
    const reg = await queries.lockRegistrationForPayment(conn, registrationId);
    if (!reg) throw httpError(404, "Registration not found");
    if (reg.student_id !== studentId) throw httpError(403, "This is not your registration");
    if (reg.status === "cancelled") throw httpError(409, "This registration was cancelled");
    if (Number(reg.registration_fee) === 0) throw httpError(400, "This event is free; no payment is needed");
    if (reg.paid) throw httpError(409, "This registration is already paid");

    const transactionRef = "DEMO-" + crypto.randomBytes(8).toString("hex").toUpperCase();
    const pendingPayment = await queries.lockPendingPayment(conn, registrationId);
    if (pendingPayment) {
      await queries.completeDemoPayment(conn, pendingPayment.payment_id, reg.registration_fee, transactionRef);
    } else {
      await queries.insertDemoPayment(conn, registrationId, reg.registration_fee, transactionRef);
    }
    await queries.confirmRegistration(conn, registrationId);
  });
  res.status(201).json({ message: "Demo payment recorded. Your registration is confirmed." });
}

async function listPayments(req, res) {
  const payments = await queries.listOrganizerPayments(req.user.user_id);
  const summary = await queries.readOrganizerPaymentSummary(req.user.user_id);
  res.json({ payments, summary: summary || { collected: 0, pending: 0, transaction_count: 0 } });
}

async function markReceived(req, res) {
  const paymentId = idParam(req);
  await queries.withTransaction(async conn => {
    const payment = await queries.lockPayment(conn, paymentId);
    if (!payment) throw httpError(404, "Payment not found");
    await getOwnedEvent(payment.event_id, req.user.user_id, conn);
    if (payment.payment_status !== "pending" || payment.registration_status !== "pending")
      throw httpError(409, "Only pending payments can be marked received");
    await queries.recordCashPayment(conn, paymentId, "CASH-" + crypto.randomBytes(6).toString("hex").toUpperCase());
    await queries.confirmRegistration(conn, payment.registration_id);
  });
  res.json({ message: "Payment recorded and registration confirmed" });
}

module.exports = wrap({ demoPay, listPayments, markReceived });
