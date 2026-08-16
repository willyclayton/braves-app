import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Polygon,
  ClipPath,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { colors, spacing } from '@/constants/theme';
import type { WindowKey } from '@/data/braves';
import { WINDOW_LABELS } from '@/data/braves';
import {
  filterSprayByDates,
  summarizeSpray,
  thirdPercents,
  wallDistance,
  type FieldThird,
  type PlayerSpray,
  type SprayEvent,
} from '@/lib/spray';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const SPRAY_MS = 1700;

const VB_W = 300;
const VB_H = 292;
const CX = 150;
const HY = 258;
const SCALE = 0.5;

type Mode = 'hits' | 'hr';
type Scope = 'season' | 'window';
type Pt = { x: number; y: number };

type Props = {
  playerId: number;
  playerName: string;
  group: 'hitting' | 'pitching';
  windowKey: WindowKey;
  windowDates: string[];
};

function toSvg(feetX: number, feetY: number): Pt {
  return { x: CX + feetX * SCALE, y: HY - feetY * SCALE };
}

function polar(angleDeg: number, dist: number): Pt {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.sin(rad) * dist, y: Math.cos(rad) * dist };
}

function wedgePath(a0: number, a1: number) {
  const steps = 12;
  const pts: Pt[] = [toSvg(0, 0)];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const p = polar(a, wallDistance(a) - 3);
    pts.push(toSvg(p.x, p.y));
  }
  pts.push(toSvg(0, 0));
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
}

function wedgeAnchor(a0: number, a1: number): Pt {
  const a = (a0 + a1) / 2;
  const p = polar(a, Math.min(255, wallDistance(a) - 70));
  return toSvg(p.x, p.y);
}

function fairClipPath() {
  const steps = 18;
  const pts: Pt[] = [toSvg(0, 0)];
  for (let i = 0; i <= steps; i++) {
    const a = -45 + (90 * i) / steps;
    const p = polar(a, wallDistance(a));
    pts.push(toSvg(p.x, p.y));
  }
  pts.push(toSvg(0, 0));
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
}

function wallPath() {
  const steps = 18;
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = -45 + (90 * i) / steps;
    const p = polar(a, wallDistance(a));
    pts.push(toSvg(p.x, p.y));
  }
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

function infieldDirtPath() {
  const home = toSvg(0, 0);
  const first = toSvg(63.6, 63.6);
  const second = toSvg(0, 127.3);
  const third = toSvg(-63.6, 63.6);
  return `M ${home.x} ${home.y} L ${first.x} ${first.y} L ${second.x} ${second.y} L ${third.x} ${third.y} Z`;
}

function infieldGrassPath() {
  const first = toSvg(48, 68);
  const second = toSvg(0, 104);
  const third = toSvg(-48, 68);
  const cut = toSvg(0, 52);
  return `M ${first.x} ${first.y} L ${second.x} ${second.y} L ${third.x} ${third.y} Q ${cut.x} ${cut.y} ${first.x} ${first.y} Z`;
}

const THIRDS = {
  pull: { color: '206, 17, 65', label: 'PULL' },
  center: { color: '234, 170, 0', label: 'CENTER' },
  oppo: { color: '46, 196, 182', label: 'OPPO' },
} as const;

function hrArc(ev: SprayEvent) {
  const home = toSvg(0, 4);
  const land = toSvg(ev.x, ev.y);
  const lift = 20 + Math.min(46, Math.max(8, ((ev.la ?? 28) / 45) * 42));
  const ctrl = {
    x: (home.x + land.x) / 2,
    y: (home.y + land.y) / 2 - lift,
  };
  const flat = Math.hypot(land.x - home.x, land.y - home.y);
  return {
    home,
    land,
    ctrl,
    d: `M ${home.x} ${home.y} Q ${ctrl.x} ${ctrl.y} ${land.x} ${land.y}`,
    len: Math.max(80, flat + lift * 0.9),
  };
}

