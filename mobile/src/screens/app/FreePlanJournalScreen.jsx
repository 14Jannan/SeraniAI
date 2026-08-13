import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import journalApi from "../../api/journalApi";
import { useTheme } from "../../context/ThemeContext";

// ─── helpers ─────────────────────────────────────────────────────────────────

const toLocalDateStr = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const parseDateStr = (s) => {
    if (!s) return new Date();
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
};

const entryDateStr = (isoString) => {
    if (!isoString) return "";
    return toLocalDateStr(new Date(isoString));
};

const MONTH_LABELS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Build a 42-cell calendar grid for the given month.
function buildCalendarCells(calMonth) {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevEnd = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = toLocalDateStr(today);

    const cells = [];
    for (let i = 0; i < 42; i++) {
        let day;
        let current = true;
        if (i < firstWeekday) {
            day = prevEnd - firstWeekday + i + 1;
            current = false;
        } else if (i >= firstWeekday + daysInMonth) {
            day = i - (firstWeekday + daysInMonth) + 1;
            current = false;
        } else {
            day = i - firstWeekday + 1;
        }
        const dateStr = current ? toLocalDateStr(new Date(year, month, day)) : null;
        cells.push({ day, current, isToday: dateStr === todayStr, dateStr, key: `${i}-${day}` });
    }
    return cells;
}

// ─── sub-components ──────────────────────────────────────────────────────────

