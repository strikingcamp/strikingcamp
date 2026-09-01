import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/*',
        '/membre',
        '/membre/*',
        '/api/*',
        '/connexion',
        '/inscription',
        '/deconnexion',
        '/reset-password',
        '/mot-de-passe-oublie',
      ],
    },
    sitemap: 'https://strikingcamp.com/sitemap.xml',
  };
}
