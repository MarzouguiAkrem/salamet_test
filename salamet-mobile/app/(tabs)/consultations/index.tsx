import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useConsultations } from '../../../hooks/useConsultations';
import { ThemedText } from '../../../components/ui/ThemedText';
import { Button } from '../../../components/ui/Button';
import { Loading } from '../../../components/ui/Loading';
import { Card } from '../../../components/ui/Card';

export default function ConsultationsScreen() {
  const { consultations, loading, error } = useConsultations();

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Consultations</ThemedText>
        <Button
          title="Ajouter"
          onPress={() => router.push('/forms/consultation-add')}
        />
      </View>

      {error && (
        <ThemedText style={styles.error}>{error}</ThemedText>
      )}

      <FlatList
        data={consultations || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/forms/consultation-edit?id=${item.id}`)}>
            <Card style={styles.card}>
              <ThemedText type="defaultSemiBold">
                {item.patiente?.nom} {item.patiente?.prenom}
              </ThemedText>
              <ThemedText>Date: {new Date(item.dateConsultation).toLocaleDateString()}</ThemedText>
              <ThemedText>Type: {item.typeConsultation}</ThemedText>
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
