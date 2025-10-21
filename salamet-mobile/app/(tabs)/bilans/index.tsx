import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useBilans } from '../../../hooks/useBilans';
import { ThemedText } from '../../../components/ui/ThemedText';
import { Button } from '../../../components/ui/Button';
import { Loading } from '../../../components/ui/Loading';
import { Card } from '../../../components/ui/Card';

export default function BilansScreen() {
  const { bilans, loading, error } = useBilans();

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Bilans</ThemedText>
        <Button
          title="Ajouter"
          onPress={() => router.push('/forms/bilan-add')}
        />
      </View>

      {error && (
        <ThemedText style={styles.error}>{error}</ThemedText>
      )}

      <FlatList
        data={bilans || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/forms/bilan-edit?id=${item.id}`)}>
            <Card style={styles.card}>
              <ThemedText type="defaultSemiBold">
                {item.patiente?.nom} {item.patiente?.prenom}
              </ThemedText>
              <ThemedText>Date: {new Date(item.dateBilan).toLocaleDateString()}</ThemedText>
              <ThemedText>Type: {item.typeBilan}</ThemedText>
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
