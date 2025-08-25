// next-intl.config.ts
import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en', 'ar'],
  defaultLocale: 'fr',
   localePrefix: 'as-needed' // permet que "/" → "/fr"
});

export default routing;
