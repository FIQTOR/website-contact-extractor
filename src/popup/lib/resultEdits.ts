import type { ExtractionResult } from '../../types';

export type RemovableSection =
  | 'email'
  | 'phone'
  | 'whatsapp'
  | 'social'
  | 'address'
  | 'contactPage'
  | 'companyName'
  | 'description'
  | 'logo'
  | 'websiteTitle'
  | 'websiteDescription'
  | 'siteName'
  | 'favicon';

/** Return a copy of the result with one item removed. */
export function removeResultItem(
  result: ExtractionResult,
  section: RemovableSection,
  value: string
): ExtractionResult {
  switch (section) {
    case 'email':
      return { ...result, emails: result.emails.filter((item) => item.value !== value) };
    case 'phone':
      return { ...result, phones: result.phones.filter((item) => item.value !== value) };
    case 'whatsapp':
      return { ...result, whatsapp: result.whatsapp.filter((item) => item.value !== value) };
    case 'social':
      return { ...result, social: result.social.filter((item) => item.url !== value) };
    case 'address':
      return {
        ...result,
        business: {
          ...result.business,
          addresses: result.business.addresses.filter((item) => item.value !== value)
        }
      };
    case 'contactPage':
      return {
        ...result,
        business: {
          ...result.business,
          contactPages: result.business.contactPages.filter((item) => item.value !== value)
        }
      };
    case 'companyName':
      return {
        ...result,
        business: { ...result.business, companyName: '', companyNameSource: null }
      };
    case 'description':
      return {
        ...result,
        business: { ...result.business, description: '', descriptionSource: null }
      };
    case 'logo':
      return { ...result, business: { ...result.business, logoUrl: '', logoSource: null } };
    case 'websiteTitle':
      return { ...result, website: { ...result.website, title: '' } };
    case 'websiteDescription':
      return { ...result, website: { ...result.website, metaDescription: '' } };
    case 'siteName':
      return { ...result, website: { ...result.website, siteName: '' } };
    case 'favicon':
      return { ...result, website: { ...result.website, faviconUrl: '' } };
    default:
      return result;
  }
}
