import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isPatiente, isMedecin, user } = useAuth();

  // Debug
  console.log('📱 [TabLayout] État:', {
    user: user?.name,
    role: user?.role,
    isPatiente,
    isMedecin,
  });
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      {/* Dashboard - Pour tous */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* Patientes - Seulement pour les médecins */}
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Mes Patientes',
          href: isMedecin ? undefined : null, // Masquer si pas médecin
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'people' : 'people-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* Grossesses - Pour tous (titre différent) */}
      <Tabs.Screen
        name="grossesses"
        options={{
          title: isPatiente ? 'Mes Grossesses' : 'Grossesses',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'heart' : 'heart-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* Consultations - Pour tous (titre différent) */}
      <Tabs.Screen
        name="consultations"
        options={{
          title: isPatiente ? 'Mes Consultations' : 'Consultations',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'medical' : 'medical-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* Bilans - Pour tous (titre différent) */}
      <Tabs.Screen
        name="bilans"
        options={{
          title: isPatiente ? 'Mes Bilans' : 'Bilans',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'document-text' : 'document-text-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* Profil - Seulement pour les patientes */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mon Profil',
          href: isPatiente ? undefined : null, // Masquer si pas patiente
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
