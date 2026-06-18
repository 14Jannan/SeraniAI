import React from "react";
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import courseApi from "../../api/courseApi";

const DEFAULT_THUMBNAIL =
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1200&q=60";

export const CoursesScreen = ({ navigation }) => {
  const [courses, setCourses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [enrollingCourseId, setEnrollingCourseId] = React.useState(null);
  const [failedImageIds, setFailedImageIds] = React.useState({});
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const loadCourses = React.useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await courseApi.getCourses();
      setCourses(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load courses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const categories = React.useMemo(() => {
    const unique = Array.from(
      new Set(courses.map((course) => course.category).filter(Boolean)),
    );
    return ["All", ...unique];
  }, [courses]);

  const filteredCourses = React.useMemo(() => {
    return courses.filter((course) => {
      const byCategory =
        selectedCategory === "All" || course.category === selectedCategory;
      const bySearch =
        !search ||
        String(course.title || "")
          .toLowerCase()
          .includes(search.toLowerCase());

      return byCategory && bySearch;
    });
  }, [courses, search, selectedCategory]);

  const getCourseThumbnail = (course) => {
    const rawSource =
      String(course?.thumbnailUrl || "").trim() ||
      String(course?.thumbnail || "").trim();

    if (!rawSource) {
      return DEFAULT_THUMBNAIL;
    }

    if (failedImageIds[String(course?._id || "")]) {
      return DEFAULT_THUMBNAIL;
    }

    return courseApi.getFileUrl(rawSource);
  };

  const handleEnroll = async (courseId) => {
    const safeId = String(courseId || "").trim();
    if (!safeId || enrollingCourseId) {
      return;
    }

    try {
      setEnrollingCourseId(safeId);
      await courseApi.enrollInCourse(safeId);
      Alert.alert("Success", "Successfully enrolled in the course.");
    } catch (enrollError) {
      Alert.alert(
        "Enrollment Failed",
        enrollError.response?.data?.message || "Could not enroll in this course.",
      );
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const renderCourse = ({ item }) => (
    <View
      style={[
        styles.courseCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Image
        source={{ uri: getCourseThumbnail(item) }}
        style={styles.courseThumbnail}
        resizeMode="cover"
        accessibilityLabel={`${item.title || "Course"} thumbnail`}
        onError={() => {
          const key = String(item?._id || "");
          if (!key) return;
          setFailedImageIds((prev) => ({ ...prev, [key]: true }));
        }}
      />

      <View style={styles.cardTopRow}>
        <Text style={[styles.courseTitle, { color: colors.text }]}>
          {item.title || "Untitled Course"}
        </Text>
        <Text style={[styles.categoryBadge, { color: colors.primary }]}>
          {item.category || "General"}
        </Text>
      </View>

      <Text style={[styles.metaText, { color: colors.muted }]}>
        Instructor: {item.instructorName || "TBA"}
      </Text>
      <Text style={[styles.description, { color: colors.muted }]} numberOfLines={3}>
        {item.description || "No description available."}
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`View lessons for ${item.title || "course"}`}
          onPress={() =>
            navigation.navigate("CourseDetails", {
              courseId: item._id,
              courseTitle: item.title,
            })
          }
        >
          <Text style={styles.primaryButtonText}>View Lessons</Text>
          <Feather name="chevron-right" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            { borderColor: colors.border, backgroundColor: colors.inputBg },
            enrollingCourseId === item._id && styles.buttonDisabled,
          ]}
          onPress={() => handleEnroll(item._id)}
          accessibilityRole="button"
          accessibilityLabel={`Enroll in ${item.title || "course"}`}
          disabled={enrollingCourseId === item._id}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            {enrollingCourseId === item._id ? "Enrolling..." : "Enroll"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryStrong }]}>
        <Text style={styles.title}>Courses</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Discover your learning path</Text>

        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Search courses..."
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search courses"
          placeholderTextColor={colors.muted}
        />
      </View>

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => {
          const isActive = item === selectedCategory;

          return (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(item)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${item}`}
            >
              <Text
                style={{
                  color: isActive ? "#FFFFFF" : colors.text,
                  fontWeight: "700",
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {!!error && (
        <View
          style={[
            styles.errorWrap,
            {
              backgroundColor: colors.warningBg,
              borderColor: colors.warningBorder,
            },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => loadCourses(true)}
            accessibilityRole="button"
            accessibilityLabel="Retry loading courses"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredCourses}
        renderItem={renderCourse}
        keyExtractor={(item, index) => item._id || String(index)}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: isWide ? 28 : 18 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCourses(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Feather name="book-open" size={26} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No courses found.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#FFFFFF" },
  subtitle: { marginTop: 4, fontSize: 13 },
  searchInput: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryList: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  errorWrap: {
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 8,
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    alignSelf: "center",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  list: { paddingTop: 16, paddingBottom: 24 },
  courseCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    boxShadow: "0px 6px 12px rgba(15, 23, 42, 0.08)",
    elevation: 3,
  },
  courseThumbnail: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#E2E8F0",
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  courseTitle: { fontSize: 16, fontWeight: "bold" },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  emptyWrap: {
    marginTop: 26,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
  },
});
