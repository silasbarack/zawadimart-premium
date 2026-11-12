// Turns payment failures into plain words for shoppers: what happened, and what to do next.
// Codes are M-Pesa STK ResultCodes, or our own names for failures that don't come from one.

const MPESA = {
  1: {
    title: 'Not enough money in M-Pesa',
    detail: 'Your M-Pesa balance (including any Fuliza limit) was too low for this payment.',
    action: 'Top up your M-Pesa account, then send the prompt again.',
  },
  1001: {
    title: 'Another M-Pesa payment was in progress',
    detail: 'Your phone was busy with another M-Pesa transaction, so this prompt could not be completed.',
    action: 'Wait a minute for the other transaction to finish, then send the prompt again.',
  },
  1019: {
    title: 'The M-Pesa prompt expired',
    detail: 'The prompt timed out before the payment was completed.',
    action: 'Send the prompt again and enter your PIN as soon as it appears.',
  },
  1025: {
    title: 'M-Pesa could not send the prompt',
    detail: 'Safaricom had a problem sending the payment prompt to your phone.',
    action: 'Try again in a moment.',
  },
  1032: {
    title: 'You cancelled the payment',
    detail: 'The M-Pesa prompt was cancelled on your phone, so no money was taken.',
    action: 'Send the prompt again when you are ready to pay.',
  },
  1037: {
    title: 'Your phone could not be reached',
    detail: 'The prompt did not get a reply. Your phone may have been off, out of network, or the prompt was not answered in time.',
    action: 'Make sure your phone is on and has network, then send the prompt again.',
  },
  2001: {
    title: 'Wrong M-Pesa PIN',
    detail: 'The M-Pesa PIN entered was incorrect, so no money was taken.',
    action: 'Send the prompt again and enter your correct PIN.',
  },
  9999: {
    title: 'M-Pesa could not send the prompt',
    detail: 'Safaricom had a problem sending the payment prompt to your phone.',
    action: 'Try again in a moment.',
  },
};

const OTHER = {
  invalid_phone: {
    title: 'That number cannot receive M-Pesa prompts',
    detail: 'M-Pesa did not accept the phone number for this payment.',
    action: 'Check that it is a Safaricom M-Pesa number, then try again.',
  },
  initiation: {
    title: 'The payment could not be started',
    detail: 'We could not reach the payment service to start your payment.',
    action: 'Please try again in a moment.',
  },
  expired: {
    title: 'Payment was not completed in time',
    detail: 'No payment was received within the payment window, so the order was cancelled and its items returned to stock.',
    action: 'You are welcome to place the order again.',
  },
  underpaid: {
    title: 'Part payment received',
    detail: 'The amount received is less than the order total.',
    action: 'Our team will contact you to sort this out. Please keep your M-Pesa message.',
  },
  card_abandoned: {
    title: 'The card payment was not finished',
    detail: 'The secure card page was closed before the payment was completed, so nothing was charged.',
    action: 'Try the card payment again, or pay with M-Pesa instead.',
  },
  card_declined: {
    title: 'Your card payment was declined',
    detail: 'Your bank or card provider declined the payment.',
    action: 'Try another card, or pay with M-Pesa instead.',
  },
};

const FALLBACK = {
  title: 'Payment not completed',
  detail: 'Your payment did not go through.',
  action: 'Please try again, or choose another payment method.',
};

// Our code for a failure the payment service reported when we tried to start a payment.
export function initiationFailureCode(message = '') {
  return /phone/i.test(message) ? 'invalid_phone' : 'initiation';
}

// { code, title, detail, action } for a failed payment. providerText is the gateway's own
// message, used for the detail when we don't recognise the code.
export function describeFailure(code, providerText) {
  const known = MPESA[Number(code)] ?? OTHER[code];
  if (known) return { code: String(code), ...known };
  const detail = providerText && !/^payment failed$/i.test(providerText) ? `${providerText.replace(/\.$/, '')}.` : FALLBACK.detail;
  return { code: code ? String(code) : null, title: FALLBACK.title, detail, action: FALLBACK.action };
}
