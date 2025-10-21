import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '../../components/ui/ThemedText';
import { GrossesseForm } from '../../components/forms/GrossesseForm';
import { Button } from '../../components/ui/Button';

export default function GrossesseAddScreen() {
  const handleSubmit = (data: any) => {
    // Logique de sauvegarde
    console.log('Nouvelle grossesse:', data);
    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Button
          title="← Retour"
          onPress={() => router.back()}
          variant="outline"
        />
        <ThemedText type="title">Nouvelle Grossesse</ThemedText>
      </View>
      <GrossesseForm onSubmit={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
});
