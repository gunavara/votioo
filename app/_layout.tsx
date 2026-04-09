import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { NotificationsProvider } from '../context/NotificationsContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="post/[id]"
            options={{
              headerShown: true,
              headerTitle: '',
              headerBackButtonDisplayMode: 'minimal',
              headerTintColor: '#7C3AED',
              headerStyle: { backgroundColor: '#F8FAFC' },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="my-questions"
            options={{
              headerShown: true,
              headerTitle: 'My Questions',
              headerBackButtonDisplayMode: 'minimal',
              headerTintColor: '#7C3AED',
              headerStyle: { backgroundColor: '#F8FAFC' },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="auth"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>
      </NotificationsProvider>
    </AuthProvider>
  );
}
