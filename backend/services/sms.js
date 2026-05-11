const twilio = require('twilio');

const ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER  = process.env.TWILIO_PHONE_NUMBER;

function isConfigured() {
  return !!(ACCOUNT_SID && AUTH_TOKEN && FROM_NUMBER);
}

function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  // Add +1 (Caribbean/US) if no country code
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

async function send(to, message) {
  const formatted = formatPhone(to);
  if (!formatted) return;

  if (!isConfigured()) {
    console.log(`[SMS - Mock] To: ${formatted}`);
    console.log(`[SMS - Mock] Message: ${message}`);
    return;
  }

  try {
    const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
    await client.messages.create({ from: FROM_NUMBER, to: formatted, body: message });
    console.log(`[SMS] Sent to ${formatted}`);
  } catch (err) {
    console.error(`[SMS] Failed to send to ${formatted}:`, err.message);
  }
}

// Sent when customer receives their ticket
async function sendTicketConfirmation({ phone, queueNumber, serviceType, estimatedWait, priorityLevel }) {
  if (!phone) return;
  const priority = priorityLevel !== 'regular' ? ' [PRIORITY]' : '';
  const service = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
  await send(phone,
    `Lightning Line${priority}\n` +
    `Your ticket: ${queueNumber}\n` +
    `Service: ${service}\n` +
    `Est. wait: ${estimatedWait} min\n` +
    `We'll text you when it's your turn.`
  );
}

// Sent when staff calls the customer's ticket
async function sendTicketCalled({ phone, queueNumber, counterId }) {
  if (!phone) return;
  await send(phone,
    `Lightning Line\n` +
    `Your number ${queueNumber} is being called!\n` +
    `Please proceed to Counter ${counterId}.`
  );
}

// Sent when a delay is reported that affects the customer
async function sendDelayNotification({ phone, queueNumber, delayMinutes, reason }) {
  if (!phone) return;
  await send(phone,
    `Lightning Line\n` +
    `Update for ticket ${queueNumber}:\n` +
    `There is a ${delayMinutes}-min delay (${reason}).\n` +
    `Your estimated wait has been updated.`
  );
}

module.exports = { sendTicketConfirmation, sendTicketCalled, sendDelayNotification };
