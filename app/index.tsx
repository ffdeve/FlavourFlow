import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();
  const navigationAttempted = useRef(false);

  useEffect(() => {
    if (!isInitialized || navigationAttempted.current) return;

    navigationAttempted.current = true;
    
    // Delay navigation to ensure layout is mounted
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/welcome');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isInitialized]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#FBA82E" />
    </View>
  );
}