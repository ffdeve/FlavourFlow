import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="LogInHomeScreen" />
      <Stack.Screen name="login-email" />
      <Stack.Screen name="SignupHomeScreen" />
      <Stack.Screen name="signup-email" />
      <Stack.Screen name="signup-password" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