function quadAt(t: number, a: Pt, c: Pt, b: Pt): Pt {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

function FieldBase({ clipId }: { clipId: string }) {
  const fair = fairClipPath();
  const mound = toSvg(0, 60.5);

  return (
    <G>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={fair} />
        </ClipPath>
        <RadialGradient id={`${clipId}-grass`} cx="50%" cy="62%" r="55%">
          <Stop offset="0" stopColor="#1F4A38" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#10281F" stopOpacity="1" />
        </RadialGradient>
      </Defs>
      <Path d={fair} fill={`url(#${clipId}-grass)`} />
      <Path d={infieldDirtPath()} fill="#7A5A36" fillOpacity={0.92} clipPath={`url(#${clipId})`} />
      <Path d={infieldGrassPath()} fill="#245C40" clipPath={`url(#${clipId})`} />
      <Circle cx={mound.x} cy={mound.y} r={9} fill="#8A6840" />
      <Circle cx={mound.x} cy={mound.y} r={2.2} fill={colors.cream} fillOpacity={0.7} />
    </G>
  );
}

function FieldMarks() {
  const wall = wallPath();
  const lf = toSvg(polar(-45, wallDistance(-45)).x, polar(-45, wallDistance(-45)).y);
  const rf = toSvg(polar(45, wallDistance(45)).x, polar(45, wallDistance(45)).y);
  const home = toSvg(0, 0);
  const b1 = toSvg(63.6, 63.6);
  const b2 = toSvg(0, 127.3);
  const b3 = toSvg(-63.6, 63.6);

  return (
    <G>
      <Line
        x1={home.x}
        y1={home.y}
        x2={lf.x}
        y2={lf.y}
        stroke="rgba(245,240,232,0.55)"
        strokeWidth={1.2}
      />
      <Line
        x1={home.x}
        y1={home.y}
        x2={rf.x}
        y2={rf.y}
        stroke="rgba(245,240,232,0.55)"
        strokeWidth={1.2}
      />
      <Path d={wall} fill="none" stroke="rgba(245,240,232,0.62)" strokeWidth={2.2} />
      {[b1, b2, b3].map((b, i) => (
        <Polygon
          key={i}
          points={`${b.x},${b.y - 3.4} ${b.x + 3.4},${b.y} ${b.x},${b.y + 3.4} ${b.x - 3.4},${b.y}`}
          fill={colors.cream}
        />
      ))}
      <Polygon
        points={`${home.x},${home.y + 4} ${home.x + 5},${home.y - 1} ${home.x},${home.y - 5} ${home.x - 5},${home.y - 1}`}
        fill={colors.white}
      />
    </G>
  );
}

function HitsHeat({
  stand,
  events,
  clipId,
  progress,
}: {
  stand: PlayerSpray['stand'];
  events: SprayEvent[];
  clipId: string;
  progress: Animated.Value;
}) {
  const thirds = thirdPercents(events, stand);
  const max = Math.max(thirds.pull, thirds.center, thirds.oppo, 1);
  const leftKey: FieldThird = stand === 'L' ? 'oppo' : 'pull';
  const rightKey: FieldThird = stand === 'L' ? 'pull' : 'oppo';
  const wedges: { key: FieldThird; a0: number; a1: number; pct: number }[] = [
    { key: leftKey, a0: -45, a1: -12, pct: thirds[leftKey] },
    { key: 'center', a0: -12, a1: 12, pct: thirds.center },
    { key: rightKey, a0: 12, a1: 45, pct: thirds[rightKey] },
  ];
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  return (
    <AnimatedG clipPath={`url(#${clipId})`} opacity={opacity}>
      {wedges.map((w) => {
        const t = w.pct / max;
        return (
          <Path
            key={w.key}
            d={wedgePath(w.a0, w.a1)}
            fill={`rgba(${THIRDS[w.key].color}, ${0.22 + t * 0.55})`}
            stroke="rgba(11,20,38,0.35)"
            strokeWidth={1}
          />
        );
      })}
    </AnimatedG>
  );
}

function ThirdLabels({
  stand,
  events,
  width,
  height,
  progress,
}: {
  stand: PlayerSpray['stand'];
  events: SprayEvent[];
  width: number;
  height: number;
  progress: Animated.Value;
}) {
  const thirds = thirdPercents(events, stand);
  const leftKey: FieldThird = stand === 'L' ? 'oppo' : 'pull';
  const rightKey: FieldThird = stand === 'L' ? 'pull' : 'oppo';
  const wedges: { key: FieldThird; a0: number; a1: number; pct: number }[] = [
    { key: leftKey, a0: -45, a1: -12, pct: thirds[leftKey] },
    { key: 'center', a0: -12, a1: 12, pct: thirds.center },
    { key: rightKey, a0: 12, a1: 45, pct: thirds[rightKey] },
  ];
  const opacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });
  return (
    <>
      {wedges.map((w) => {
        const p = wedgeAnchor(w.a0, w.a1);
        return (
          <Animated.View
            key={w.key}
            pointerEvents="none"
            style={[
              styles.zoneTag,
              {
                left: (p.x / VB_W) * width - 36,
                top: (p.y / VB_H) * height - 28,
                opacity,
              },
            ]}
          >
            <Text style={styles.zoneName}>{THIRDS[w.key].label}</Text>
            <Text style={styles.zonePct}>{w.pct}%</Text>
          </Animated.View>
        );
      })}
    </>
  );
}

