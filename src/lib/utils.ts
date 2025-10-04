import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Order } from "@/types/order";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateICS(order: Order, action: 'create' | 'update' | 'delete') {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const status = action === 'delete' ? 'CANCELLED' : 'CONFIRMED';
  const method = action === 'delete' ? 'CANCEL' : action === 'update' ? 'REQUEST' : 'PUBLISH';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Order Management//EN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:order-${order.id}@yourdomain.com`,
    `DTSTAMP:${formatDate(new Date().toISOString())}`,
    `DTSTART:${formatDate(order.deliveryDate)}`,
    `DTEND:${formatDate(order.deliveryDate)}`,
    `SUMMARY:Order: ${order.clientName}`,
    `DESCRIPTION:Order Details: ${order.orderDetails}\\nPhone: ${order.phoneNumber}\\nCharge: $${order.chargeAmount}`,
    `STATUS:${status}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

export function downloadICS(order: Order, action: 'create' | 'update' | 'delete') {
  const icsContent = generateICS(order, action);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `order-${order.clientName}-${action}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
