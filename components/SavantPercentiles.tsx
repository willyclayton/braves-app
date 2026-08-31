import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { savantPercentileColor, savantTrackColor, type SavantSection } from '@/lib/savant';

const ICONS: Record<SavantSection['key'], keyof typeof Ionicons.glyphMap> = {
  value: 'trophy',
  batting: 'baseball',
  pitching: 'baseball',
  fielding: 'hand-left',
  running: 'walk',
};

function PercentileBar({
  percentile,
  delay,
}: {
  percentile: number | null;
  delay: number;
}) {
  const width = useRef(new Animated.Value(0)).current;
  const [trackW, setTrackW] = useState(0);
  const pct = percentile == null ? 0 : Math.max(2, Math.min(100, percentile));
  const color = percentile == null ? '#B4B4B4' : savantPercentileColor(percentile);
  const track = percentile == null ? '#ECEDEF' : savantTrackColor(percentile);

  useEffect(() => {
    if (!trackW) return;
    width.setValue(0);
    Animated.timing(width, {
      toValue: (pct / 100) * trackW,
      duration: 480,
      delay,
      useNativeDriver: false,
    }).start();
  }, [trackW, pct, delay, width]);

  return (
    <View
      style={[styles.track, { backgroundColor: track }]}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
    >
      {percentile == null ? (
        <View style={styles.nq}>
          <Text style={styles.nqText}>—</Text>
        </View>
      ) : (
        <Animated.View style={[styles.fill, { width, backgroundColor: color }]}>
          <View style={[styles.bubble, { backgroundColor: color }]}>
            <Text style={styles.bubbleText}>{percentile}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function SectionBlock({ section, startDelay }: { section: SavantSection; startDelay: number }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name={ICONS[section.key]} size={16} color="#1A1A1A" />
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.sectionRule} />
      </View>
      {section.metrics.map((m, i) => (
        <View key={m.key} style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>
            {m.label}
          </Text>
          <View style={styles.barCol}>
            <PercentileBar percentile={m.percentile} delay={startDelay + i * 28} />
          </View>
          <Text style={styles.value}>{m.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function SavantPercentiles({
  season,
  sections,
}: {
  season: number;
  sections: SavantSection[];
}) {
  if (!sections.length) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{season} MLB Percentile Rankings</Text>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.tri, { borderBottomColor: '#2E59A7' }]} />
          <Text style={[styles.legendText, { color: '#2E59A7' }]}>POOR</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.tri, { borderBottomColor: '#8A8A8A' }]} />
          <Text style={[styles.legendText, { color: '#6A6A6A' }]}>AVERAGE</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.tri, { borderBottomColor: '#E31B23' }]} />
          <Text style={[styles.legendText, { color: '#E31B23' }]}>GREAT</Text>
        </View>
      </View>
      {sections.map((s, i) => (
        <SectionBlock
          key={s.key}
          section={s}
          startDelay={40 + sections.slice(0, i).reduce((n, x) => n + x.metrics.length, 0) * 28}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C5DDDE',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    color: '#1A1A1A',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 72,
    marginBottom: 12,
  },
  legendItem: { alignItems: 'center', gap: 2 },
  tri: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  legendText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 8,
    letterSpacing: 0.6,
  },
  section: { marginBottom: 10 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'DMSans_700Bold',
    color: '#1A1A1A',
    fontSize: 14,
  },
  sectionRule: {
    flex: 1,
    height: 2,
    backgroundColor: '#3D8E91',
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  label: {
    width: 118,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
    color: '#444',
    fontSize: 12,
  },
  barCol: { flex: 1, minWidth: 0 },
  track: {
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    overflow: 'visible',
  },
  fill: {
    height: 18,
    borderRadius: 9,
    minWidth: 18,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  bubble: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: {
    fontFamily: 'DMSans_700Bold',
    color: '#FFFFFF',
    fontSize: 8,
  },
  nq: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nqText: { fontFamily: 'DMSans_700Bold', color: '#9A9A9A', fontSize: 11 },
  value: {
    width: 40,
    textAlign: 'left',
    fontFamily: 'DMSans_500Medium',
    color: '#333',
    fontSize: 12,
  },
});
