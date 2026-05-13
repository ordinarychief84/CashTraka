import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.cashtraka.co';
  const lastModified = new Date();

  return [
    // Top-level marketing pages
    { url: base, lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/solutions`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/industries`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/faqs`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/about`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact`, lastModified, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.5 },

    // Auth + legal
    { url: `${base}/login`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/signup`, lastModified, changeFrequency: 'yearly', priority: 0.8 },
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
