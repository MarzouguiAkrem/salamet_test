import React, { useState } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity,
  Text,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGrossesses } from '../../../hooks/useGrossesses';

export default function GrossessesScreen() {
  const { 
    grossesses, 
    loading, 
    error,
    loadGrossesses,
    totalGrossesses,
    grossessesEnCours,
    grossessesARisque,
    canCreate,
    isPatiente
  } = useGrossesses();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGrossesses();
    setRefreshing(false);
  };

  const renderGrossesse = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.grossesseCard}
      onPress={() => router.push(`/forms/grossesse-edit?id=${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.patienteName}>
            {item.patiente_id?.[1] || 'Patiente'}
          </Text>
          <View style={[styles.stateBadge, getStateStyle(item.state)]}>
            <Text style={styles.stateText}>{getStateLabel(item.state)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            DPA : {new Date(item.date_prevue_accouchement).toLocaleDateString('fr-FR')}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            Terme : {item.tag_display || `${item.tag_semaines}SA+${item.tag_jours}j`}
          </Text>
        </View>

        {item.type_pathologie_principale && item.type_pathologie_principale !== 'normale' && (
          <View style={styles.infoRow}>
            <Ionicons name="medical-outline" size={16} color="#EF4444" />
            <Text style={[styles.infoText, { color: '#EF4444' }]}>
              {item.type_pathologie_principale}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.niveau_risque) }]}>
          <Text style={styles.riskText}>
            {getRiskLabel(item.niveau_risque)}
          </Text>
        </View>

        <View style={styles.statsRow}>
          {item.nombre_consultations > 0 && (
            <View style={styles.miniStat}>
              <Ionicons name="medical" size={14} color="#2196F3" />
              <Text style={styles.miniStatText}>{item.nombre_consultations}</Text>
            </View>
          )}
          {item.nombre_bilans > 0 && (
            <View style={styles.miniStat}>
              <Ionicons name="document-text" size={14} color="#10B981" />
              <Text style={styles.miniStatText}>{item.nombre_bilans}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStateStyle = (state: string) => {
    switch (state) {
      case 'en_cours':
        return { backgroundColor: '#DBEAFE' };
      case 'a_risque':
        return { backgroundColor: '#FEE2E2' };
      case 'terminee':
        return { backgroundColor: '#D1FAE5' };
      default:
        return { backgroundColor: '#F3F4F6' };
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'en_cours': return 'En cours';
      case 'a_risque': return 'À risque';
      case 'terminee': return 'Terminée';
      case 'interrompue': return 'Interrompue';
      default: return state;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'faible': return '#10B981';
      case 'moyen': return '#F59E0B';
      case 'eleve': return '#EF4444';
      case 'tres_eleve': return '#DC2626';
      default: return '#9CA3AF';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'faible': return 'Risque faible';
      case 'moyen': return 'Risque moyen';
      case 'eleve': return 'Risque élevé';
      case 'tres_eleve': return 'Risque très élevé';
      default: return 'Non évalué';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Chargement des grossesses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isPatiente ? 'Mes Grossesses' : 'Grossesses'}
        </Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalGrossesses}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#2196F3' }]}>
              {grossessesEnCours}
            </Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {grossessesARisque}
            </Text>
            <Text style={styles.statLabel}>À risque</Text>
          </View>
        </View>
      </View>

      {/* Bouton ajouter */}
      {canCreate && (
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/forms/grossesse-add')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Nouvelle grossesse</Text>
        </TouchableOpacity>
      )}

      {/* Message d'erreur */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Liste */}
      <FlatList
        data={grossesses}
        renderItem={renderGrossesse}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {isPatiente ? 'Aucune grossesse enregistrée' : 'Aucune grossesse à afficher'}
            </Text>
            {canCreate && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => router.push('/forms/grossesse-add')}
              >
                <Text style={styles.emptyButtonText}>Ajouter une grossesse</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  grossesseCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  patienteName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  stateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  riskText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  miniStatText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
