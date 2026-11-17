import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Speech from "expo-speech";
import api from "../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUICK_QUESTIONS = [
  "What medicines should I take today?",
  "Show my upcoming reminders",
  "How can I manage my medicines?",
];

export default function VoiceAssistantScreen() {
    const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I'm your Rx Analyzer assistant. Type a message to ask me about your medicines or reminders.",
    },
  ]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const speakAnswer = async (text) => {
    if (!text || !text.trim()) {
      return;
    }

    try {
      await Speech.stop();

      setSpeaking(true);

      Speech.speak(text, {
        language: "en-US",
        rate: 0.95,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    } catch (error) {
      setSpeaking(false);
      Alert.alert("Speech Error", "Unable to read the answer aloud.");
    }
  };

  const stopSpeaking = async () => {
    try {
      await Speech.stop();
    } finally {
      setSpeaking(false);
    }
  };

  const askQuestion = async (value = question) => {
    const cleanQuestion = value.trim();

    if (!cleanQuestion || loading) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: cleanQuestion,
    };

    setMessages((previous) => [...previous, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await api.post("/api/voice-assistant/ask", {
        question: cleanQuestion,
      });

      const data = response?.data || {};

      const answer =
        data.answer ||
        data.response ||
        data.message ||
        "I couldn't find an answer. Please try asking another question.";

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text:
          typeof answer === "string"
            ? answer
            : JSON.stringify(answer),
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (error) {
      console.error(
        "Voice Assistant API Error:",
        error?.response?.data || error.message
      );

      const errorMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        text:
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "Sorry, I couldn't connect to the assistant. Please check that the backend is running and try again.",
      };

      setMessages((previous) => [...previous, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (item) => {
    const isUser = item.role === "user";

    return (
      <View
        key={item.id}
        style={[
          styles.messageRow,
          isUser ? styles.userMessageRow : styles.assistantMessageRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}
          >
            {item.text}
          </Text>

          {!isUser && item.id !== "welcome" && (
            <TouchableOpacity
              style={styles.listenButton}
              onPress={() => speakAnswer(item.text)}
              accessibilityRole="button"
              accessibilityLabel="Read answer aloud"
            >
              <Text style={styles.listenButtonText}>🔊 Listen</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
     <View
  style={[
    styles.header,
    {
      paddingTop: Math.max(insets.top, 12),
    },
  ]}
>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>✦</Text>
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSubtitle}>
            Your personal medicine assistant
          </Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Ask questions about your medicines and reminders by typing below.
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map(renderMessage)}

        {loading && (
          <View style={[styles.messageRow, styles.assistantMessageRow]}>
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2F6FED" />
                <Text style={styles.loadingText}>
                  Thinking...
                </Text>
              </View>
            </View>
          </View>
        )}

        {speaking && (
          <TouchableOpacity
            style={styles.stopSpeakingButton}
            onPress={stopSpeaking}
          >
            <Text style={styles.stopSpeakingText}>
              Stop speaking
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.quickQuestionsContainer}>
        <Text style={styles.quickQuestionsTitle}>
          QUICK QUESTIONS
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_QUESTIONS.map((item, index) => (
            <TouchableOpacity
              key={`quick-${index}`}
              style={styles.quickQuestion}
              onPress={() => askQuestion(item)}
              disabled={loading}
            >
              <Text style={styles.quickQuestionText}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={question}
          onChangeText={setQuestion}
          placeholder="Type your message..."
          placeholderTextColor="#8A94A6"
          multiline
          maxLength={2000}
          editable={!loading}
          returnKeyType="default"
          accessibilityLabel="Type your message"
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!question.trim() || loading) && styles.sendButtonDisabled,
          ]}
          onPress={() => askQuestion()}
          disabled={!question.trim() || loading}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>
        Type your question and tap Send
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },

 header: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 18,
  paddingBottom: 14,
  borderBottomWidth: 1,
  borderBottomColor: "#E8EDF5",
  minHeight: 76,
},

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerIconText: {
    fontSize: 26,
    color: "#2F6FED",
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#172B4D",
  },

  headerSubtitle: {
    fontSize: 13,
    color: "#7A869A",
    marginTop: 3,
  },

  notice: {
    backgroundColor: "#EAF1FF",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },

  noticeText: {
    color: "#315A9B",
    fontSize: 13,
    lineHeight: 19,
  },

  chatArea: {
    flex: 1,
  },

  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },

  messageRow: {
    width: "100%",
    marginBottom: 14,
    flexDirection: "row",
  },

  userMessageRow: {
    justifyContent: "flex-end",
  },

  assistantMessageRow: {
    justifyContent: "flex-start",
  },

  messageBubble: {
    maxWidth: "88%",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 18,
  },

  userBubble: {
    backgroundColor: "#2F6FED",
    borderBottomRightRadius: 5,
  },

  assistantBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: "#E8EDF5",
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },

  userMessageText: {
    color: "#FFFFFF",
  },

  assistantMessageText: {
    color: "#26364D",
  },

  listenButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#EAF1FF",
    borderRadius: 8,
  },

  listenButtonText: {
    color: "#2F6FED",
    fontSize: 12,
    fontWeight: "600",
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  loadingText: {
    fontSize: 14,
    color: "#7A869A",
  },

  stopSpeakingButton: {
    alignSelf: "flex-start",
    backgroundColor: "#FCE8E6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },

  stopSpeakingText: {
    color: "#B3261E",
    fontSize: 13,
    fontWeight: "600",
  },

  quickQuestionsContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#E8EDF5",
  },

  quickQuestionsTitle: {
    color: "#7A869A",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: 16,
    marginBottom: 10,
  },

  quickQuestion: {
    backgroundColor: "#F4F7FB",
    borderWidth: 1,
    borderColor: "#DCE5F5",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginLeft: 10,
  },

  quickQuestionText: {
    color: "#315A9B",
    fontSize: 12,
    fontWeight: "500",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#E8EDF5",
  },

  textInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    backgroundColor: "#F4F7FB",
    borderWidth: 1,
    borderColor: "#E0E7F1",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    color: "#26364D",
    fontSize: 15,
    marginRight: 10,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2F6FED",
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonDisabled: {
    backgroundColor: "#A9BFEF",
  },

  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "700",
  },

  footerText: {
    backgroundColor: "#FFFFFF",
    color: "#8A94A6",
    fontSize: 11,
    textAlign: "center",
    paddingBottom: 8,
  },
});