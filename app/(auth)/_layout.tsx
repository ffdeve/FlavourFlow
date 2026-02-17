import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login/LogInHomeScreen" />
      <Stack.Screen name="login/login-email" />
      <Stack.Screen name="signup/SignupHomeScreen" />
      <Stack.Screen name="signup/register-with-email-setup" />
      <Stack.Screen name="signup/regitser-with-email-password-setup" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="forgotPasword/forgot-password" />
    </Stack>
  );
}
