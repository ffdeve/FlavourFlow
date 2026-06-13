import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="entry" />
      <Stack.Screen name="login" />
      <Stack.Screen name="login-email" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="register-email" />
      <Stack.Screen name="register-password" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="userpreference" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="set-new-password" />
    </Stack>
  );
}
