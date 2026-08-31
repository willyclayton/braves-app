import { Pressable, StyleSheet, Text, View } from 'react-native';

export const SAVANT_TABS = ['STATCAST', 'STANDARD', 'SPLITS', 'GAME LOGS'] as const;
export type SavantTab = (typeof SAVANT_TABS)[number];

export function SavantTabs({
  value,
  onChange,
}: {
  value: SavantTab;
  onChange: (tab: SavantTab) => void;
}) {
  return (
    <View style={styles.grid}>
      {SAVANT_TABS.map((tab) => {
        const on = value === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.btn, on && styles.btnOn]}
          >
            <Text style={[styles.text, on && styles.textOn]}>{tab}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SavantTableHeader({ title }: { title: string }) {
  return (
    <View style={styles.headWrap}>
      <View style={styles.headRule} />
      <Text style={styles.headTitle}>{title}</Text>
      <View style={styles.headRule} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#C5DDDE',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  btn: {
    width: '50%',
    paddingVertical: 11,
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#D5D5D5',
    backgroundColor: '#FFFFFF',
  },
  btnOn: { backgroundColor: '#3D8E91' },
  text: {
    fontFamily: 'DMSans_700Bold',
    color: '#333',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  textOn: { color: '#FFFFFF' },
  headWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  headRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(245,240,232,0.28)' },
  headTitle: {
    fontFamily: 'DMSans_700Bold',
    color: '#F5F0E8',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
