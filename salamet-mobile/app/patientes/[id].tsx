// app/patientes/[id].tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { patienteService } from '@/services/patienteService';
import { grossesseService } from '@/services/grossesseService';
import { Patiente, Grossesse } from '@/services/types';

export default function PatienteDetailScreen() {
  const { id } = useLocalSearchParams();
  const [patiente, setPatiente] = useState<Patiente | null>(null);
  const [grossesses, setGrossesses] = useState<Grossesse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPatienteData();
    }
  }, [id]);

  const loadPatienteData = async () => {
    try {
      const [patienteData, grossessesData] = await Promise.all([
        patienteService.getPatiente(Number(id)),
        grossesseService.getGrossessesPatiente(Number(id))
      ]);
      setPatiente(patienteData);
      setGrossesses(grossessesData);
    } catch (error) {
      console.error('Erreur chargement patiente:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!patiente) return <Text>Chargement...</Text>;

  return (
    <ScrollView style={styles.container}>
      {/* Informations générales */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations générales</Text>
        <Text style={styles.info}>Nom: {patiente.nom_complet}</Text>
        <Text style={styles.info}>Âge: {patiente.age} ans</Text>
        <Text style={styles.info}>Téléphone: {patiente.telephone}</Text>
        <Text style={styles.info}>Email: {patiente.email}</Text>
        <Text style={styles.info}>Groupe sanguin: {patiente.groupe_sanguin}</Text>
      </View>

      {/* Actions rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push(`/grossesses/new?patienteId=${id}`)}
        >
          <Text style={styles.actionButtonText}>Nouvelle grossesse</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push(`/consultations/new?patienteId=${id}`)}
        >
          <Text style={styles.actionButtonText}>Nouvelle consultation</Text>
        </TouchableOpacity>
      </View>

      {/* Grossesses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grossesses ({grossesses.length})</Text>
        {grossesses.map((grossesse) => (
          <TouchableOpacity 
            key={grossesse.id}
            style={styles.grossesseCard}
            onPress={() => router.push(`/grossesses/${grossesse.id}`)}
          >
            <Text style={styles.grossesseName}>{grossesse.name}</Text>
            <Text style={styles.grossesseInfo}>TAG: {grossesse.tag_display}</Text>
            <Text style={styles.grossesseInfo}>État: {grossesse.state}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  actionButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  grossesseCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  grossesseName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  grossesseInfo: {
    fontSize: 14,
    color: '#666',
  },
});
