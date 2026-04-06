import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  overlay?: boolean;
  animated?: boolean;
}

export default function LoadingSpinner({ 
  message = 'Chargement...', 
  size = 'large',
  color = Colors.primary,
  overlay = false,
  animated = true
}: LoadingSpinnerProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for message
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      pulseAnimation.start();
      
      return () => pulseAnimation.stop();
    }
  }, [animated]);

  const containerStyle = overlay ? styles.overlayContainer : styles.container;

  const content = (
    <Animated.View 
      style={[
        styles.content,
        animated && {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size={size} color={color} />
        <Animated.View 
          style={[
            styles.spinnerGlow, 
            { 
              backgroundColor: color,
              transform: [{ scale: pulseAnim }],
            }
          ]} 
        />
      </View>
      
      {message && (
        <Animated.Text 
          style={[
            styles.message, 
            { color },
            animated && { opacity: pulseAnim },
          ]}
        >
          {message}
        </Animated.Text>
      )}
      
      <View style={styles.dots}>
        {[0, 1, 2].map((index) => {
          const dotOpacity = pulseAnim.interpolate({
            inputRange: [0.9, 1],
            outputRange: [0.3 + (index * 0.15), 0.7 + (index * 0.1)],
            extrapolate: 'clamp',
          });
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { 
                  backgroundColor: color,
                  opacity: animated ? dotOpacity : 0.6,
                  transform: animated ? [{
                    scale: pulseAnim.interpolate({
                      inputRange: [0.9, 1],
                      outputRange: [0.7 + (index * 0.1), 1],
                      extrapolate: 'clamp',
                    }),
                  }] : [],
                },
              ]}
            />
          );
        })}
      </View>
    </Animated.View>
  );

  if (overlay) {
    return (
      <View style={containerStyle}>
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)']}
          style={styles.overlay}
        >
          {content}
        </LinearGradient>
      </View>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 150,
  },
  spinnerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  spinnerGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.2,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
});