import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export const AIChatbotScreen = () => {
  const { colors } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now().toString(), text: input, fromUser: true };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    // Placeholder for AI response
    setTimeout(() => {
      const botMsg = { id: (Date.now() + 1).toString(), text: "AI is thinking...", fromUser: false };
      setMessages((prev) => [...prev, botMsg]);
    }, 800);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageBubble, { alignSelf: item.fromUser ? "flex-end" : "flex-start", backgroundColor: item.fromUser ? colors.primary : colors.surfaceAlt }]}>
      <Text style={{ color: item.fromUser ? colors.onPrimary : colors.text }}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={handleSend}>
          <Text style={{ color: colors.onPrimary, fontWeight: "bold" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  messagesContainer: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingVertical: 8,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  sendButton: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
