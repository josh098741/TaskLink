import { Redirect } from "expo-router";

/**
 * Post-OAuth landing screen (Google sign in / sign up).
 *
 * Routes through the gateway, which checks onboarding status and sends first-
 * time users through the setup flow (role, phone, profile, categories) before
 * reaching the main tabs.
 */
export default function SSOCallback() {
  return <Redirect href="/gateway" />;
}