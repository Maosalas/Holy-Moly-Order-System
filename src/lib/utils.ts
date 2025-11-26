import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Order } from "@/types/order";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a Date or date string to a local datetime string for input[type="datetime-local"]
 * WITHOUT timezone conversion (preserves the date as-is)
 */
export function dateToLocalInput(date: Date | string): string {
  if (!date) return "";
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Get local date components without timezone conversion
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converts a Date or date string from the database to local date string for input[type="date"]
 * WITHOUT timezone conversion (preserves the date as-is)
 */
export function dateToLocalDateInput(date: Date | string): string {
  if (!date) return "";
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Get local date components
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Converts a local datetime input value to an ISO string that preserves the local date/time
 * This prevents timezone shifts when saving to the database
 */
export function localInputToDate(dateTimeString: string): Date {
  if (!dateTimeString) return new Date();

  // Parse the local datetime string directly without timezone conversion
  const [datePart, timePart] = dateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours = 0, minutes = 0] = (timePart || '00:00').split(':').map(Number);

  // Create date in local timezone
  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Converts a local date input value to a Date object at midnight local time
 */
export function localDateInputToDate(dateString: string): Date {
  if (!dateString) return new Date();

  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Formats a date for display, preserving the local date without timezone conversion
 */
export function formatDateForDisplay(date: Date | string, locale: string = 'en-US', options?: Intl.DateTimeFormatOptions): string {
  if (!date) return "";

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  // Use UTC methods to prevent timezone conversion
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth();
  const day = dateObj.getUTCDate();

  // Create a date in UTC that represents the local date
  const utcDate = new Date(Date.UTC(year, month, day));

  return utcDate.toLocaleDateString(locale, defaultOptions);
}

/**
 * Parses a date from the database and returns a Date object at midnight local time
 * WITHOUT timezone conversion issues
 */
export function parseDateFromDB(date: Date | string): Date {
  if (!date) return new Date();

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Get UTC components to avoid timezone conversion
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth();
  const day = dateObj.getUTCDate();

  // Create local date at midnight
  return new Date(year, month, day, 0, 0, 0, 0);
}

export function generateICS(order: Order, action: 'create' | 'update' | 'delete') {
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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
    `DTSTAMP:${formatDate(new Date())}`,
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