const CalendarModal = ({ visible, onClose, calMonth, setCalMonth, selectedDate, onSelectDate, colors }) => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const cells = useMemo(() => buildCalendarCells(calMonth), [calMonth]);

    const yearOptions = useMemo(() => {
        const cur = new Date().getFullYear();
        const arr = [];
        for (let y = cur + 10; y >= cur - 50; y--) arr.push(y);
        return arr;
    }, []);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            {/* Month / Year selectors */}
                            <View style={styles.calHeader}>
                                <Text style={[styles.calTitle, { color: colors.text }]}>
                                    {MONTH_LABELS[month]} {year}
                                </Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Feather name="x" size={18} color={colors.muted} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.calSelectors}>
                                {/* Prev month */}
                                <TouchableOpacity
                                    style={[styles.navBtn, { backgroundColor: colors.inputBg }]}
                                    onPress={() => setCalMonth(new Date(year, month - 1, 1))}
                                >
                                    <Feather name="chevron-left" size={16} color={colors.text} />
                                </TouchableOpacity>

                                {/* Month label (tappable — cycles) */}
                                <Text style={[styles.calMonthLabel, { color: colors.text }]}>
                                    {MONTH_LABELS[month]} {year}
                                </Text>

                                {/* Next month */}
                                <TouchableOpacity
                                    style={[styles.navBtn, { backgroundColor: colors.inputBg }]}
                                    onPress={() => setCalMonth(new Date(year, month + 1, 1))}
                                >
                                    <Feather name="chevron-right" size={16} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Day-of-week headers */}
                            <View style={styles.dayRow}>
                                {DAY_LABELS.map((d) => (
                                    <Text key={d} style={[styles.dayLabel, { color: colors.muted }]}>{d}</Text>
                                ))}
                            </View>

                            {/* Date grid */}
                            <View style={styles.gridWrap}>
                                {cells.map((cell) => {
                                    const isSelected = cell.dateStr === selectedDate;
                                    return (
                                        <TouchableOpacity
                                            key={cell.key}
                                            disabled={!cell.current}
                                            onPress={() => { onSelectDate(cell.dateStr); onClose(); }}
                                            style={[
                                                styles.cellBtn,
                                                isSelected && { backgroundColor: colors.primary },
                                                !isSelected && cell.isToday && { backgroundColor: colors.primaryStrong },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.cellText,
                                                    { color: !cell.current ? colors.muted : isSelected || cell.isToday ? "#fff" : colors.text },
                                                ]}
                                            >
                                                {cell.day}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Jump to today */}
                            <TouchableOpacity
                                style={styles.todayBtn}
                                onPress={() => {
                                    const today = toLocalDateStr();
                                    setCalMonth(new Date());
                                    onSelectDate(today);
                                    onClose();
                                }}
                            >
                                <Text style={[styles.todayText, { color: colors.primary }]}>Jump to today</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// Simple add/edit form — title + content only (free plan)
const EntryForm = ({ colors, initialTitle, initialContent, onSave, onBack, saving, readOnly }) => {
    const [title, setTitle] = useState(initialTitle || "");
    const [content, setContent] = useState(initialContent || "");

    const handleSave = () => {
        if (!title.trim() && !content.trim()) {
            Alert.alert("Empty entry", "Please add a title or some content.");
            return;
        }
        onSave({ title: title.trim(), content: content.trim() });
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.formHero, { backgroundColor: colors.primaryStrong }]}>
                <TouchableOpacity onPress={onBack} style={styles.backRow}>
                    <Feather name="arrow-left" size={20} color="#fff" />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.formHeroTitle}>{readOnly ? "View Entry" : initialTitle ? "Edit Entry" : "New Entry"}</Text>
            </View>

            <ScrollView style={[{ flex: 1, backgroundColor: colors.background }]} contentContainerStyle={styles.formBody}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Title</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Give your entry a title..."
                    placeholderTextColor={colors.muted}
                    editable={!readOnly}
                    style={[styles.titleInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                />

                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Content</Text>
                <TextInput
                    value={content}
                    onChangeText={setContent}
                    placeholder="Write your thoughts here..."
                    placeholderTextColor={colors.muted}
                    editable={!readOnly}
                    multiline
                    textAlignVertical="top"
                    style={[styles.contentInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                />

                {!readOnly && (
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={styles.saveBtnText}>Save Entry</Text>}
                    </TouchableOpacity>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// ─── main screen ─────────────────────────────────────────────────────────────

export const FreePlanJournalScreen = () => {
    const { colors } = useTheme();

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // View modes: "list" | "dateView" | "add" | "edit" | "view"
    const [mode, setMode] = useState("list");
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [saving, setSaving] = useState(false);

    // Calendar state
    const [selectedDate, setSelectedDate] = useState(toLocalDateStr());
    const [calMonth, setCalMonth] = useState(new Date());
    const [calVisible, setCalVisible] = useState(false);

    // ── data fetching ──────────────────────────────────────────────────────────

    const loadEntries = useCallback(async ({ showRefreshing = false } = {}) => {
        try {
            setError("");
            if (showRefreshing) setRefreshing(true);
            else setLoading(true);

            const res = await journalApi.getJournals();
            const list = Array.isArray(res.journals) ? res.journals : [];
            // Sort newest first
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setEntries(list);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load journal entries.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadEntries(); }, [loadEntries]));

    // ── derived ────────────────────────────────────────────────────────────────

    const dateFilteredEntries = useMemo(
        () => entries.filter((e) => entryDateStr(e.createdAt) === selectedDate),
        [entries, selectedDate],
    );

    const formattedSelectedDate = useMemo(() => {
        const d = parseDateStr(selectedDate);
        return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    }, [selectedDate]);

    // ── handlers ───────────────────────────────────────────────────────────────

    const handleCreate = async ({ title, content }) => {
        setSaving(true);
        try {
            const res = await journalApi.createJournal({ title, content });
            setEntries((prev) => [res.journal, ...prev]);
            setMode("list");
        } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to save entry.");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async ({ title, content }) => {
        if (!selectedEntry) return;
        setSaving(true);
        try {
            const res = await journalApi.updateJournal(selectedEntry._id, { title, content });
            setEntries((prev) => prev.map((e) => (e._id === selectedEntry._id ? res.journal : e)));
            setMode("list");
            setSelectedEntry(null);
        } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to update entry.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (entry) => {
        Alert.alert(
            "Delete Entry",
            `Delete "${entry.title || "this entry"}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await journalApi.deleteJournal(entry._id);
                            setEntries((prev) => prev.filter((e) => e._id !== entry._id));
                        } catch (err) {
                            Alert.alert("Error", err.response?.data?.message || "Failed to delete entry.");
                        }
                    },
                },
            ],
        );
    };

    const handleDateSelect = (dateStr) => {
        setSelectedDate(dateStr);
        setCalMonth(parseDateStr(dateStr));
        setMode("dateView");
    };

    // ── form views ─────────────────────────────────────────────────────────────

    if (mode === "add") {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <EntryForm
                    colors={colors}
                    onBack={() => setMode("list")}
                    onSave={handleCreate}
                    saving={saving}
                />
            </View>
        );
    }

    if (mode === "edit" && selectedEntry) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <EntryForm
                    colors={colors}
                    initialTitle={selectedEntry.title}
                    initialContent={selectedEntry.content}
                    onBack={() => { setMode("list"); setSelectedEntry(null); }}
                    onSave={handleUpdate}
                    saving={saving}
                />
            </View>
        );
    }

    if (mode === "view" && selectedEntry) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <EntryForm
                    colors={colors}
                    initialTitle={selectedEntry.title}
                    initialContent={selectedEntry.content}
                    onBack={() => { setMode("list"); setSelectedEntry(null); }}
                    onSave={() => { }}
                    readOnly
                />
            </View>
        );
    }

    // ── date-specific view ─────────────────────────────────────────────────────

    if (mode === "dateView") {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.hero, { backgroundColor: colors.primaryStrong }]}>
                    <View style={styles.heroTopRow}>
                        <TouchableOpacity
                            style={styles.heroBackBtn}
                            onPress={() => setMode("list")}
                        >
                            <Feather name="arrow-left" size={18} color="#fff" />
                            <Text style={styles.heroBackText}>All Entries</Text>
                        </TouchableOpacity>

                        <View style={styles.dateBadge}>
                            <Feather name="calendar" size={14} color="#fff" />
                            <Text style={styles.dateBadgeText}>{formattedSelectedDate}</Text>
                        </View>
                    </View>
                </View>

                {/* Date-filtered entries */}
                <FlatList
                    data={dateFilteredEntries}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => loadEntries({ showRefreshing: true })} tintColor={colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            {loading
                                ? <ActivityIndicator color={colors.primary} />
                                : <>
                                    <Feather name="book-open" size={22} color={colors.muted} />
                                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No entries for this date</Text>
                                    <Text style={[styles.emptyCopy, { color: colors.muted }]}>Tap + to write something for {formattedSelectedDate}.</Text>
                                </>}
                        </View>
                    }
                    renderItem={({ item }) => (
                        <EntryCard
                            entry={item}
                            colors={colors}
                            onView={() => { setSelectedEntry(item); setMode("view"); }}
                            onEdit={() => { setSelectedEntry(item); setMode("edit"); }}
                            onDelete={() => handleDelete(item)}
                        />
                    )}
                />

                {/* FAB */}
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={() => setMode("add")}
                >
                    <Feather name="plus" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        );
    }

    // ── main list view ─────────────────────────────────────────────────────────

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Hero header */}
            <View style={[styles.hero, { backgroundColor: colors.primaryStrong }]}>
                <View style={styles.heroTopRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroTitle}>Journal</Text>
                        <Text style={[styles.heroSubtitle, { color: "rgba(255,255,255,0.75)" }]}>
                            All your entries in one place.
                        </Text>
                    </View>

                    {/* Calendar picker button */}
                    <TouchableOpacity
                        style={[styles.calBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
                        onPress={() => setCalVisible(true)}
                    >
                        <Feather name="calendar" size={16} color="#fff" />
                        <Text style={styles.calBtnText}>
                            {parseDateStr(selectedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Entry count bar */}
                <View style={[styles.countBar, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
                    <Feather name="book-open" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.countText}>{entries.length} {entries.length === 1 ? "entry" : "entries"} total</Text>
                </View>
            </View>

            {/* "ALL ENTRIES" label */}
            <View style={[styles.sectionBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionBarText, { color: colors.muted }]}>ALL ENTRIES</Text>
                <TouchableOpacity onPress={() => handleDateSelect(selectedDate)}>
                    <Text style={[styles.filterLink, { color: colors.primary }]}>Filter by date</Text>
                </TouchableOpacity>
            </View>

            {/* Error */}
            {!!error && (
                <View style={[styles.errorBox, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                    <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                </View>
            )}

            {/* List */}
            <FlatList
                data={entries}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => loadEntries({ showRefreshing: true })} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {loading
                            ? <ActivityIndicator color={colors.primary} />
                            : <>
                                <Feather name="book-open" size={22} color={colors.muted} />
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No journal entries yet</Text>
                                <Text style={[styles.emptyCopy, { color: colors.muted }]}>Tap + to write your first entry and start building your journal.</Text>
                            </>}
                    </View>
                }
                renderItem={({ item }) => (
                    <EntryCard
                        entry={item}
                        colors={colors}
                        onView={() => { setSelectedEntry(item); setMode("view"); }}
                        onEdit={() => { setSelectedEntry(item); setMode("edit"); }}
                        onDelete={() => handleDelete(item)}
                    />
                )}
            />

            {/* Calendar modal */}
            <CalendarModal
                visible={calVisible}
                onClose={() => setCalVisible(false)}
                calMonth={calMonth}
                setCalMonth={setCalMonth}
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
                colors={colors}
            />

            {/* FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => setMode("add")}
            >
                <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

// ─── entry card ───────────────────────────────────────────────────────────────

const EntryCard = ({ entry, colors, onView, onEdit, onDelete }) => {
    const dateStr = entry.createdAt
        ? new Date(entry.createdAt).toLocaleString(undefined, {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        })
        : "Just now";

    return (
        <TouchableOpacity
            style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.85}
            onPress={onView}
        >
            {/* Green left accent bar */}
            <View style={styles.accentBar} />

            <View style={styles.entryBody}>
                <View style={styles.entryTopRow}>
                    <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={1}>
                        {entry.title || "Untitled Entry"}
                    </Text>

                    <View style={styles.entryActions}>
                        <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
                            <Feather name="edit-2" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
                            <Feather name="trash-2" size={16} color="#DC2626" />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={[styles.entryContent, { color: colors.muted }]} numberOfLines={3}>
                    {entry.content || "No content yet."}
                </Text>

                <View style={styles.entryMeta}>
                    <Feather name="calendar" size={12} color={colors.muted} />
                    <Text style={[styles.entryDate, { color: colors.muted }]}>{dateStr}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Hero
    hero: {
        paddingHorizontal: 20,
        paddingTop: 48,
        paddingBottom: 18,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    heroTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    heroTitle: { fontSize: 28, fontWeight: "800", color: "#fff" },
    heroSubtitle: { fontSize: 13, marginTop: 4 },
    calBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    calBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
    countBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 14,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    countText: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "600" },

    // Section bar
    sectionBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    sectionBarText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8 },
    filterLink: { fontSize: 13, fontWeight: "700" },

    // List
    listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 },

    // Entry card
    entryCard: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 18,
        marginBottom: 12,
        overflow: "hidden",
    },
    accentBar: { width: 4, backgroundColor: "#22C55E" },
    entryBody: { flex: 1, padding: 14 },
    entryTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    entryTitle: { flex: 1, fontSize: 16, fontWeight: "800" },
    entryActions: { flexDirection: "row", gap: 6 },
    iconBtn: { padding: 6 },
    entryContent: { fontSize: 13, lineHeight: 19, marginTop: 6 },
    entryMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
    entryDate: { fontSize: 12, fontWeight: "600" },

    // Empty / error
    emptyCard: {
        borderWidth: 1,
        borderRadius: 20,
        alignItems: "center",
        padding: 28,
        marginTop: 8,
        gap: 10,
    },
    emptyTitle: { fontSize: 16, fontWeight: "800" },
    emptyCopy: { fontSize: 13, textAlign: "center", lineHeight: 19 },
    errorBox: { borderWidth: 1, borderRadius: 14, marginHorizontal: 16, marginTop: 10, padding: 12 },
    errorText: { fontSize: 13, fontWeight: "600" },

    // FAB
    fab: {
        position: "absolute",
        bottom: 28,
        right: 22,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },

    // Date view header
    heroBackBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    heroBackText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    dateBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
    dateBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },

    // Calendar modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
    calendarCard: { width: "100%", maxWidth: 340, borderRadius: 24, borderWidth: 1, padding: 18 },
    calHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    calTitle: { fontSize: 16, fontWeight: "800" },
    calSelectors: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    navBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    calMonthLabel: { fontSize: 14, fontWeight: "700" },
    dayRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 6 },
    dayLabel: { width: 36, textAlign: "center", fontSize: 11, fontWeight: "700" },
    gridWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around" },
    cellBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    cellText: { fontSize: 13, fontWeight: "600" },
    todayBtn: { marginTop: 12, alignItems: "center" },
    todayText: { fontSize: 13, fontWeight: "800" },

    // Entry form
    formHero: {
        paddingHorizontal: 20,
        paddingTop: 48,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
    backText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    formHeroTitle: { fontSize: 24, fontWeight: "800", color: "#fff" },
    formBody: { padding: 20, gap: 8 },
    fieldLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
    titleInput: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 14,
    },
    contentInput: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        lineHeight: 22,
        minHeight: 200,
        marginBottom: 20,
    },
    saveBtn: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
    },
    saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});

export default FreePlanJournalScreen;