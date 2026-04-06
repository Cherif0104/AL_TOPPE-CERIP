import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import Toast from 'react-native-toast-message';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider, useApp } from '@/contexts/AppContext';
import SplashScreen from '@/components/ui/SplashScreen';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function RootLayoutNavigator() {
  const { isAppReady, showSplash, onSplashComplete } = useApp();
  useFrameworkReady();

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Affichage optimisé : charger les fonts en premier, puis splash, puis app
  if (!fontsLoaded) {
    return <LoadingSpinner message="Chargement des polices..." color="#22C55E" />;
  }

  if (!isAppReady) {
    return <LoadingSpinner message="Initialisation..." color="#22C55E" />;
  }

  if (showSplash) {
    return <SplashScreen onAnimationComplete={onSplashComplete} duration={2500} />;
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(pages)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <Toast />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutNavigator />
    </AppProvider>
  );
}