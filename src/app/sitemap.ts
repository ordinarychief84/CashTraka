import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
<<<<<<< HEAD
  const base = 'https://cashtraka.co';
=======
    const base = 'https://cashtraka.co';
>>>>>>> 72510b1ead24f1aeea8948aa20fb3fa0f398563c

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'monthly', priority: 1.0 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
      ];
}
