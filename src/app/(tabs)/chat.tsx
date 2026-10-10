// Pantalla de Chat Nutri-AI Pro con Google Gemini REST API

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius, spacing, colors } from '@/core/theme';
import { useTheme } from '@/core/themeStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { GeminiService, ChatMessage } from '@/services/gemini/geminiService';
import { ScanRepository } from '@/data/repositories/scanRepository';
import { ScanDocument } from '@/data/models/scan';
import { APP_CONFIG } from '@/core/config';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const QUICK_PROMPTS = [
  '¿Qué alternativas seguras tengo a los lácteos?',
  '¿Cómo interpreto las trazas de gluten en las etiquetas?',
  'Recomiéndame snacks saludables sin cacahuate ni nueces.',
  '¿Cuánta agua debo beber adicional si hago ejercicio?',
];

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const { user, userDoc, isPro } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [lastScan, setLastScan] = useState<ScanDocument | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Cargar el último escaneo para brindar contexto
  useEffect(() => {
    async function loadLastScan() {
      if (user) {
        try {
          const recent = await ScanRepository.getRecentScans(user.uid, 1);
          if (recent.length > 0) {
            setLastScan(recent[0]);
          }
        } catch (e) {
          console.warn('No se pudo cargar el último escaneo para contexto de chat:', e);
        }
      }
    }
    loadLastScan();
  }, [user]);

  // Mensaje de bienvenida inicial
  useEffect(() => {
    if (messages.length === 0 && isPro) {
      const welcomeName = userDoc?.display_name || 'amigo';
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          text: `¡Hola ${welcomeName}! Soy tu asistente Nutri-AI Pro. Conozco tus preferencias y alergias registradas. ¿En qué puedo orientarte hoy sobre tu alimentación, ingredientes o hidratación?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isPro, userDoc]);

  // Si el usuario no es Pro, mostrar compuerta de bloqueo Pro
  if (!isPro) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.lockedContainer}>
          <MaterialCommunityIcons
            name="robot-happy-outline"
            size={64}
            color={colors.accent}
            style={{ marginBottom: spacing.md }}
          />
          <Text style={styles.lockedTitle}>Asistente Nutri-AI Pro</Text>
          <Text style={styles.lockedSubtitle}>
            Esta función exclusiva utiliza inteligencia artificial para resolver dudas sobre tus alimentos, ingredientes dudosos y hábitos de bienestar.
          </Text>

          <Card style={styles.benefitsCard}>
            <Text style={styles.benefitItem}>✓ Respuestas personalizadas a tus alergias declaradas</Text>
            <Text style={styles.benefitItem}>✓ Interpretación de aditivos y trazas complejas</Text>
            <Text style={styles.benefitItem}>✓ Consejos de crononutrición y planes de hidratación</Text>
          </Card>

          <Button
            title="Desbloquear Nutri-AI Pro"
            variant="primary"
            size="lg"
            onPress={() => router.push('/subscription')}
            style={{ width: '85%', marginTop: spacing.md, backgroundColor: colors.accent }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    // Verificar límite de mensajes por sesión
    const userMessageCount = messages.filter((m) => m.role === 'user').length;
    if (userMessageCount >= APP_CONFIG.CHAT_LIMITS.MAX_SESSION_MESSAGES) {
      Alert.alert(
        'Límite de Sesión',
        'Has alcanzado el límite de 30 consultas por sesión para mantener un uso eficiente. Puedes limpiar la conversación para iniciar una nueva.'
      );
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText('');
    setIsTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const responseText = await GeminiService.sendMessage({
        userMessage: text,
        history: newHistory,
        profile: userDoc?.health_profile,
        lastScan,
      });

      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, modelMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `⚠️ ${err.message || 'Ocurrió un error al procesar tu consulta.'}`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      'Limpiar Conversación',
      '¿Deseas borrar los mensajes de esta sesión en memoria?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.userMessageRow : styles.modelMessageRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : [styles.modelBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
            item.isError && styles.errorBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : [styles.modelMessageText, { color: colors.text }],
              item.isError && styles.errorMessageText,
            ]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Cabecera del Chat */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="robot-happy" size={24} color={colors.accent} style={{ marginRight: 8 }} />
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Nutri-AI Pro</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Tu asesor nutricional con inteligencia artificial</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleClearChat}
            style={[
              styles.clearBtn,
              { backgroundColor: isDark ? colors.surfaceVariant : '#F3F4F6', borderColor: colors.border }
            ]}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>Limpiar</Text>
          </TouchableOpacity>
        </View>

        {/* Aviso Fijo Médico Obligatorio */}
        <View
          style={[
            styles.medicalDisclaimer,
            {
              backgroundColor: isDark ? '#2A1E0A' : '#FEF3C7',
              borderBottomColor: isDark ? '#423112' : '#FDE68A',
            },
          ]}
        >
          <MaterialCommunityIcons
            name="scale-balance"
            size={16}
            color={isDark ? '#FBBF24' : '#B45309'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.disclaimerText,
              { color: isDark ? '#FDE68A' : '#92400E' },
            ]}
          >
            Aviso: Este asistente no sustituye el diagnóstico ni el consejo médico profesional.
          </Text>
        </View>

        {/* Lista de Mensajes */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.typingText}>Nutri-AI Pro está analizando...</Text>
              </View>
            ) : null
          }
        />

        {/* Sugerencias Rápidas si hay pocos mensajes */}
        {messages.length <= 2 && (
          <View style={styles.quickPromptsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.promptChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleSend(prompt)}
                >
                  <Text style={[styles.promptChipText, { color: colors.textSecondary }]}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Campo de Entrada de Texto */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Pregunta sobre ingredientes o hábitos..."
            placeholderTextColor={colors.textMuted}
            style={[styles.inputField, { backgroundColor: colors.surfaceVariant, color: colors.text }]}
            multiline
            maxLength={400}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
            style={[
              styles.sendButton,
              (!inputText.trim() || isTyping) && styles.sendButtonDisabled,
            ]}
          >
            <MaterialCommunityIcons
              name="send"
              size={18}
              color={!inputText.trim() || isTyping ? colors.textMuted : '#FFF'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  medicalDisclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  disclaimerText: {
    fontSize: 11,
    flexShrink: 1,
    fontWeight: '600',
    lineHeight: 15,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  lockedIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  benefitsCard: {
    width: '100%',
    padding: spacing.md,
  },
  benefitItem: {
    fontSize: 13,
    color: colors.text,
    marginVertical: 4,
    fontWeight: '500',
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.lg,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  modelMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  modelBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBubble: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modelMessageText: {
    color: colors.text,
  },
  errorMessageText: {
    color: '#991B1B',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typingText: {
    fontSize: 12,
    color: colors.accent,
    marginLeft: spacing.sm,
    fontStyle: 'italic',
  },
  quickPromptsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  promptChip: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  promptChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  inputField: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendIcon: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
