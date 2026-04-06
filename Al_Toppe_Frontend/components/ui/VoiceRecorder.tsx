// VoiceRecorder.tsx
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Audio, Recording } from 'expo-av'; // Import Expo AV
import Colors from '@/constants/colors';

export interface VoiceRecorderProps {
  onRecordingComplete: (audioUri: string, duration: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingError?: (error: string) => void;
  maxDuration?: number; // en secondes
  disabled?: boolean;
}

export interface VoiceRecorderHandle {
  start: () => Promise<void> | void;
  stop: () => Promise<void> | void;
}

function VoiceRecorderInternal({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  onRecordingError,
  maxDuration = 30,
  disabled = false,
}: VoiceRecorderProps, ref: React.Ref<VoiceRecorderHandle>) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null); // Référence à l'enregistrement

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingInterval = useRef<number | null>(null);
  const soundRef = useRef<any>(null);

  useEffect(() => {
    // Demander les permissions audio au chargement
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (error) {
        console.error('Permission error:', error);
        Alert.alert('Erreur', 'Permissions microphone nécessaires');
      }
    })();

    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const startRecording = async () => {
    if (disabled) return;

    try {
      // Vérifier les permissions
      const { status } = await Audio.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Microphone permission nécessaire');
        return;
      }

      // Configurer l'audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Démarrer l'enregistrement
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingTime(0);
      setAudioUri(null);
      setDuration(0);

      // Démarrer l'animation de pulsation
      startPulseAnimation();

      // Démarrer le chronomètre
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

      // Feedback haptique
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      onRecordingStart?.();

    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMessage = 'Impossible de démarrer l\'enregistrement';
      Alert.alert('Erreur', errorMessage);
      onRecordingError?.(errorMessage);
    }
  };

  const stopRecording = async () => {
    if (!isRecording || !recording) return;

    try {
      // Arrêter l'enregistrement
      await recording.stopAndUnloadAsync();
      
      // Arrêter le chronomètre
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }

      // Récupérer l'URI de l'enregistrement
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('No recording URI');
      }

      setAudioUri(uri);
      setDuration(recordingTime);
      setIsRecording(false);
      stopPulseAnimation();

      // Feedback haptique
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      onRecordingStop?.();

      // Appeler le callback avec les données
      onRecordingComplete(uri, recordingTime);

    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement');
    }
  };

  const playRecording = async () => {
    if (!audioUri) return;

    try {
      // Charger et jouer le son
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      
      soundRef.current = sound;
      setIsPlaying(true);

      // Quand la lecture est terminée
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });

      await sound.playAsync();

    } catch (error) {
      console.error('Error playing recording:', error);
      Alert.alert('Erreur', 'Impossible de jouer l\'enregistrement');
    }
  };

  const stopPlaying = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingButtonStyle = () => {
    if (isRecording) {
      return [styles.recordButton, styles.recordingButton];
    }
    return [styles.recordButton, disabled && styles.disabledButton];
  };

  useImperativeHandle(ref, () => ({
    start: startRecording,
    stop: stopRecording,
  }));

  return (
    <View style={styles.container}>
      {/* Affichage du temps d'enregistrement */}
      {isRecording && (
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(recordingTime)}</Text>
          <Text style={styles.maxTimeText}>/ {formatTime(maxDuration)}</Text>
        </View>
      )}

      {/* Bouton d'enregistrement */}
      <View style={styles.buttonContainer}>
        {!audioUri ? (
          // Bouton d'enregistrement
          <TouchableOpacity
            style={getRecordingButtonStyle()}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              {isRecording ? (
                <Square size={24} color="#FFFFFF" />
              ) : (
                <Mic size={24} color="#006666" />
              )}
            </Animated.View>
          </TouchableOpacity>
        ) : (
          // Bouton de lecture
          <TouchableOpacity
            style={[styles.recordButton, styles.playButton]}
            onPress={isPlaying ? stopPlaying : playRecording}
            activeOpacity={0.8}
          >
            {isPlaying ? (
              <Pause size={24} color="#FFFFFF" />
            ) : (
              <Play size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Indicateur d'état */}
      <View style={styles.statusContainer}>
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Enregistrement en cours...</Text>
          </View>
        )}
        {audioUri && !isRecording && (
          <Text style={styles.recordingCompleteText}>
            Enregistrement terminé ({formatTime(duration)})
          </Text>
        )}
      </View>

      {/* Barre de progression */}
      {isRecording && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(recordingTime / maxDuration) * 100}%` },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const VoiceRecorder = forwardRef<VoiceRecorderHandle, VoiceRecorderProps>(VoiceRecorderInternal);

export default VoiceRecorder;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  maxTimeText: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 5,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  recordingButton: {
    backgroundColor: '#FF9933',
  },
  playButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    opacity: 0.5,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  recordingCompleteText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
