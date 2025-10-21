import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '../../components/ui/ThemedText';
import { BilanForm } from '../../components/forms/BilanForm';
import { Button } from '../../components/ui/Button';

export default function BilanAddScreen() {
  const handleSubmit = (data: any) => {
    console.log('Nouveau bilan:', data);
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
        <ThemedText type="title">Nouveau Bilan</ThemedText>
      </View>
      <BilanForm onSubmit={handleSubmit} />
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
