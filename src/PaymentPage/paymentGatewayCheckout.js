import { apiFetch } from '../API/api';

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.detail || `Payment request failed (${response.status})`);
  return data;
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Razorpay checkout.'));
    document.body.appendChild(script);
  });
}

export async function startAppointmentCheckout(invoiceId, provider, onPaid) {
  const checkout = await readResponse(await apiFetch(`/billing/appointment-invoices/${encodeURIComponent(invoiceId)}/checkout`, {
    method: 'POST',
    body: JSON.stringify({ provider }),
  }));

  if (provider === 'RAZORPAY') {
    await loadRazorpay();
    return new Promise((resolve, reject) => {
      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Wellness Hospital',
        description: checkout.description,
        order_id: checkout.orderId,
        prefill: { name: checkout.name },
        handler: async (result) => {
          try {
            const invoice = await readResponse(await apiFetch(
              `/billing/appointment-invoices/${encodeURIComponent(invoiceId)}/verify`,
              {
                method: 'POST',
                body: JSON.stringify({
                  provider,
                  gatewayOrderId: result.razorpay_order_id,
                  gatewayPaymentId: result.razorpay_payment_id,
                  signature: result.razorpay_signature,
                }),
              },
            ));
            onPaid(invoice);
            resolve(invoice);
          } catch (error) {
            reject(error);
          }
        },
        modal: { ondismiss: () => resolve(null) },
      });
      razorpay.open();
    });
  }

  if (provider === 'STRIPE') {
    window.location.assign(checkout.checkoutUrl);
    return null;
  }

  if (provider === 'PAYU') {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = checkout.action;
    Object.entries(checkout.fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    return null;
  }

  throw new Error('Unsupported payment provider.');
}
