import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  ArrowLeft,
  TrendingUp,
  Package,
  X,
  ChevronDown
} from 'lucide-react-native';
import { ProductionService, ProductionCycle, ProductionTask, ProductionCycleStatus, ProductionTaskStatus } from '@/services/production';
import { ActivityService } from '@/services/activity';
import { getEntrepreneurId } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import Header from '@/components/ui/Header';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import Footer from '@/components/ui/Footer';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';

export default function ProductionScreen() {
  const [cycles, setCycles] = useState<ProductionCycle[]>([]);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddCycleModal, setShowAddCycleModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<ProductionCycle | null>(null);
  const [progress, setProgress] = useState<{ progress_percentage: number; completion_rate: number } | null>(null);
  const navigation = useNavigation<any>();

  const [cycleTitle, setCycleTitle] = useState('');
  const [cycleDuration, setCycleDuration] = useState('');
  const [cycleStartDate, setCycleStartDate] = useState('');
  const [cycleTargetQuantity, setCycleTargetQuantity] = useState('');
  
  // Add new state for date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'cycleStartDate' | null>(null);
  
  const [taskName, setTaskName] = useState('');
  const [taskDuration, setTaskDuration] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState('');
  const [dependsOn, setDependsOn] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const entrepreneurId = await getEntrepreneurId();
      if (!entrepreneurId) return;

      const activitiesData = await ActivityService.listByEntrepreneur(entrepreneurId);
      const activitiesList = activitiesData?.results || [];
      setActivities(activitiesList);
      
      if (activitiesList.length > 0) {
        setSelectedActivity(activitiesList[0].id);
        await loadCycles(entrepreneurId, activitiesList[0].id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setError('Impossible de charger les données de production');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCycles = async (entrepreneurId: string, activityId: string) => {
    try {
      const cyclesData = await ProductionService.listCycles(entrepreneurId, { activity_id: activityId });
      const cyclesList = cyclesData?.results || cyclesData || [];
      setCycles(cyclesList);
      
      if (cyclesList.length > 0) {
        await handleCycleSelect(cyclesList[0]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des cycles:', error);
    }
  };

  const loadTasks = async (cycleId: string) => {
    try {
      const tasksData = await ProductionService.listTasks(cycleId);
      const tasksList = tasksData?.results || tasksData || [];
      setTasks(tasksList);
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error);
    }
  };

  const handleActivityChange = async (activityId: string) => {
    setSelectedActivity(activityId);
    const entrepreneurId = await getEntrepreneurId();
    if (entrepreneurId) {
      await loadCycles(entrepreneurId, activityId);
    }
  };

  const handleCycleSelect = async (cycle: ProductionCycle) => {
    setSelectedCycle(cycle);
    await loadTasks(cycle.id);
    try {
      const prog = await ProductionService.getCycleProgress(cycle.id);
      setProgress({
        progress_percentage: Math.round(prog.progress_percentage ?? 0),
        completion_rate: Math.round((prog.completion_rate ?? 0) * 100) / 100,
      });
      console.log('progress', prog)
    } catch {}
  };

  // Add function to handle date selection
  const handleDateChange = (event: any, selectedDate: any) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      if (datePickerField === 'cycleStartDate') {
        setCycleStartDate(formattedDate);
      }
    }
  };

  const createCycle = async () => {
    if (!cycleTitle || !cycleDuration || !cycleStartDate || !selectedActivity) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const entrepreneurId = await getEntrepreneurId();
      if (!entrepreneurId) return;

      const startDate = new Date(cycleStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(cycleDuration));

      const cycleData = {
        activity: selectedActivity,
        title: cycleTitle,
        duration_days: parseInt(cycleDuration),
        start_date: startDate.toISOString().split('T')[0],
        expected_end_date: endDate.toISOString().split('T')[0],
        target_quantity: cycleTargetQuantity ? parseInt(cycleTargetQuantity) : undefined,
        status: 'planned' as ProductionCycleStatus,
      };

      await ProductionService.createCycle(cycleData);
      setShowAddCycleModal(false);
      resetCycleForm();
      await loadData();
      Alert.alert('Succès', 'Cycle de production créé avec succès');
    } catch (error) {
      console.error('Erreur lors de la création du cycle:', error);
      Alert.alert('Erreur', 'Impossible de créer le cycle de production');
    }
  };

  const createTask = async () => {
    if (!taskName || !taskDuration || !selectedCycle) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const startDate = plannedStartDate ? new Date(plannedStartDate) : new Date();
      const endDate = plannedEndDate
        ? new Date(plannedEndDate)
        : new Date(startDate.getTime() + parseInt(taskDuration) * 24 * 60 * 60 * 1000);

      const taskData = {
        production_cycle: selectedCycle.id,
        name: taskName,
        sequence_order: sequenceOrder ? parseInt(sequenceOrder) : tasks.length + 1,
        planned_duration_days: parseInt(taskDuration),
        planned_start_date: startDate.toISOString().split('T')[0],
        planned_end_date: endDate.toISOString().split('T')[0],
        description: taskDescription,
        ...(dependsOn ? { depends_on: dependsOn } : {}),
      };

      await ProductionService.createTask(taskData);
      setShowAddTaskModal(false);
      resetTaskForm();
      await loadTasks(selectedCycle.id);
      Alert.alert('Succès', 'Tâche créée avec succès');
    } catch (error) {
      console.error('Erreur lors de la création de la tâche:', error);
      Alert.alert('Erreur', 'Impossible de créer la tâche');
    }
  };

  const startTask = async (taskId: string) => {
    try {
      await ProductionService.startTask(taskId);
      if (selectedCycle) {
        await loadTasks(selectedCycle.id);
      }
      Alert.alert('Succès', 'Tâche démarrée');
    } catch (error) {
      console.error('Erreur lors du démarrage de la tâche:', error);
      Alert.alert('Erreur', 'Impossible de démarrer la tâche');
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      await ProductionService.completeTask(taskId);
      if (selectedCycle) {
        await loadTasks(selectedCycle.id);
      }
      Alert.alert('Succès', 'Tâche terminée');
    } catch (error) {
      console.error('Erreur lors de la finalisation de la tâche:', error);
      Alert.alert('Erreur', 'Impossible de terminer la tâche');
    }
  };

  const resetCycleForm = () => {
    setCycleTitle('');
    setCycleDuration('');
    setCycleStartDate('');
    setCycleTargetQuantity('');
  };

  const resetTaskForm = () => {
    setTaskName('');
    setTaskDuration('');
    setTaskDescription('');
    setSequenceOrder('');
    setDependsOn('');
    setPlannedStartDate('');
    setPlannedEndDate('');
  };

  const getStatusColor = (status: ProductionCycleStatus | ProductionTaskStatus) => {
    switch (status) {
      case 'completed': return Colors.primary;
      case 'in_progress': return '#3B82F6';
      case 'planned': return '#8B5CF6';
      case 'delayed': return '#EF4444';
      case 'cancelled': return '#9CA3AF';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: ProductionCycleStatus | ProductionTaskStatus) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Play;
      case 'delayed': return AlertTriangle;
      case 'cancelled': return Pause;
      default: return Clock;
    }
  };

  const stats = {
    totalCycles: cycles.length,
    activeCycles: cycles.filter(c => c.status === 'in_progress').length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    totalTasks: tasks.length,
  };

  // if (isLoading && cycles.length === 0) {
  //   return (
  //       <View style={styles.container}>
  //         <LinearGradient
  //           colors={[Colors.primary, Colors.secondary]}
  //           style={styles.loadingGradient}
  //         >
  //           <ActivityIndicator size="large" color="#FFFFFF" />
  //           <Text style={styles.loadingText}>Chargement...</Text>
  //         </LinearGradient>
  //       </View>
  //   );
  // }

  return (
      <View style={styles.container}>
        <Header
          title="Production"
          onNotificationPress={() => router.push('alerts' as never)}
          onProfilePress={() => router.push('profile' as never)}
        />
         <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

        {/* Header with Gradient */}
        <LinearGradient
          colors={[Colors.primary, Colors.primary]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Production</Text>
              <Text style={styles.headerSubtitle}>Gestion des cycles</Text>
            </View>

            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddCycleModal(true)}
            >
              <Plus size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Package size={18} color="#FFFFFF" />
              <Text style={styles.statValue}>{stats.totalCycles}</Text>
              <Text style={styles.statLabel}>Cycles</Text>
            </View>
            
            <View style={styles.statCard}>
              <TrendingUp size={18} color="#FFFFFF" />
              <Text style={styles.statValue}>{stats.activeCycles}</Text>
              <Text style={styles.statLabel}>En cours</Text>
            </View>
            
            <View style={styles.statCard}>
              <CheckCircle size={18} color="#FFFFFF" />
              <Text style={styles.statValue}>{stats.completedTasks}</Text>
              <Text style={styles.statLabel}>Complétées</Text>
            </View>
          </View>
        </LinearGradient>

       
          {/* Activity Selector */}
          <View style={styles.selectorCard}>
            <View style={styles.selectorHeader}>
              <Package size={20} color={Colors.primary} />
              <Text style={styles.selectorLabel}>Activité</Text>
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedActivity}
                onValueChange={handleActivityChange}
                style={styles.picker}
              >
                {activities.map((a: any) => (
                  <Picker.Item 
                    key={a.id} 
                    label={a.name || a.title || 'Activité'} 
                    value={a.id} 
                  />
                ))}
              </Picker>
              <ChevronDown size={20} color={Colors.primary} style={styles.pickerIcon} />
            </View>
          </View>

          {/* Cycles Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cycles de production</Text>
              {selectedCycle && (
                <TouchableOpacity 
                  style={styles.addTaskBtn}
                  onPress={() => setShowAddTaskModal(true)}
                >
                  <Plus size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            {cycles.length > 0 ? (
              cycles.map((cycle) => {
                const StatusIcon = getStatusIcon(cycle.status);
                return (
                  <TouchableOpacity 
                    key={cycle.id} 
                    style={[
                      styles.cycleCard,
                      selectedCycle?.id === cycle.id && styles.cycleCardSelected
                    ]}
                    onPress={() => handleCycleSelect(cycle)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cycleHeader}>
                      <LinearGradient
                        colors={[getStatusColor(cycle.status) + '25', getStatusColor(cycle.status) + '10']}
                        style={styles.cycleIconGradient}
                      >
                        <StatusIcon size={24} color={getStatusColor(cycle.status)} />
                      </LinearGradient>
                      
                      <View style={styles.cycleHeaderInfo}>
                        <Text style={styles.cycleTitle}>{cycle.title}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(cycle.status) + '20' }]}>
                          <View style={[styles.statusDot, { backgroundColor: getStatusColor(cycle.status) }]} />
                          <Text style={[styles.statusText, { color: getStatusColor(cycle.status) }]}>
                            {cycle.status}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.cycleInfo}>
                      <View style={styles.cycleInfoItem}>
                        <Calendar size={14} color="#64748B" />
                        <Text style={styles.cycleInfoText}>
                          {cycle.start_date} → {cycle.expected_end_date}
                        </Text>
                      </View>
                      <View style={styles.cycleInfoItem}>
                        <CheckCircle size={14} color={Colors.primary} />
                        <Text style={styles.cycleInfoText}>
                          {cycle.completed_tasks}/{cycle.total_tasks} tâches
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressSection}>
                      <Text style={styles.progressLabel}>Progression</Text>
                      <View style={styles.progressBarContainer}>
                        <LinearGradient
                          colors={[getStatusColor(cycle.status), getStatusColor(cycle.status) + '80']}
                          style={[styles.progressBarFill, { 
                            width: `${Math.round((cycle as any).tasks_progress || (cycle as any).progress_percentage || 0)}%` 
                          }]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={['#F0F9FF', '#FFF7ED']}
                  style={styles.emptyGradient}
                >
                  <View style={styles.emptyIconWrapper}>
                    <Package size={48} color={Colors.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>Aucun cycle</Text>
                  <Text style={styles.emptyText}>
                    Créez votre premier cycle de production
                  </Text>
                  <TouchableOpacity 
                    style={styles.emptyButtonWrapper}
                    onPress={() => setShowAddCycleModal(true)}
                  >
                    <LinearGradient
                      colors={[Colors.primary, Colors.primary]}
                      style={styles.emptyButton}
                    >
                      <Plus size={20} color="#FFFFFF" />
                      <Text style={styles.emptyButtonText}>Créer un cycle</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Tasks Section */}
          {selectedCycle && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tâches du cycle</Text>
                <TouchableOpacity 
                  style={styles.addTaskButton}
                  onPress={() => setShowAddTaskModal(true)}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.addTaskButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>

              {progress && (
                <View style={styles.progressCard}>
                  <View style={styles.progressCardHeader}>
                    <TrendingUp size={20} color={Colors.primary} />
                    <Text style={styles.progressCardTitle}>Progression globale</Text>
                  </View>
                  <Text style={styles.progressPercentage}>{progress.progress_percentage}%</Text>
                  <View style={styles.progressBarContainer}>
                    <LinearGradient
                      colors={[Colors.primary, Colors.secondary]}
                      style={[styles.progressBarFill, { width: `${progress.progress_percentage}%` }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>
              )}

              {tasks.length > 0 ? (
                tasks.map((task) => {
                  const StatusIcon = getStatusIcon(task.status);
                  return (
                    <View key={task.id} style={styles.taskCard}>
                      <View style={styles.taskHeader}>
                        <View style={styles.taskTitleRow}>
                          <View style={[styles.taskIconWrapper, { backgroundColor: getStatusColor(task.status) + '20' }]}>
                            <StatusIcon size={18} color={getStatusColor(task.status)} />
                          </View>
                          <View style={styles.taskInfo}>
                            <Text style={styles.taskTitle}>{task.name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '15' }]}>
                              <View style={[styles.statusDot, { backgroundColor: getStatusColor(task.status) }]} />
                              <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                                {task.status}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View style={styles.taskMeta}>
                        <View style={styles.taskMetaItem}>
                          <Clock size={14} color="#64748B" />
                          <Text style={styles.taskMetaText}>{task.planned_duration_days}j</Text>
                        </View>
                        <Text style={styles.taskMetaText}>
                          {task.planned_start_date} → {task.planned_end_date}
                        </Text>
                      </View>

                      <View style={styles.taskActions}>
                        {task.status === 'pending' && (
                          <TouchableOpacity 
                            style={styles.taskActionBtn}
                            onPress={() => startTask(task.id)}
                          >
                            <LinearGradient
                              colors={[Colors.primary, Colors.primary]}
                              style={styles.taskActionGradient}
                            >
                              <Play size={16} color="#FFFFFF" />
                              <Text style={styles.taskActionText}>Démarrer</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        )}
                        {task.status === 'in_progress' && (
                          <TouchableOpacity 
                            style={styles.taskActionBtn}
                            onPress={() => completeTask(task.id)}
                          >
                            <LinearGradient
                              colors={[Colors.primary, Colors.primary]}
                              style={styles.taskActionGradient}
                            >
                              <CheckCircle size={16} color="#FFFFFF" />
                              <Text style={styles.taskActionText}>Terminer</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyTasksCard}>
                  <Clock size={32} color="#94A3B8" />
                  <Text style={styles.emptyTasksTitle}>Aucune tâche</Text>
                  <Text style={styles.emptyTasksText}>
                    Ajoutez des tâches pour planifier ce cycle
                  </Text>
                </View>
              )}
            </View>
          )}

          {error && (
            <View style={styles.errorCard}>
              <AlertTriangle size={20} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Modals */}
        <Modal visible={showAddCycleModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouveau cycle 🔄</Text>
                <TouchableOpacity onPress={() => setShowAddCycleModal(false)}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Titre du cycle"
                placeholderTextColor="#94A3B8"
                value={cycleTitle}
                onChangeText={setCycleTitle}
              />
              
              <View style={styles.modalRow}>
                <TextInput
                  style={[styles.modalInput, styles.modalInputHalf]}
                  placeholder="Durée (jours)"
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                  value={cycleDuration}
                  onChangeText={setCycleDuration}
                />
                {/* Replace text input with date picker trigger */}
                <TouchableOpacity 
                  style={[styles.modalInput, styles.modalInputHalf]}
                  onPress={() => {
                    setDatePickerField('cycleStartDate');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={{ color: cycleStartDate ? '#1E293B' : '#94A3B8' }}>
                    {cycleStartDate || "Sélectionner date"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Quantité cible (optionnel)"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
                value={cycleTargetQuantity}
                onChangeText={setCycleTargetQuantity}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalCancelButton} 
                  onPress={() => setShowAddCycleModal(false)}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCreateButtonWrapper} onPress={createCycle}>
                  <LinearGradient
                    colors={[Colors.primary, Colors.primary]}
                    style={styles.modalCreateButton}
                  >
                    <Text style={styles.modalCreateText}>Créer</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add DateTimePicker component */}
        {showDatePicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <Modal visible={showAddTaskModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <ScrollView 
              style={styles.modalScrollContent}
              contentContainerStyle={styles.modalScrollContainer}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Nouvelle tâche ✅</Text>
                  <TouchableOpacity onPress={() => setShowAddTaskModal(false)}>
                    <X size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nom de la tâche"
                  placeholderTextColor="#94A3B8"
                  value={taskName}
                  onChangeText={setTaskName}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Durée (jours)"
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                  value={taskDuration}
                  onChangeText={setTaskDuration}
                />
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Description"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  textAlignVertical="top"
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.modalCancelButton} 
                    onPress={() => setShowAddTaskModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalCreateButtonWrapper} onPress={createTask}>
                    <LinearGradient
                      colors={[Colors.primary, Colors.primary]}
                      style={styles.modalCreateButton}
                    >
                      <Text style={styles.modalCreateText}>Créer</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        <Footer showNavigation />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  selectorCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginLeft: 8,
  },
  pickerWrapper: {
    position: 'relative',
  },
  picker: {
    height: 40,
    color: '#1E293B',
  },
  pickerIcon: {
    position: 'absolute',
    right: 12,
    top: 10,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  addTaskBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cycleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cycleCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  cycleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cycleIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cycleHeaderInfo: {
    flex: 1,
  },
  cycleTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  cycleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cycleInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cycleInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginLeft: 6,
  },
  progressSection: {
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButtonWrapper: {
    width: '100%',
  },
  emptyButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressCardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginLeft: 8,
  },
  progressPercentage: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  taskIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskMetaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginLeft: 6,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  taskActionBtn: {
    flex: 1,
  },
  taskActionGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  taskActionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  emptyTasksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyTasksTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyTasksText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalScrollContent: {
    flex: 1,
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalInputHalf: {
    flex: 1,
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  modalCreateButtonWrapper: {
    flex: 1,
  },
  modalCreateButton: {
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCreateText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addTaskButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
});