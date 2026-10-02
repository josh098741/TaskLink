import Constants from 'expo-constants';
import { Platform } from 'react-native';

const expoConfig = Constants.expoConfig ?? null;

export const APP_NAME = expoConfig?.name || 'TaskLink';
export const APP_VERSION = expoConfig?.version || '1.0.0';
export const APP_VERSION_LABEL = `v${APP_VERSION}`;

export const APP_BUILD =
  Platform.OS === 'ios'
    ? expoConfig?.ios?.buildNumber
    : expoConfig?.android?.versionCode;

export const SUPPORT_EMAIL = 'support@tasklink.co.ke';
export const SUPPORT_PHONE = '+254700000000';
export const WEBSITE_URL = 'https://tasklink.co.ke';

export function formatBuildLabel() {
  if (!APP_BUILD) return null;
  return `Build ${APP_BUILD}`;
}