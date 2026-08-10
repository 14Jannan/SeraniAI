import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import * as chatApi from "../../api/chatApi";

const DRAWER_WIDTH = 280;

export const AIChatbotScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const flatListRef = useRef(null);

  // Toggle Drawer Animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isDrawerOpen ? 0 : -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isDrawerOpen]);

  // Load chat history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await chatApi.fetchHistory();
      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
    setIsDrawerOpen(false);
  };

  const handleOpenSession = async (sessionId) => {
    try {
      setLoading(true);
      setIsDrawerOpen(false);
      const res = await chatApi.fetchSession(sessionId);
      setMessages(res.data?.messages || []);
      setActiveSessionId(sessionId);
    } catch (err) {
      console.error("Failed to load chat session:", err);
      Alert.alert("Error", "Could not load this conversation.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this chat session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await chatApi.deleteSession(sessionId);
              if (activeSessionId === sessionId) {
                handleNewChat();
              }
              loadHistory();
            } catch (err) {
              console.error("Failed to delete chat session:", err);
              Alert.alert("Error", "Could not delete this conversation.");
            }
          },
        },
      ]
    );
  };

  const handleSend = async () => {
    const cleanText = input.trim();
    if (!cleanText || loading) return;

    // Show user message immediately
    const userMsg = { id: Date.now().toString(), role: "user", content: cleanText, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append("message", cleanText);
      formData.append("localDate", new Date().toDateString());
      if (activeSessionId) {
        formData.append("sessionId", activeSessionId);
      }

      const res = await chatApi.sendMessage(formData);
      const { sessionId, reply, courses = [] } = res.data;

      // Update activeSessionId if it's a new chat
      if (!activeSessionId) {
        setActiveSessionId(sessionId);
      }

      // Add bot reply to messages list (include timestamp)
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        courses,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);

      // Reload history list so sidebar updates with the correct title
      loadHistory();
    } catch (err) {
      console.error("Failed to send message:", err);
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity style={styles.headerBtn} onPress={() => setIsDrawerOpen(true)}>
        <Feather name="menu" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>SeraniAI Chat</Text>
    </View>
  );

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <View style={[styles.welcomeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.welcomeIconContainer, { backgroundColor: colors.surfaceAlt }]}>
          <Feather name="message-square" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome to SeraniAI</Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.muted }]}>
          Your personal AI companion for growth and productivity.
        </Text>
      </View>
    </View>
  );

  const renderFormattedContent = (content, textStyle, boldStyle, italicStyle) => {
    if (!content) return null;

    const parts = String(content).split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text key={`${index}-${part}`} style={[textStyle, boldStyle]}>
            {part.slice(2, -2)}
          </Text>
        );
      }

      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <Text key={`${index}-${part}`} style={[textStyle, italicStyle]}>
            {part.slice(1, -1)}
          </Text>
        );
      }

      return (
        <Text key={`${index}-${part}`} style={textStyle}>
          {part}
        </Text>
      );
    });
  };

  const renderMessageItem = ({ item }) => {
    const isUser = item.role === "user";
    const timeLabel = new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const openCourse = (course) => {
      if (!course?._id && !course?.id) return;
      navigation.navigate("Courses", {
        screen: "CourseDetails",
        params: {
          courseId: course._id || course.id,
          courseTitle: course.title || "Course",
        },
      });
    };

    return (
      <View
        style={[
          styles.messageBubbleContainer,
          { alignSelf: isUser ? "flex-end" : "flex-start" },
        ]}
      >
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>S</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isUser ? colors.primary : colors.surfaceAlt,
              borderTopLeftRadius: isUser ? 18 : 6,
              borderTopRightRadius: isUser ? 6 : 18,
              borderBottomRightRadius: 18,
              borderBottomLeftRadius: 18,
              marginLeft: isUser ? 0 : 8,
              marginRight: isUser ? 8 : 0,
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? "#fff" : colors.text },
            ]}
          >
            {renderFormattedContent(
              item.content,
              [styles.messageText, { color: isUser ? "#fff" : colors.text }],
              styles.messageBold,
              styles.messageItalic,
            )}
          </Text>
          <Text style={[styles.messageTime, { color: isUser ? 'rgba(255,255,255,0.85)' : colors.muted }]}>{timeLabel}</Text>

          {!isUser && Array.isArray(item.courses) && item.courses.length > 0 && (
            <View style={styles.courseList}>
              {item.courses.slice(0, 3).map((course) => {
                const courseId = course?._id || course?.id;
                if (!courseId) return null;

                return (
                  <TouchableOpacity
                    key={String(courseId)}
                    style={[styles.courseChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => openCourse(course)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.courseChipText, { color: colors.text }]} numberOfLines={1}>
                      {course.title || "Course"}
                    </Text>
                    <Feather name="chevron-right" size={14} color={colors.muted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderDrawer = () => {
    if (!isDrawerOpen) return null;
    return (
      <View style={StyleSheet.absoluteFillObject}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={() => setIsDrawerOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Sliding Panel */}
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: colors.surface,
              borderRightColor: colors.border,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <SafeAreaView style={styles.drawerContainer} edges={["top", "bottom"]}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrandWrap}>
                <View style={[styles.drawerBrandLogo, { backgroundColor: colors.primary }]}>
                  <Feather name="message-circle" size={14} color="#fff" />
                </View>
                <Text style={[styles.drawerTitle, { color: colors.text }]}>SeraniAI</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDrawerOpen(false)}>
                <Feather name="x" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.newChatBtn, { backgroundColor: colors.primary }]}
              onPress={handleNewChat}
            >
               <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.newChatBtnText}>New Conversation</Text>
            </TouchableOpacity>

            <FlatList
              data={history}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.historyItem,
                    {
                      backgroundColor:
                        activeSessionId === item._id
                          ? colors.surfaceAlt
                          : "transparent",
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.historyItemBtn}
                    onPress={() => handleOpenSession(item._id)}
                  >
                    <Feather
                      name="message-square"
                      size={16}
                      color={
                        activeSessionId === item._id
                          ? colors.primary
                          : colors.muted
                      }
                    />
                    <Text
                      style={[
                        styles.historyItemText,
                        {
                          color:
                            activeSessionId === item._id
                              ? colors.primary
                              : colors.text,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title || "Untitled Chat"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteSession(item._id)}
                  >
                    <Feather name="trash-2" size={16} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyHistory}>
                  <Text style={{ color: colors.muted }}>No recent chats</Text>
                </View>
              }
              contentContainerStyle={styles.drawerList}
            />
          </SafeAreaView>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {renderHeader()}
      
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {messages.length === 0 ? (
          renderWelcome()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id || item._id}
            contentContainerStyle={styles.messagesContainer}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {loading && (
          <View style={[styles.messageBubbleContainer, { alignSelf: 'flex-start' }]}>            
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}> 
              <Text style={styles.avatarText}>S</Text>
            </View>
            <View style={[styles.typingBubble, { backgroundColor: colors.surfaceAlt }]}> 
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { marginLeft: 8 }]}>SeraniAI is thinking...</Text>
            </View>
          </View>
        )}

          <View style={[styles.inputArea, { backgroundColor: colors.background, borderTopColor: "transparent" }]}> 
          <TextInput
            style={[styles.input, { backgroundColor: "rgba(255,255,255,0.92)", color: colors.text }]}
            placeholder="Ask SeraniAI something..."
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: input.trim() && !loading ? colors.primary : colors.surfaceAlt,
                opacity: input.trim() && !loading ? 1 : 0.6
              }
            ]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            <Feather
              name="send"
              size={20}
              color={input.trim() && !loading ? "#fff" : colors.muted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {renderDrawer()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    marginLeft: 12,
  },
  headerBtn: {
    padding: 8,
  },
  chatArea: {
    flex: 1,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubbleContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 6,
    maxWidth: "80%",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageBold: {
    fontWeight: "700",
  },
  messageItalic: {
    fontStyle: "italic",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end'
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginVertical: 6,
    marginLeft: 36,
  },
  loadingText: {
    marginLeft: 8,
    color: "#64748b",
    fontSize: 14,
  },
  courseList: {
    marginTop: 10,
    gap: 8,
  },
  courseChip: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  courseChipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    marginRight: 10,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 0,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  welcomeCard: {
    width: "100%",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  welcomeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 999,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    zIndex: 1000,
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  drawerBrandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerBrandLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newChatBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 8,
  },
  drawerList: {
    paddingHorizontal: 12,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginVertical: 4,
    borderRadius: 8,
  },
  historyItemBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  historyItemText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 10,
    flex: 1,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyHistory: {
    alignItems: "center",
    paddingVertical: 24,
  },
});
