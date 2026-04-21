/**
 * Contact Picker Utility — CashTraka
 *
 * Provides a reusable interface for accessing device contacts via the
 * Contact Picker API (Chrome Android 80+, Samsung Internet, etc.).
 *
 * Falls back gracefully on unsupported browsers — the UI layer should
 * always keep manual input available.
 */

export type PickedContact = {
  name: string;
  phone: string;
};

/**
 * Check if the Contact Picker API is available in the current browser.
 */
export function isContactPickerSupported(): boolean {
  return (
    typeof window \!== 'undefined' &&
    'contacts' in navigator &&
    'ContactsManager' in window
  );
}

/**
 * Open the device contact picker. Requires user gesture (click/tap).
 * Returns the selected contact's name and first phone number, or null
 * if the user cancelled or the API is unsupported.
 */
export async function pickContact(): Promise<PickedContact | null> {
  if (\!isContactPickerSupported()) return null;

  try {
    const nav = navigator as any;

    // Check which properties the browser supports
    const supportedProps: string[] = await nav.contacts.getProperties();
    const requestProps: string[] = [];
    if (supportedProps.includes('name')) requestProps.push('name');
    if (supportedProps.includes('tel')) requestProps.push('tel');

    if (requestProps.length === 0) return null;

    // Request exactly one contact
    const contacts = await nav.contacts.select(requestProps, { multiple: false });

    if (\!contacts || contacts.length === 0) return null;

    const contact = contacts[0];
    const name = contact.name?.[0] || '';
    const phones: string[] = contact.tel || [];

    if (phones.length === 0) return null;

    // If multiple phone numbers, return the first one.
    // The UI layer can provide a chooser if needed.
    return {
      name: name.trim(),
      phone: phones[0].trim(),
    };
  } catch (e) {
    // User cancelled or API error — both are fine
    console.warn('Contact picker error:', e);
    return null;
  }
}

/**
 * Open the contact picker and let user choose from multiple phone numbers
 * if the contact has more than one.
 */
export async function pickContactWithPhoneChoice(): Promise<{
  name: string;
  phones: string[];
} | null> {
  if (\!isContactPickerSupported()) return null;

  try {
    const nav = navigator as any;
    const supportedProps: string[] = await nav.contacts.getProperties();
    const requestProps: string[] = [];
    if (supportedProps.includes('name')) requestProps.push('name');
    if (supportedProps.includes('tel')) requestProps.push('tel');

    if (\!requestProps.includes('tel')) return null;

    const contacts = await nav.contacts.select(requestProps, { multiple: false });
    if (\!contacts || contacts.length === 0) return null;

    const contact = contacts[0];
    return {
      name: (contact.name?.[0] || '').trim(),
      phones: (contact.tel || []).map((p: string) => p.trim()).filter(Boolean),
    };
  } catch {
    return null;
  }
}
