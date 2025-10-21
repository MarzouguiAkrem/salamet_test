import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { ThemedText } from '../ui/ThemedText';
import { Grossesse } from '../../services/types';

interface GrossesseCardProps {
  grossesse: Grossesse;
  onPress: () => void;
}

export const GrossesseCard: React.FC<GrossesseCardProps> = ({
  grossesse,
  onPress,
}) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <ThemedText style={styles.patientName}>
            {grossesse.patiente?.nom} {grossesse.patiente?.prenom}
          </ThemedText>
          <ThemedText style={styles.status}>
            {grossesse.statut}
          </ThemedText>
        </View>
        
        <View style={styles.details}>
          <ThemedText style={styles.detail}>
            DDR: {new Date(grossesse.dateDernieresRegles).toLocaleDateString()}
          </ThemedText>
          <ThemedText style={styles.detail}>
            DPA: {new Date(grossesse.datePresumeeAccouchement).toLocaleDateString()}
          </ThemedText>
          <ThemedText style={styles.detail}>
            SA: {grossesse.semainesAmenorrhee}
          </ThemedText>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  details: {
    gap: 4,
  },
  detail: {
    fontSize: 14,
    color: '#666',
  },
});
