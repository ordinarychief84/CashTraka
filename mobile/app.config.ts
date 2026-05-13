import type { ExpoConfig } from 'expo/config';

/**
 * Expo app config for CashTraka Mobile.
 *
 * Runtime env reads (EXPO_PUBLIC_*) come from `.env` files in this
 * directory and are bundled at build time. Non-public secrets (Sentry
 * auth token, etc.) come from EAS Secrets and are only present during
 * `eas build`.
 */
const config: ExpoConfig = {
  name: 'CashTraka',
  slug: 'cashtraka-mobile',
  scheme: 'cashtraka',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#003A52',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'co.cashtraka.mobile',
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      // Camera is used for the barcode/QR scanner on Materials / PO Receive.
      NSCameraUsageDescription:
        'CashTraka uses the camera to scan barcodes on raw materials and finished products.',
    },
  },
  android: {
    package: 'co.cashtraka.mobile',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#003A52',
    },
    permissions: ['CAMERA'],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-secure-store',
      {
        // No-op on web; secure-store falls back to AsyncStorage there.
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        organization: 'cashtraka',
        project: 'cashtraka-mobile',
        // Auth token comes from EAS Secret SENTRY_AUTH_TOKEN at build time.
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'PLACEHOLDER-set-via-eas-init',
    },
    /**
     * The web API host. EXPO_PUBLIC_* keys are inlined into the JS bundle
     * at build time. Override per env via `.env.development`, `.env.staging`,
     * `.env.production`.
     */
    apiBaseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.cashtraka.co',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  },
};

export default config;
