import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

export const CoursesScreen = ({ navigation }) => {
  const [courses] = React.useState([
    { id: "1", title: "React Basics", progress: 65 },
    { id: "2", title: "Advanced JavaScript", progress: 40 },
    { id: "3", title: "Mobile Development", progress: 20 },
  ]);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const renderCourse = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.courseCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={() => navigation.navigate("CourseDetails", { id: item.id })}
    >
      <View style={styles.cardTopRow}>
        <Text style={[styles.courseTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        <Feather name="chevron-right" size={18} color={colors.muted} />
      </View>
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${item.progress}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: colors.muted }]}>
        {item.progress}% complete
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryStrong }]}>
        <Text style={styles.title}>My Courses</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Keep progressing every day
        </Text>
      </View>
      <FlatList
        style={styles.listView}
        data={courses}
        renderItem={renderCourse}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: isWide ? 28 : 16 },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listView: { flex: 1 },
  header: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#FFFFFF" },
  subtitle: { marginTop: 4, fontSize: 13 },
  list: { paddingTop: 16, paddingBottom: 24 },
  courseCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    boxShadow: "0px 6px 12px rgba(15, 23, 42, 0.08)",
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  courseTitle: { fontSize: 16, fontWeight: "bold" },
  progressBar: {
    height: 10,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: "700" },
});