function ScopeDropdown({
  scope,
  onChange,
  windowLabel,
  windowDisabled,
}: {
  scope: Scope;
  onChange: (s: Scope) => void;
  windowLabel: string;
  windowDisabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = scope === 'season' ? 'Season' : windowLabel;
  return (
    <View style={styles.dropWrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[styles.dropBtn, open && styles.dropBtnOn]}
        accessibilityRole="button"
        accessibilityLabel="Spray sample range"
      >
        <Text style={styles.dropBtnText}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mist} />
      </Pressable>
      {open ? (
        <View style={styles.dropMenu}>
          <Pressable
            onPress={() => {
              onChange('season');
              setOpen(false);
            }}
            style={[styles.dropItem, scope === 'season' && styles.dropItemOn]}
          >
            <Text style={[styles.dropItemText, scope === 'season' && styles.dropItemTextOn]}>
              Season
            </Text>
          </Pressable>
          <Pressable
            disabled={windowDisabled}
            onPress={() => {
              onChange('window');
              setOpen(false);
            }}
            style={[styles.dropItem, scope === 'window' && styles.dropItemOn]}
          >
            <Text
              style={[
                styles.dropItemText,
                scope === 'window' && styles.dropItemTextOn,
                windowDisabled && styles.dropItemDisabled,
              ]}
            >
              {windowLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function HrStage({
  homers,
  progress,
  clipId,
}: {
  homers: SprayEvent[];
  progress: Animated.Value;
  clipId: string;
}) {
  const arcs = useMemo(() => homers.map((hr) => hrArc(hr)), [homers]);
  const [balls, setBalls] = useState<Pt[]>(() => arcs.map((a) => a.home));

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      setBalls(arcs.map((a) => quadAt(value, a.home, a.ctrl, a.land)));
    });
    return () => progress.removeListener(id);
  }, [arcs, progress]);

  const landOp = progress.interpolate({
    inputRange: [0.72, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <G clipPath={`url(#${clipId})`}>
      {arcs.map((a, i) => (
        <AnimatedPath
          key={`${homers[i].date}-${homers[i].gamePk || i}`}
          d={a.d}
          fill="none"
          stroke={colors.gold}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeOpacity={0.82}
          strokeDasharray={[a.len, a.len]}
          strokeDashoffset={progress.interpolate({
            inputRange: [0, 1],
            outputRange: [a.len, 0],
          })}
        />
      ))}
      {balls.map((b, i) => (
        <Circle
          key={`ball-${i}`}
          cx={b.x}
          cy={b.y}
          r={3.4}
          fill={colors.white}
          stroke={colors.gold}
          strokeWidth={1}
        />
      ))}
      {arcs.map((a, i) => (
        <AnimatedCircle
          key={`land-${i}`}
          cx={a.land.x}
          cy={a.land.y}
          r={3.6}
          fill={colors.scarlet}
          opacity={landOp}
        />
      ))}
    </G>
  );
}

export function SprayChart({
  playerId,
  playerName,
  group,
  windowKey,
  windowDates,
}: Props) {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<Mode>('hits');
  const [scope, setScope] = useState<Scope>('season');
  const [width, setWidth] = useState(320);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spray, setSpray] = useState<PlayerSpray | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const clipId = `fair-${playerId}-${group}`;

  const load = useCallback(async () => {
    if (spray || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/player/${playerId}?group=${group}&view=spray`);
      if (!res.ok) throw new Error('Spray data unavailable');
      const json = (await res.json()) as PlayerSpray;
      setSpray(json);
    } catch (e: any) {
      setError(e.message || 'Failed to load spray chart');
    } finally {
      setLoading(false);
    }
  }, [group, loading, playerId, spray]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  const events = useMemo(() => {
    if (!spray) return [];
    return scope === 'window' ? filterSprayByDates(spray.events, windowDates) : spray.events;
  }, [scope, spray, windowDates]);

  const homers = useMemo(() => events.filter((e) => e.result === 'home_run'), [events]);
  const summary = useMemo(
    () => summarizeSpray(events, spray?.stand || 'R'),
    [events, spray?.stand]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 1) setWidth(w);
  };

  useEffect(() => {
    if (!open || loading || !spray) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: SPRAY_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [open, loading, spray, mode, scope, events.length, replayKey, progress]);

  const height = Math.round(width * (VB_H / VB_W));
  const windowLabel = WINDOW_LABELS[windowKey];
  const isPitcher = group === 'pitching';
  const title = isPitcher ? 'Hits allowed spray' : 'Spray chart';
  const hitsLabel = isPitcher ? 'Hits' : 'Hits';
  const hrLabel = isPitcher ? 'HR allowed' : 'Home runs';
  const rangeNote = scope === 'window' ? windowLabel : 'Season';
  const avgHrDist = homers.length
    ? Math.round(
        homers.reduce((s, h) => s + (h.dist || Math.hypot(h.x, h.y)), 0) / homers.length
      )
    : 0;

  const hitCaption =
    mode === 'hits'
      ? `${events.length} hit${events.length === 1 ? '' : 's'} · ${summary.pull}% pull · ${summary.center}% mid · ${summary.oppo}% oppo`
      : homers.length
        ? `${homers.length} home run${homers.length === 1 ? '' : 's'} · ${avgHrDist} ft avg`
        : 'No home runs in this sample';

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
            {playerName} · {rangeNote} · fair-territory contact
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.gold}
        />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          <View style={styles.controls}>
            <ScopeDropdown
              scope={scope}
              onChange={setScope}
              windowLabel={windowLabel}
              windowDisabled={!windowDates.length}
            />
            <View style={styles.segRow}>
              <Pressable
                onPress={() => setMode('hits')}
                style={[styles.seg, mode === 'hits' && styles.segOn]}
              >
                <Text style={[styles.segText, mode === 'hits' && styles.segTextOn]}>{hitsLabel}</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('hr')}
                style={[styles.seg, mode === 'hr' && styles.segOn]}
              >
                <Text style={[styles.segText, mode === 'hr' && styles.segTextOn]}>{hrLabel}</Text>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 36 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <>
              <View style={[styles.field, { height }]} onLayout={onLayout}>
                <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                  <FieldBase clipId={clipId} />
                  {mode === 'hits' ? (
                    <HitsHeat
                      stand={spray?.stand || 'R'}
                      events={events}
                      clipId={clipId}
                      progress={progress}
                    />
                  ) : null}
                  {mode === 'hr' ? (
                    <HrStage homers={homers} progress={progress} clipId={clipId} />
                  ) : null}
                  <FieldMarks />
                </Svg>
                {mode === 'hits' ? (
                  <ThirdLabels
                    stand={spray?.stand || 'R'}
                    events={events}
                    width={width}
                    height={height}
                    progress={progress}
                  />
                ) : null}
                {events.length ? (
                  <Pressable
                    onPress={() => setReplayKey((k) => k + 1)}
                    style={styles.playBtn}
                    accessibilityLabel="Replay spray animation"
                  >
                    <Ionicons name="refresh" size={14} color={colors.navy} />
                  </Pressable>
                ) : null}
              </View>

              {mode === 'hits' && events.length ? (
                <View style={styles.thirdRow}>
                  {(
                    [
                      ['pull', summary.pull, colors.scarlet],
                      ['center', summary.center, colors.gold],
                      ['oppo', summary.oppo, '#2EC4B6'],
                    ] as const
                  ).map(([key, pct, color]) => (
                    <View key={key} style={styles.thirdCard}>
                      <Text style={[styles.thirdName, { color }]}>{THIRDS[key].label}</Text>
                      <Text style={styles.thirdPct}>{pct}%</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={styles.caption}>{hitCaption}</Text>

              {mode === 'hits' && events.length ? (
                <Text style={styles.footnote}>
                  Percent of {events.length} hits{isPitcher ? ' allowed' : ''} · {summary.singles}{' '}
                  singles · {summary.doubles} doubles · {summary.triples} triples · {summary.homers}{' '}
                  HR.
                </Text>
              ) : null}
              {mode === 'hr' && homers.length ? (
                <Text style={styles.footnote}>
                  All {homers.length} flight paths play together from Statcast landing spots.
                </Text>
              ) : null}
              {mode === 'hits' && !events.length ? (
                <Text style={styles.empty}>No hits in this sample.</Text>
              ) : null}
              {mode === 'hr' && !homers.length ? (
                <Text style={styles.empty}>No home runs in this sample.</Text>
              ) : null}
            </>
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
    overflow: 'visible',
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
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
    zIndex: 4,
  },
  dropWrap: {
    position: 'relative',
    zIndex: 5,
  },
  dropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.navyLift,
  },
  dropBtnOn: {
    borderColor: colors.gold,
  },
  dropBtnText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.cream,
    fontSize: 13,
  },
  dropMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    minWidth: 120,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.navyMid,
    overflow: 'hidden',
    zIndex: 8,
  },
  dropItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropItemOn: {
    backgroundColor: colors.scarlet,
  },
  dropItemText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    fontSize: 13,
  },
  dropItemTextOn: { color: colors.white },
  dropItemDisabled: { opacity: 0.4 },
  segRow: { flexDirection: 'row', gap: 6 },
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
  field: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#0C1A14',
    overflow: 'hidden',
    position: 'relative',
  },
  zoneTag: {
    position: 'absolute',
    minWidth: 72,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(11, 20, 38, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(245, 240, 232, 0.22)',
  },
  zoneName: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  zonePct: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 28,
    letterSpacing: 0.4,
    lineHeight: 30,
    marginTop: 1,
  },
  thirdRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  thirdCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.navyLift,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  thirdName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  thirdPct: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 32,
    lineHeight: 34,
    marginTop: 2,
  },
  playBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  error: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
