/**
 * Cascade state→city picker + free-text area input.
 * Used in signup, profile, and issue reporting.
 */
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, TText } from "@/src/components/ui";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { CITIES_BY_STATE, STATES } from "@/src/data/locations";

export type LocationValue = { state: string; city: string; area: string };

export function LocationPicker({
  value,
  onChange,
  testIDPrefix = "loc",
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  testIDPrefix?: string;
}) {
  const [openState, setOpenState] = useState(false);
  const [openCity, setOpenCity] = useState(false);
  const [stateFilter, setStateFilter] = useState("");

  const cities = useMemo(() => (value.state ? CITIES_BY_STATE[value.state] || [] : []), [value.state]);
  const filteredStates = useMemo(
    () => (stateFilter ? STATES.filter((s) => s.includes(stateFilter)) : STATES),
    [stateFilter],
  );

  return (
    <View style={{ gap: 10 }}>
      <View>
        <TText weight="bold" style={styles.label}>राज्य *</TText>
        <Pressable
          style={styles.input}
          onPress={() => { setOpenState(!openState); setOpenCity(false); }}
          testID={`${testIDPrefix}-state`}
        >
          <TText style={{ color: value.state ? colors.text : colors.muted, fontSize: 15 }}>
            {value.state || "राज्य चुनें"}
          </TText>
          <Ionicons name={openState ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
        </Pressable>
        {openState && (
          <Card style={{ padding: 0, marginTop: 4, maxHeight: 320, overflow: "hidden" }}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={14} color={colors.muted} />
              <TextInput
                value={stateFilter}
                onChangeText={setStateFilter}
                placeholder="खोजें..."
                placeholderTextColor={colors.muted}
                style={styles.search}
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredStates.map((s) => (
                <Pressable
                  key={s}
                  style={styles.option}
                  onPress={() => {
                    onChange({ state: s, city: "", area: value.area });
                    setOpenState(false);
                    setStateFilter("");
                  }}
                >
                  <TText weight={value.state === s ? "bold" : "regular"} style={{ color: value.state === s ? colors.primary : colors.text }}>
                    {s}
                  </TText>
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        )}
      </View>

      <View>
        <TText weight="bold" style={styles.label}>शहर *</TText>
        <Pressable
          style={[styles.input, !value.state && { opacity: 0.6 }]}
          onPress={() => {
            if (!value.state) return;
            setOpenCity(!openCity);
            setOpenState(false);
          }}
          disabled={!value.state}
          testID={`${testIDPrefix}-city`}
        >
          <TText style={{ color: value.city ? colors.text : colors.muted, fontSize: 15 }}>
            {value.city || (value.state ? "शहर चुनें" : "पहले राज्य चुनें")}
          </TText>
          <Ionicons name={openCity ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
        </Pressable>
        {openCity && (
          <Card style={{ padding: 0, marginTop: 4, maxHeight: 280, overflow: "hidden" }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {cities.map((c) => (
                <Pressable
                  key={c}
                  style={styles.option}
                  onPress={() => { onChange({ ...value, city: c }); setOpenCity(false); }}
                >
                  <TText weight={value.city === c ? "bold" : "regular"} style={{ color: value.city === c ? colors.primary : colors.text }}>
                    {c}
                  </TText>
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        )}
      </View>

      <View>
        <TText weight="bold" style={styles.label}>इलाक़ा / लोकेलिटी *</TText>
        <TextInput
          value={value.area}
          onChangeText={(t) => onChange({ ...value, area: t })}
          placeholder="जैसे: करोल बाग"
          placeholderTextColor={colors.muted}
          style={styles.textInput}
          testID={`${testIDPrefix}-area`}
        />
        <TText style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
          घर का पूरा पता न डालें — गोपनीयता के लिए केवल इलाक़ा पर्याप्त है।
        </TText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  option: { padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg },
  search: { flex: 1, fontFamily: fonts.body, color: colors.text, paddingVertical: 4 },
});
