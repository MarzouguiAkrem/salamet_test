import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useNotifications } from '../../hooks/useNotifications';
import { ThemedText } from '../../components/ui/ThemedText';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { Card } from '../../components/ui/Card';

export default function NotificationsScreen() {
  const { notifications, loading, error } = useNotifications();

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="← Retour"
          onPress={() => router.back()}
          variant="outline"
        />
        <ThemedText type="title">Notifications</ThemedText>
        <Button
          title="Ajouter"
          onPress={() => router.push('/forms/notification-add')}
        />
      </View>

      {error && (
        <ThemedText style={styles.error}>{error}</ThemedText>
      )}

      <FlatList
        data={notifications || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/forms/notification-edit?id=${item.id}`)}>
            <Card style={styles.card}>
              <ThemedText type="defaultSemiBold">
                {item.titre}
              </ThemedText>
              <ThemedText>Message: {item.message}</ThemedText>
              <ThemedText>Date: {new Date(item.dateCreation).toLocaleDateString()}</ThemedText>
            </Card>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  card: {
    padding: 16,
  },
});
