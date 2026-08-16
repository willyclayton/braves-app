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

const ZONE_NAME: Record<string, string> = {
  '01': 'High in',
  '02': 'High',
  '03': 'High away',
  '04': 'In',
  '05': 'Middle',
  '06': 'Away',
  '07': 'Low in',
  '08': 'Low',
  '09': 'Low away',
  '11': 'Chase high in',
  '12': 'Chase high away',
  '13': 'Chase low in',
  '14': 'Chase low away',
};

type Props = {
  playerId: number;
  playerName: string;
  group: 'hitting' | 'pitching';
};

function cellById(metric: ZoneMetric, id: string) {
  return metric.cells.find((c) => c.id === id);
}

function ZoneBox({
  id,
  cell,
  metric,
  selected,
  onPress,
  chase,
}: {
  id: string;
  cell?: ZoneCell;
  metric: ZoneMetric;
  selected: boolean;
  onPress: () => void;
  chase?: boolean;
}) {
  const t = cell ? cellStrength(cell, metric, metric.cells) : 0.2;
  const empty = cell?.value == null;
  const bg = empty ? 'rgba(255,255,255,0.06)' : strengthColor(t);
  const label = Number(id) <= 9 ? String(Number(id)) : id;
  return (
    <Pressable
      onPress={onPress}
      style={[
        chase ? styles.chase : styles.cell,
        { backgroundColor: bg },
        selected && styles.cellOn,
      ]}
    >
      <Text style={[styles.cellId, chase && styles.chaseId]}>{label}</Text>
      <Text style={[styles.cellVal, chase && styles.chaseVal]} numberOfLines={1}>
        {cell?.display || '—'}
      </Text>
    </Pressable>
  );
}

export function StrikeZone({ playerId, playerName, group }: Props) {
  const [open, setOpen] = useState(group === 'pitching');
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

  const title = group === 'pitching' ? 'Pitcher strike zone' : 'Batter’s box';
  const hint = pitch
    ? `${pitch.name} · ${pitch.pct}% · ${pitch.velo} mph`
    : 'Catcher’s view';

  const picked = selected && metric ? cellById(metric, selected) : undefined;

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
                <View style={styles.tabRow}>
                  <Pressable
                    onPress={() => {
                      setPitchCode('ALL');
                      setMetricKey(data.metrics[0]?.key || null);
                      setSelected(null);
                    }}
                    style={[styles.tab, pitchCode === 'ALL' && styles.tabOn]}
                  >
                    <Text style={[styles.tabText, pitchCode === 'ALL' && styles.tabTextOn]}>
                      All
                    </Text>
                  </Pressable>
                  {data.pitchTypes.map((p) => (
                    <Pressable
                      key={p.code}
                      onPress={() => {
                        setPitchCode(p.code);
                        setMetricKey(p.metrics[0]?.key || data.metrics[0]?.key || null);
                        setSelected(null);
                      }}
                      style={[styles.tab, pitchCode === p.code && styles.tabOn]}
                    >
                      <Text
                        style={[styles.tabText, pitchCode === p.code && styles.tabTextOn]}
                      >
                        {p.code}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.tabRow}>
                {metricList.map((m) => (
                  <Pressable
                    key={m.key}
                    onPress={() => setMetricKey(m.key)}
                    style={[styles.tab, metric.key === m.key && styles.tabOn]}
                  >
                    <Text style={[styles.tabText, metric.key === m.key && styles.tabTextOn]}>
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.board}>
                <View style={styles.grid}>
                  <View style={styles.side}>
                    <ZoneBox
                      id="11"
                      cell={cellById(metric, '11')}
                      metric={metric}
                      selected={selected === '11'}
                      onPress={() => setSelected('11')}
                      chase
                    />
                    <View style={{ flex: 1 }} />
                    <ZoneBox
                      id="13"
                      cell={cellById(metric, '13')}
                      metric={metric}
                      selected={selected === '13'}
                      onPress={() => setSelected('13')}
                      chase
                    />
                  </View>

                  <View style={styles.center}>
                    <View style={styles.box}>
                      {[0, 1, 2].map((r) => (
                        <View key={r} style={styles.boxRow}>
                          {INNER.slice(r * 3, r * 3 + 3).map((id) => (
                            <ZoneBox
                              key={id}
                              id={id}
                              cell={cellById(metric, id)}
                              metric={metric}
                              selected={selected === id}
                              onPress={() => setSelected(id)}
                            />
                          ))}
                        </View>
                      ))}
                    </View>
                    <View style={styles.plate} />
                  </View>

                  <View style={styles.side}>
                    <ZoneBox
                      id="12"
                      cell={cellById(metric, '12')}
                      metric={metric}
                      selected={selected === '12'}
                      onPress={() => setSelected('12')}
                      chase
                    />
                    <View style={{ flex: 1 }} />
                    <ZoneBox
                      id="14"
                      cell={cellById(metric, '14')}
                      metric={metric}
                      selected={selected === '14'}
                      onPress={() => setSelected('14')}
                      chase
                    />
                  </View>
                </View>
              </View>

              <View style={styles.readout}>
                {picked ? (
                  <>
                    <Text style={styles.readName}>{ZONE_NAME[selected!] || 'Zone'}</Text>
                    <Text style={styles.readVal}>
                      {picked.display}
                      <Text style={styles.readMetric}>  {metric.label}</Text>
                    </Text>
                  </>
                ) : (
                  <Text style={styles.readHint}>
                    {pitch
                      ? metric.key === 'strikePct'
                        ? 'Red = more strikes'
                        : 'Red = they throw it there'
                      : group === 'pitching'
                        ? 'Red = pitcher strength'
                        : 'Red = strength'}
                  </Text>
                )}
                <View style={styles.legendBar}>
                  {['#1E4A7A', '#5B8FBF', '#C4A36A', '#E04A5A', '#C41E3A'].map((c) => (
                    <View key={c} style={[styles.legendSeg, { backgroundColor: c }]} />
                  ))}
                </View>
              </View>
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
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tabOn: { backgroundColor: 'rgba(234, 170, 0, 0.18)' },
  tabText: { fontFamily: 'DMSans_700Bold', color: colors.mistDim, fontSize: 13 },
  tabTextOn: { color: colors.gold },
  board: {
    backgroundColor: '#0C1220',
    borderRadius: 12,
    padding: 10,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  side: {
    width: 58,
    justifyContent: 'space-between',
  },
  center: { flex: 1 },
  box: {
    aspectRatio: 1,
    borderWidth: 2.5,
    borderColor: colors.cream,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: colors.cream,
  },
  boxRow: { flex: 1, flexDirection: 'row', gap: 2 },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chase: {
    height: 52,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellOn: {
    borderColor: colors.gold,
  },
  cellId: {
    fontFamily: 'DMSans_700Bold',
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  chaseId: { fontSize: 9 },
  cellVal: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 16,
    marginTop: 1,
  },
  chaseVal: { fontSize: 13 },
  plate: {
    alignSelf: 'center',
    width: 36,
    height: 14,
    marginTop: 8,
    backgroundColor: colors.cream,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  readout: {
    marginTop: 12,
    alignItems: 'center',
    gap: 6,
  },
  readName: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 13,
  },
  readVal: {
    fontFamily: 'DMSans_700Bold',
    color: colors.cream,
    fontSize: 22,
  },
  readMetric: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 14,
  },
  readHint: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
  },
  legendBar: {
    width: 88,
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  legendSeg: { flex: 1 },
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
