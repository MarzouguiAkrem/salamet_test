import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { testCompleteRestApi } from '../../utils/testRestApi';
import { ODOO_CONFIG } from '../../config/odoo';

export default function LoginScreen() {
  const [email, setEmail] = useState('ali@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const { login } = useAuth();

  /**
   * 🧪 Tester la connexion REST API
   */
  const handleTestRestApi = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir l\'email et le mot de passe');
      return;
    }

    setTesting(true);
    try {
      console.log('🧪 Démarrage des tests REST API...');
      const result = await testCompleteRestApi(email, password);

      if (result.success) {
        Alert.alert(
          '✅ Tests réussis',
          `Tous les tests sont passés !\n\nAPI Key: ${result.apiKey?.substring(0, 20)}...`,
          [
            {
              text: 'Se connecter',
              onPress: handleLogin,
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert(
          '❌ Tests échoués',
          'Certains tests ont échoué. Consultez les logs pour plus de détails.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('❌ Erreur tests:', error);
      Alert.alert('❌ Erreur', error.message);
    } finally {
      setTesting(false);
    }
  };

  /**
   * 🔐 Gérer la connexion
   */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 [LOGIN] Tentative de connexion..');
      await login(email, password);
      console.log('✅ [LOGIN] Connexion réussie');
    } catch (error: any) {
      console.error('❌ [LOGIN] Erreur:', error);
      Alert.alert(
        'Erreur de connexion',
        error.message || 'Une erreur est survenue'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverEndpoints = async () => {
  if (!email || !password) {
    Alert.alert('Erreur', 'Veuillez remplir l\'email et le mot de passe');
    return;
  }

  setTesting(true);
  try {
    console.log('🔍 Découverte des endpoints...');
    const results = await discoverOdooEndpoints(email, password);

    // Trouver les endpoints qui fonctionnent
    const workingEndpoints = results.filter(r => r.ok || r.status === 401 || r.status === 403);

    if (workingEndpoints.length > 0) {
      const message = workingEndpoints
        .map(e => `${e.method} ${e.endpoint} (${e.status})`)
        .join('\n');

      Alert.alert(
        '✅ Endpoints trouvés',
        `Les endpoints suivants sont accessibles:\n\n${message}\n\nConsultez les logs pour plus de détails.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        '❌ Aucun endpoint trouvé',
        'Aucun endpoint REST API n\'a été trouvé. Le module est-il installé ?',
        [{ text: 'OK' }]
      );
    }
  } catch (error: any) {
    console.error('❌ Erreur découverte:', error);
    Alert.alert('❌ Erreur', error.message);
  } finally {
    setTesting(false);
  }
};



  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🏥</Text>
          <Text style={styles.title}>SALAMET</Text>
          <Text style={styles.subtitle}>Suivi de Grossesse</Text>
        </View>

        {/* Informations serveur */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🌐</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Serveur</Text>
              <Text style={styles.infoValue}>{ODOO_CONFIG.BASE_URL}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🗄️</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Base de données</Text>
              <Text style={styles.infoValue}>{ODOO_CONFIG.DATABASE}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🔌</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>API</Text>
              <Text style={styles.infoValue}>Odoo REST API (Cybrosys)</Text>
            </View>
          </View>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email / Login</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !testing}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !testing}
            />
          </View>

          {/* Bouton Test REST API */}
          <TouchableOpacity
            style={[
              styles.testButton,
              (testing || !email || !password) && styles.buttonDisabled,
            ]}
            onPress={handleTestRestApi}
            disabled={testing || loading || !email || !password}
          >
            {testing ? (
              <ActivityIndicator color="#2563EB" size="small" />
            ) : (
              <>
                <Text style={styles.testButtonIcon}>🧪</Text>
                <Text style={styles.testButtonText}>Tester REST API</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Bouton Connexion */}
          <TouchableOpacity
            style={[
              styles.button,
              (loading || !email || !password) && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading || testing || !email || !password}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
  style={[
    styles.discoverButton,
    (testing || !email || !password) && styles.buttonDisabled,
  ]}
  onPress={handleDiscoverEndpoints}
  disabled={testing || loading || !email || !password}
>
  {testing ? (
    <ActivityIndicator color="#059669" size="small" />
  ) : (
    <>
      <Text style={styles.discoverButtonIcon}>🔍</Text>
      <Text style={styles.discoverButtonText}>Découvrir Endpoints</Text>
    </>
  )}
</TouchableOpacity>
        </View>

        {/* Aide */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>💡 Instructions</Text>
          <Text style={styles.helpText}>
            1. Entrez votre email/login et mot de passe Odoo
          </Text>
          <Text style={styles.helpText}>
            2. Cliquez sur "Tester REST API" pour vérifier la connexion
          </Text>
          <Text style={styles.helpText}>
            3. Si le test réussit, cliquez sur "Se connecter"
          </Text>
          <Text style={styles.helpText}>
            4. Consultez les logs dans la console pour le débogage
          </Text>
        </View>

        {/* Info module */}
        <View style={styles.moduleInfo}>
          <Text style={styles.moduleInfoText}>
            📦 Module requis: Odoo REST API (Cybrosys)
          </Text>
          <Text style={styles.moduleInfoText}>
            🔗 Endpoints: /odoo_connect, /send_request
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
        shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 12,
    gap: 8,
  },
  testButtonIcon: {
    fontSize: 18,
  },
  testButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 4,
    lineHeight: 18,
  },
  moduleInfo: {
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  moduleInfoText: {
    fontSize: 11,
    color: '#1E40AF',
    marginBottom: 2,
  },
  discoverButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#D1FAE5',
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#6EE7B7',
  marginBottom: 12,
  gap: 8,
},
discoverButtonIcon: {
  fontSize: 18,
},
discoverButtonText: {
    color: '#059669',
  fontSize: 15,
  fontWeight: '600',
}
});

