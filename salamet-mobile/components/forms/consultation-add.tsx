import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '../../components/ui/ThemedText';
import { ConsultationForm } from '../../components/forms/ConsultationForm';
import { Button } from '../../components/ui/Button';

export default function ConsultationAddScreen() {
  const handleSubmit = (data: any) => {
    console.log('Nouvelle consultation:', data);
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
        <ThemedText type="title">Nouvelle Consultation</ThemedText>
      </View>
      <ConsultationForm onSubmit={handleSubmit} />
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
