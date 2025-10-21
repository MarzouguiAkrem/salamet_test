import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('🏠 [Index] Auth:', isAuthenticated, 'Loading:', isLoading);

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Rediriger selon l'état d'authentification
  if (isAuthenticated) {
    console.log('✅ [Index] Authentifié, redirection vers dashboard');
    return <Redirect href="/(tabs)/dashboard" />;
  }

  console.log('🔒 [Index] Non authentifié, redirection vers login');
  return <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
