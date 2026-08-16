import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { colors, spacing } from '@/constants/theme';
import {
  cellStrength,
  strengthColor,
  type PlayerZone,
  type ZoneCell,
  type ZoneMetric,
} from '@/lib/zone';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const INNER = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];

type Props = {
  playerId: number;
  playerName: string;
  group: 'hitting' | 'pitching';
};

function cellById(metric: ZoneMetric, id: string) {
  return metric.cells.find((c) => c.id === id);
}

function ZoneBox({
  cell,
  metric,
  selected,
  onPress,
  flex,
  tall,
}: {
  cell?: ZoneCell;
  metric: ZoneMetric;
  selected: boolean;
  onPress: () => void;
  flex?: number;
  tall?: boolean;
}) {
  const t = cell ? cellStrength(cell, metric, metric.cells) : 0.2;
  const bg = cell?.value == null ? 'rgba(255,255,255,0.06)' : strengthColor(t);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cell,
        tall && styles.cellTall,
        { flex: flex ?? 1, backgroundColor: bg },
        selected && styles.cellOn,
      ]}
    >
      <Text style={styles.cellVal}>{cell?.display || '—'}</Text>
    </Pressable>
  );
}

export function StrikeZone({ playerId, playerName, group }: Props) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlayerZone | null>(null);
  const [metricKey, setMetricKey] = useState<string | null>(null);
  const [pitchCode, setPitchCode] = useState<string>('ALL');
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (data || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/player/${playerId}?group=${group}&view=zone`);
      if (!res.ok) throw new Error('Strike zone unavailable');
      const json = (await res.json()) as PlayerZone;
      setData(json);
      setMetricKey(json.metrics[0]?.key || null);
    } catch (e: any) {
      setError(e.message || 'Failed to load strike zone');
    } finally {
      setLoading(false);
    }
  }, [data, group, loading, playerId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  const pitch = data?.pitchTypes.find((p) => p.code === pitchCode);
  const metricList = pitch?.metrics.length ? pitch.metrics : data?.metrics || [];
  const metric = useMemo(
    () => metricList.find((m) => m.key === metricKey) || metricList[0],
    [metricList, metricKey]
  );

  const title = group === 'pitching' ? 'Pitcher strike zone' : 'Batter strike zone';
  const hint =
    group === 'pitching'
      ? pitch
        ? metric?.key === 'strikePct'
          ? 'Catcher’s view · red = more strikes'
          : 'Catcher’s view · red = they throw it there'
        : 'Catcher’s view · red = strength (weak contact)'
      : 'Catcher’s view · red = strength';

  const detail = (() => {
    const bits: string[] = [];
    if (pitch) bits.push(`${pitch.name} · ${pitch.pct}% · ${pitch.velo} mph`);
    if (selected && metric) {
      const cell = cellById(metric, selected);
      const where =
        Number(selected) <= 9 ? `Zone ${Number(selected)}` : `Chase ${selected}`;
      bits.push(`${where} · ${metric.label} ${cell?.display || '—'}`);
    } else if (metric && !pitch) {
      bits.push(`Tap a square · ${metric.label} by zone`);
    } else if (metric) {
      bits.push(`Tap a square · ${metric.label}`);
    }
    return bits.join(' · ');
  })();

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggleOpen}
        style={styles.head}
        accessibilityRole="button"
        accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${title}`}
      >
        <View style={styles.headText}>
          <Text style={styles.kicker}>{title.toUpperCase()}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {playerName} · {hint}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.gold} />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 36 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : metric ? (
            <>
              {group === 'pitching' && data?.pitchTypes.length ? (
                <View style={styles.segRow}>
                  <Pressable
                    onPress={() => {
                      setPitchCode('ALL');
                      setMetricKey(data.metrics[0]?.key || null);
                    }}
                    style={[styles.seg, pitchCode === 'ALL' && styles.segOn]}
                  >
                    <Text style={[styles.segText, pitchCode === 'ALL' && styles.segTextOn]}>
                      All
                    </Text>
                  </Pressable>
                  {data.pitchTypes.map((p) => (
                    <Pressable
                      key={p.code}
                      onPress={() => {
                        setPitchCode(p.code);
                        setMetricKey(p.metrics[0]?.key || data.metrics[0]?.key || null);
                      }}
                      style={[styles.seg, pitchCode === p.code && styles.segOn]}
                    >
                      <Text
                        style={[styles.segText, pitchCode === p.code && styles.segTextOn]}
                      >
                        {p.code}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.segRow}>
                {metricList.map((m) => (
                  <Pressable
                    key={m.key}
                    onPress={() => setMetricKey(m.key)}
                    style={[styles.seg, metric.key === m.key && styles.segOn]}
                  >
                    <Text style={[styles.segText, metric.key === m.key && styles.segTextOn]}>
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.board}>
                <View style={styles.row}>
                  <ZoneBox
                    cell={cellById(metric, '11')}
                    metric={metric}
                    selected={selected === '11'}
                    onPress={() => setSelected('11')}
                  />
                  <View style={{ flex: 2 }} />
                  <ZoneBox
                    cell={cellById(metric, '12')}
                    metric={metric}
                    selected={selected === '12'}
                    onPress={() => setSelected('12')}
                  />
                </View>
                <View style={styles.inner}>
                  {[0, 1, 2].map((r) => (
                    <View key={r} style={styles.row}>
                      {INNER.slice(r * 3, r * 3 + 3).map((id) => (
                        <ZoneBox
                          key={id}
                          cell={cellById(metric, id)}
                          metric={metric}
                          selected={selected === id}
                          onPress={() => setSelected(id)}
                          tall
                        />
                      ))}
                    </View>
                  ))}
                </View>
                <View style={styles.row}>
                  <ZoneBox
                    cell={cellById(metric, '13')}
                    metric={metric}
                    selected={selected === '13'}
                    onPress={() => setSelected('13')}
                  />
                  <View style={styles.plateWrap}>
                    <View style={styles.plate} />
                  </View>
                  <ZoneBox
                    cell={cellById(metric, '14')}
                    metric={metric}
                    selected={selected === '14'}
                    onPress={() => setSelected('14')}
                  />
                </View>
              </View>

              <View style={styles.legend}>
                <Text style={[styles.legendLabel, { color: '#1E4A7A' }]}>WEAK</Text>
                <View style={styles.legendBar}>
                  {['#1E4A7A', '#5B8FBF', '#C4A36A', '#E04A5A', '#C41E3A'].map((c) => (
                    <View key={c} style={[styles.legendSeg, { backgroundColor: c }]} />
                  ))}
                </View>
                <Text style={[styles.legendLabel, { color: '#C41E3A' }]}>STRONG</Text>
              </View>

              <Text style={styles.caption}>{detail}</Text>
              <Text style={styles.footnote}>
                {group === 'pitching'
                  ? 'All = results vs MLB. A pitch type shows where they throw it (Use%) and Strike%. Tap a square.'
                  : 'Season hot/cold zones. Tap a square for that box.'}
              </Text>
            </>
          ) : (
            <Text style={styles.empty}>No strike-zone data.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: 'rgba(26, 47, 85, 0.55)',
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  headText: { flex: 1, minWidth: 0 },
  kicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1.3,
  },
  sub: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
    marginTop: 3,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  segRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  seg: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  segOn: { backgroundColor: colors.scarlet, borderColor: colors.scarlet },
  segText: { fontFamily: 'DMSans_700Bold', color: colors.mist, fontSize: 13 },
  segTextOn: { color: colors.white },
  board: {
    backgroundColor: '#0C1220',
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  row: { flexDirection: 'row', gap: 6 },
  inner: {
    borderWidth: 2,
    borderColor: colors.cream,
    borderRadius: 8,
    padding: 5,
    gap: 5,
    backgroundColor: 'rgba(245,240,232,0.04)',
  },
  cell: {
    minHeight: 36,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTall: { minHeight: 48 },
  cellOn: {
    borderWidth: 2,
    borderColor: colors.gold,
  },
  cellVal: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 12,
  },
  plateWrap: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  plate: {
    width: 28,
    height: 16,
    backgroundColor: colors.cream,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    transform: [{ rotate: '180deg' }],
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  legendLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    letterSpacing: 1.1,
  },
  legendBar: {
    flex: 1,
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  legendSeg: { flex: 1 },
  caption: {
    fontFamily: 'DMSans_500Medium',
    color: colors.cream,
    fontSize: 13,
    marginTop: 10,
  },
  footnote: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    textAlign: 'center',
    paddingVertical: 20,
  },
  error: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
