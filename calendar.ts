// Generate iCal (.ics) file for payment schedule

interface PaymentEvent {
  id: string;
  title: string;
  amount: number;
  currency: string;
  dueDate: string;
  lenderName?: string;
  description?: string;
}

export function generateICalFile(payments: PaymentEvent[], loanPurpose?: string): string {
  const now = new Date();
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const events = payments.map((payment) => {
    const dueDate = new Date(payment.dueDate);
    // Set reminder for 9 AM on due date
    dueDate.setHours(9, 0, 0, 0);
    
    const endDate = new Date(dueDate);
    endDate.setHours(10, 0, 0, 0);

    const description = [
      `Payment Amount: ${formatCurrency(payment.amount, payment.currency)}`,
      payment.lenderName ? `Pay to: ${payment.lenderName}` : '',
      payment.description || '',
      '',
      'Powered by Feyza - feyza.app',
    ].filter(Boolean).join('\\n');

    return `BEGIN:VEVENT
UID:${payment.id}@feyza.app
DTSTAMP:${formatDate(now)}
DTSTART:${formatDate(dueDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${escapeText(payment.title)}
DESCRIPTION:${escapeText(description)}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Payment due tomorrow: ${formatCurrency(payment.amount, payment.currency)}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT2H
ACTION:DISPLAY
DESCRIPTION:Payment due today: ${formatCurrency(payment.amount, payment.currency)}
END:VALARM
END:VEVENT`;
  });

  const calendar = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Feyza//Payment Schedule//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Feyza Payment Schedule${loanPurpose ? ` - ${loanPurpose}` : ''}
${events.join('\n')}
END:VCALENDAR`;

  return calendar;
}

export function downloadICalFile(payments: PaymentEvent[], loanPurpose?: string): void {
  const icalContent = generateICalFile(payments, loanPurpose);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `feyza-payment-schedule${loanPurpose ? `-${loanPurpose.toLowerCase().replace(/\s+/g, '-')}` : ''}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate Google Calendar URL
export function generateGoogleCalendarUrl(payment: PaymentEvent): string {
  const dueDate = new Date(payment.dueDate);
  dueDate.setHours(9, 0, 0, 0);
  
  const endDate = new Date(dueDate);
  endDate.setHours(10, 0, 0, 0);

  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const description = [
    `Payment Amount: ${formatCurrency(payment.amount, payment.currency)}`,
    payment.lenderName ? `Pay to: ${payment.lenderName}` : '',
    '',
    'Powered by Feyza',
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: payment.title,
    dates: `${formatDate(dueDate)}/${formatDate(endDate)}`,
    details: description,
    sf: 'true',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
