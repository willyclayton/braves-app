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
import { colors, radii, spacing } from '@/constants/theme';
import type { WindowKey } from '@/data/braves';
import { WINDOW_LABELS } from '@/data/braves';
import {
  SPRAY_ZONES,
  filterSprayByDates,
  summarizeSpray,
  wallDistance,
  zoneCounts,
  type PlayerSpray,
  type SprayEvent,
  type SprayZone,
} from '@/lib/spray';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

function sectorPath(zone: SprayZone) {
  const steps = 10;
  const inner: Pt[] = [];
  const outer: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = zone.a0 + ((zone.a1 - zone.a0) * i) / steps;
    const wall = wallDistance(a);
    const ri = Math.min(zone.r0, wall);
    const ro = Math.min(zone.r1, wall - 2);
    inner.push(toSvg(polar(a, ri).x, polar(a, ri).y));
    outer.push(toSvg(polar(a, ro).x, polar(a, ro).y));
  }
  const pts = [...inner, ...outer.reverse()];
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
}

function zoneAnchor(zone: SprayZone): Pt {
  const a = (zone.a0 + zone.a1) / 2;
  const wall = wallDistance(a);
  const r = Math.min((zone.r0 + zone.r1) / 2, wall - 18);
  return toSvg(polar(a, r).x, polar(a, r).y);
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

function heatFill(count: number, max: number) {
  if (!count || max < 1) return 'rgba(255,255,255,0.03)';
  const t = count / max;
  if (t < 0.34) return `rgba(46, 196, 182, ${0.16 + t * 0.55})`;
  if (t < 0.67) return `rgba(234, 170, 0, ${0.28 + t * 0.42})`;
  return `rgba(206, 17, 65, ${0.4 + t * 0.38})`;
}

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
  const wall = wallPath();
  const lf = toSvg(polar(-45, wallDistance(-45)).x, polar(-45, wallDistance(-45)).y);
  const rf = toSvg(polar(45, wallDistance(45)).x, polar(45, wallDistance(45)).y);
  const home = toSvg(0, 0);
  const mound = toSvg(0, 60.5);
  const b1 = toSvg(63.6, 63.6);
  const b2 = toSvg(0, 127.3);
  const b3 = toSvg(-63.6, 63.6);

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

function HitsHeat({ events, clipId }: { events: SprayEvent[]; clipId: string }) {
  const counts = zoneCounts(events);
  const max = Math.max(1, ...SPRAY_ZONES.map((z) => counts[z.key]));
  return (
    <G clipPath={`url(#${clipId})`}>
      {SPRAY_ZONES.map((z) => (
        <Path
          key={z.key}
          d={sectorPath(z)}
          fill={heatFill(counts[z.key], max)}
          stroke="rgba(11,20,38,0.25)"
          strokeWidth={0.8}
        />
      ))}
    </G>
  );
}

function ZoneLabels({ events }: { events: SprayEvent[] }) {
  const counts = zoneCounts(events);
  return (
    <>
      {SPRAY_ZONES.map((z) => {
        const n = counts[z.key];
        if (!n) return null;
        const p = zoneAnchor(z);
        return (
          <View
            key={z.key}
            pointerEvents="none"
            style={[
              styles.zoneTag,
              {
                left: (p.x / VB_W) * 100 + '%',
                top: (p.y / VB_H) * 100 + '%',
              },
            ]}
          >
            <Text style={styles.zoneTagText}>
              {z.label} {n}
            </Text>
          </View>
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
  playing,
  clipId,
  onIndex,
}: {
  homers: SprayEvent[];
  playing: boolean;
  clipId: string;
  onIndex: (i: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const [ball, setBall] = useState<Pt | null>(null);
  const current = homers[index];
  const arc = current ? hrArc(current) : null;

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      const live = homers[index] ? hrArc(homers[index]) : null;
      if (!live) return;
      setBall(quadAt(value, live.home, live.ctrl, live.land));
    });
    return () => progress.removeListener(id);
  }, [homers, index, progress]);

  useEffect(() => {
    if (!playing || !homers.length) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let anim: Animated.CompositeAnimation | undefined;
    let i = 0;
    setIndex(0);
    onIndex(0);

    const run = (next: number) => {
      if (cancelled) return;
      i = next;
      setIndex(next);
      onIndex(next);
      const a = hrArc(homers[next]);
      progress.setValue(0);
      setBall(a.home);
      anim = Animated.timing(progress, {
        toValue: 1,
        duration: 1450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      anim.start(({ finished }) => {
        if (!finished || cancelled) return;
        timer = setTimeout(() => run((next + 1) % homers.length), 520);
      });
    };

    run(0);
    return () => {
      cancelled = true;
      anim?.stop();
      if (timer) clearTimeout(timer);
    };
  }, [playing, homers, onIndex, progress]);

  const dash = arc
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [arc.len, 0],
      })
    : 0;

  const landed = homers.slice(0, index);

  return (
    <>
      <G clipPath={`url(#${clipId})`}>
        {landed.map((hr, i) => {
          const a = hrArc(hr);
          return (
            <G key={`${hr.date}-${hr.gamePk || i}-done`}>
              <Path d={a.d} fill="none" stroke="rgba(234,170,0,0.28)" strokeWidth={1.6} />
              <Circle cx={a.land.x} cy={a.land.y} r={3.2} fill={colors.scarlet} fillOpacity={0.85} />
            </G>
          );
        })}
        {arc ? (
          <>
            <Line
              x1={arc.home.x}
              y1={arc.home.y}
              x2={arc.land.x}
              y2={arc.land.y}
              stroke="rgba(245,240,232,0.16)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <AnimatedPath
              d={arc.d}
              fill="none"
              stroke={colors.gold}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeDasharray={[arc.len, arc.len]}
              strokeDashoffset={dash}
            />
            {ball ? (
              <AnimatedCircle
                cx={ball.x}
                cy={ball.y}
                r={4.2}
                fill={colors.white}
                stroke={colors.gold}
                strokeWidth={1.4}
              />
            ) : null}
          </>
        ) : null}
      </G>
    </>
  );
}

export function SprayChart({
  playerId,
  playerName,
  group,
  windowKey,
  windowDates,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('hits');
  const [scope, setScope] = useState<Scope>('season');
  const [width, setWidth] = useState(320);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spray, setSpray] = useState<PlayerSpray | null>(null);
  const [playing, setPlaying] = useState(true);
  const [hrIndex, setHrIndex] = useState(0);
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

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => {
      const next = !v;
      if (next) load();
      return next;
    });
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

  const height = Math.round(width * (VB_H / VB_W));
  const windowLabel = WINDOW_LABELS[windowKey];
  const isPitcher = group === 'pitching';
  const title = isPitcher ? 'Hits allowed spray' : 'Spray chart';
  const hitsLabel = isPitcher ? 'Hits' : 'Hits';
  const hrLabel = isPitcher ? 'HR allowed' : 'Home runs';
  const rangeNote = scope === 'window' ? windowLabel : 'Season';

  const currentHr = homers[hrIndex];
  const hitCaption =
    mode === 'hits'
      ? `${events.length} hit${events.length === 1 ? '' : 's'} · ${summary.pull}% pull · ${summary.center}% mid · ${summary.oppo}% oppo`
      : currentHr
        ? [
            currentHr.date.slice(5),
            currentHr.dist ? `${currentHr.dist} ft` : null,
            currentHr.ev ? `${currentHr.ev} mph` : null,
            currentHr.la != null ? `${currentHr.la}°` : null,
            `${hrIndex + 1}/${homers.length}`,
          ]
            .filter(Boolean)
            .join(' · ')
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
                  {mode === 'hits' ? <HitsHeat events={events} clipId={clipId} /> : null}
                  {mode === 'hr' ? (
                    <HrStage
                      key={`${scope}-${homers.length}`}
                      homers={homers}
                      playing={playing}
                      clipId={clipId}
                      onIndex={setHrIndex}
                    />
                  ) : null}
                </Svg>
                {mode === 'hits' ? <ZoneLabels events={events} /> : null}
                {mode === 'hr' && homers.length ? (
                  <Pressable
                    onPress={() => setPlaying((v) => !v)}
                    style={styles.playBtn}
                    accessibilityLabel={playing ? 'Pause home run flights' : 'Play home run flights'}
                  >
                    <Ionicons
                      name={playing ? 'pause' : 'play'}
                      size={14}
                      color={colors.navy}
                    />
                  </Pressable>
                ) : null}
              </View>

              {mode === 'hits' && events.length ? (
                <View style={styles.legend}>
                  <Text style={[styles.legendLabel, { color: '#2EC4B6' }]}>FEW</Text>
                  <View style={styles.legendBar}>
                    {['#2EC4B6', '#7ED9C8', '#EAAA00', '#E07A2A', '#CE1141'].map((c) => (
                      <View key={c} style={[styles.legendSeg, { backgroundColor: c }]} />
                    ))}
                  </View>
                  <Text style={[styles.legendLabel, { color: colors.scarlet }]}>MANY</Text>
                </View>
              ) : null}

              <Text style={styles.caption}>{hitCaption}</Text>

              {mode === 'hits' && events.length ? (
                <Text style={styles.footnote}>
                  {summary.singles} singles · {summary.doubles} doubles · {summary.triples} triples
                  · {summary.homers} HR{isPitcher ? ' allowed' : ''} in {rangeNote.toLowerCase()}{' '}
                  games. Colored areas show where contact clusters, not individual dots.
                </Text>
              ) : null}
              {mode === 'hr' && homers.length ? (
                <Text style={styles.footnote}>
                  Flight paths use Statcast landing spot, exit velocity, and launch angle.
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
    transform: [{ translateX: -18 }, { translateY: -8 }],
  },
  zoneTagText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 9,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
