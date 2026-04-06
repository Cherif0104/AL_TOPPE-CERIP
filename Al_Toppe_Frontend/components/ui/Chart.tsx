import Colors from '@/constants/colors';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';

// Import conditionnel pour éviter les erreurs sur mobile
let LineChart: any = null;
let BarChart: any = null;
let PieChart: any = null;

try {
  const chartKit = require('react-native-chart-kit');
  LineChart = chartKit.LineChart;
  BarChart = chartKit.BarChart;
  PieChart = chartKit.PieChart;
} catch (error) {
  console.warn('react-native-chart-kit non disponible:', error);
}

const screenWidth = Dimensions.get('window').width;

interface ChartProps {
  type: 'line' | 'bar' | 'pie';
  data: any;
  title?: string;
  height?: number;
  width?: number; // Largeur personnalisée
  noContainer?: boolean; // Désactiver le container par défaut
}

export default function Chart({ type, data, title, height = 220, width, noContainer = false }: ChartProps) {
  // Fonction pour formater les valeurs sur les graphiques
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return Math.round(value).toString();
  };

  // Calculer la largeur dynamiquement
  const getChartWidth = () => {
    try {
      // Si une largeur personnalisée est fournie, l'utiliser
      if (width && width > 0) return width;
      
      if (type === 'pie') {
        const pieWidth = screenWidth - 40;
        return pieWidth > 0 ? pieWidth : 300; // Fallback
      }
      
      const labelCount = data?.labels?.length || 0;
      if (labelCount <= 7) {
        const fixedWidth = screenWidth - 40;
        return fixedWidth > 0 ? fixedWidth : 300; // Fallback
      }
      
      const calculatedWidth = Math.max(screenWidth - 40, labelCount * 25);
      return calculatedWidth > 0 ? calculatedWidth : 300; // Fallback
    } catch (error) {
      console.warn('Erreur calcul largeur graphique:', error);
      return 300; // Largeur par défaut en cas d'erreur
    }
  };

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(130, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: Colors.primary,
    },
    // Fonction personnalisée pour formater les valeurs Y
    formatYLabel: (value: string) => {
      const numValue = parseFloat(value);
      return formatValue(numValue);
    },
    // Fonction pour les tooltips
    formatTopBarValue: (value: number) => formatValue(value),
  };

  // Nettoyer les données pour éviter les valeurs non finies
  const cleanData = (inputData: any) => {
    if (type === 'pie') {
      return inputData.map((item: any) => ({
        ...item,
        amount: isFinite(item.amount) ? Math.abs(item.amount) : 0,
      }));
    }
    
    if (inputData.datasets) {
      return {
        ...inputData,
        datasets: inputData.datasets.map((dataset: any) => ({
          ...dataset,
          data: dataset.data.map((value: number) => 
            isFinite(value) ? Math.abs(value) : 0
          ),
        })),
      };
    }
    
    return inputData;
  };

  // Composant de fallback simple pour mobile - Version améliorée
  const renderSimpleChart = () => {
    const cleanedData = cleanData(data);
    
    if (type === 'pie') {
      const total = cleanedData.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      if (total === 0) {
        return (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Aucune donnée disponible</Text>
          </View>
        );
      }
      return (
        <View style={styles.simpleChartContainer}>
          {cleanedData.map((item: any, index: number) => {
            const percentage = total > 0 ? parseFloat(((item.amount || 0) / total * 100).toFixed(1)) : 0;
            return (
              <View key={index} style={styles.simpleChartRow}>
                <View style={styles.simpleChartRowHeader}>
                  <View style={[styles.simpleChartColorDot, { backgroundColor: item.color || Colors.primary }]} />
                  <Text style={styles.simpleChartLabel} numberOfLines={1}>
                    {item.name || 'Autre'}
                  </Text>
                </View>
                <View style={styles.simpleChartBarContainer}>
                  <View style={styles.simpleChartBarWrapper}>
                  <View style={[styles.simpleChartBar, { 
                    width: `${Math.min(percentage, 100)}%`, 
                    backgroundColor: item.color || Colors.primary 
                  }]} />
                  </View>
                  <Text style={styles.simpleChartValue}>{percentage.toFixed(1)}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      );
    }
    
    // Pour line et bar, afficher avec un meilleur design
    const labels = cleanedData.labels || [];
    const values = cleanedData.datasets?.[0]?.data || [];
    const validValues = values.filter((v: number) => isFinite(v) && v >= 0);
    const maxValue = validValues.length > 0 ? Math.max(...validValues, 1) : 1;
    
    if (labels.length === 0 || values.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Aucune donnée disponible</Text>
        </View>
      );
    }
    
    const chartColor = type === 'line' ? Colors.primary : '#EF4444';
    
    return (
      <View style={styles.simpleChartContainer}>
        {labels.map((label: string, index: number) => {
          const value = values[index] || 0;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <View key={index} style={styles.simpleChartRow}>
              <View style={styles.simpleChartRowHeader}>
                <Text style={styles.simpleChartDateLabel}>{label}</Text>
                <Text style={[styles.simpleChartValue, { color: chartColor }]}>
                  {formatValue(value)} F
                </Text>
              </View>
              <View style={styles.simpleChartBarContainer}>
                <View style={styles.simpleChartBarWrapper}>
                <View style={[styles.simpleChartBar, { 
                  width: `${Math.min(percentage, 100)}%`, 
                    backgroundColor: chartColor
                }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderChart = () => {
    // Sur mobile, TOUJOURS utiliser un rendu simplifié pour éviter les crashes
    // react-native-chart-kit utilise des APIs dépréciées (TouchableMixin, event handlers)
    if (Platform.OS !== 'web') {
      return renderSimpleChart();
    }
    
    const cleanedData = cleanData(data);
    
    // Sur web, essayer d'utiliser react-native-chart-kit si disponible
    if (!LineChart || !BarChart || !PieChart) {
      return renderSimpleChart();
    }
    
    try {
      switch (type) {
        case 'line':
          if (!LineChart) return renderSimpleChart();
          return (
            <LineChart
              data={cleanedData}
              width={getChartWidth()}
              height={height}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withDots={true}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              fromZero={true}
            />
          );
        case 'bar':
          if (!BarChart) return renderSimpleChart();
          return (
            <BarChart
              data={cleanedData}
              width={getChartWidth()}
              height={height}
              chartConfig={chartConfig}
              style={styles.chart}
              withInnerLines={false}
              withVerticalLabels={false}
              withHorizontalLabels={true}
              fromZero={true}
              showValuesOnTopOfBars={false}
              yAxisLabel=""
              yAxisSuffix=""
            />
          );
        case 'pie':
          if (!PieChart) return renderSimpleChart();
          return (
            <PieChart
              data={cleanedData}
              width={getChartWidth()}
              height={height}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
              absolute={false}
              hasLegend={true}
            />
          );
        default:
          return (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Type de graphique non supporté</Text>
            </View>
          );
      }
    } catch (error) {
      console.warn('Erreur lors du rendu du graphique:', error);
      // En cas d'erreur, utiliser le rendu simplifié
      return renderSimpleChart();
    }
  };

  if (noContainer) {
    return (
      <>
        {title && <Text style={styles.title}>{title}</Text>}
        {renderChart()}
      </>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      {renderChart()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  noDataText: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
  },
  simpleChartContainer: {
    padding: 16,
    minHeight: 200,
  },
  simpleChartRow: {
    marginBottom: 16,
  },
  simpleChartRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  simpleChartColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  simpleChartLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    flex: 1,
  },
  simpleChartDateLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  simpleChartBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simpleChartBarWrapper: {
    flex: 1,
    height: 24,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  simpleChartBar: {
    height: '100%',
    borderRadius: 12,
    minWidth: 4,
  },
  simpleChartValue: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    minWidth: 60,
    textAlign: 'right',
  },
});