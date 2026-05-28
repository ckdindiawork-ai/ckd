/**
 * LocationPicker — thin wrapper around GeoPickerSheet for backward
 * compatibility with screens that imported the legacy 2-step picker.
 *
 * Output shape unchanged: { state, city, area }
 *  - `state` is the Hindi name (e.g. "महाराष्ट्र")
 *  - `city`  is the Hindi name (e.g. "मुंबई") OR free-text override
 *  - `area`  is free-text neighbourhood / locality
 *
 * The district step in the sheet is for picker UX only — it scopes the
 * city list but is NOT persisted as a separate field (avoids backend
 * schema change for Phase 2; can be added later if needed).
 */
import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { TText } from "@/src/components/ui";
import { colors, fonts, radius } from "@/src/theme";
import { GeoPickerSheet, LocationValue } from "@/src/components/GeoPickerSheet";

export type { LocationValue } from "@/src/components/GeoPickerSheet";

export function LocationPicker({
  value,
  onChange,
  testIDPrefix = "loc",
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  testIDPrefix?: string;
}) {
  return (
    <View style={{ gap: 10 }}>
      <GeoPickerSheet value={value} onChange={onChange} testIDPrefix={testIDPrefix} />

      {/* Area / locality — free text, kept from legacy LocationPicker */}
      <View>
        <TText weight="bold" style={styles.label}>क्षेत्र / मोहल्ला</TText>
        <TextInput
          value={value.area}
          onChangeText={(t) => onChange({ ...value, area: t })}
          placeholder="जैसे: नंगलोई पश्चिम, सेक्टर 7"
          placeholderTextColor={colors.muted}
          style={styles.input}
          testID={`${testIDPrefix}-area`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.md,
    fontFamily: fonts.body, color: colors.text, fontSize: 15,
  },
});

export default LocationPicker;
