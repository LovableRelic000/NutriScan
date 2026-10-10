// Servicio de Notificaciones Locales (expo-notifications)
// Exclusivamente local, sin servidores remotos ni permisos de alarmas exactas

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { WaterReminderSettings } from '@/data/models/user';

// Configurar comportamiento cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const WATER_MESSAGES = [
  '¡Momento de hidratarte! Tu cuerpo y mente te lo agradecerán.',
  'Un vaso de agua fresca te ayudará a mantener tu concentración y energía.',
  '¿Ya tomaste agua? Mantén tu meta diaria de hidratación al día.',
  'Recuerda beber agua para favorecer una digestión ligera y saludable.',
];

export class NotificationService {
  private static channelsInitialized = false;

  /**
   * Configura los canales de notificación en Android y solicita permisos
   */
  static async setup(): Promise<boolean> {
    if (Platform.OS === 'android' && !this.channelsInitialized) {
      await Notifications.setNotificationChannelAsync('water-channel', {
        name: 'Recordatorios de Hidratación',
        description: 'Avisos periódicos para beber agua durante el día',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0284C7',
      });

      await Notifications.setNotificationChannelAsync('activity-channel', {
        name: 'Alertas de Actividad y Pasos',
        description: 'Notificaciones sobre el avance de tu meta diaria de pasos',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200],
        lightColor: '#F97316',
      });

      this.channelsInitialized = true;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  private static lastWaterScheduleKey = '';

  /**
   * Programa recordatorios diarios de agua dividiendo la meta en vasos de 250 ml
   * distribuidos a lo largo del día entre las 7:00 y las 22:00 (nunca entre 23:00 y 06:00).
   */
  static async scheduleWaterReminders(
    waterGoalOrSettings: number | WaterReminderSettings = 2000,
    enabledParam: boolean = true
  ): Promise<void> {
    let dailyWaterMl = 2000;
    let enabled = enabledParam;

    if (typeof waterGoalOrSettings === 'object' && waterGoalOrSettings !== null) {
      enabled = waterGoalOrSettings.enabled;
    } else if (typeof waterGoalOrSettings === 'number') {
      dailyWaterMl = waterGoalOrSettings;
    }

    if (!enabled) {
      this.lastWaterScheduleKey = '';
      await this.cancelAllWaterReminders();
      return;
    }

    // Evitar reprogramar innecesariamente si la configuración es idéntica
    const scheduleKey = `water-${dailyWaterMl}-${enabled}`;
    if (this.lastWaterScheduleKey === scheduleKey) {
      return;
    }

    const hasPermission = await this.setup();
    if (!hasPermission) return;

    // Cancelar recordatorios previos de agua
    await this.cancelAllWaterReminders();

    // 1 vaso = 250 ml
    const GLASS_ML = 250;
    const glassesCount = Math.max(3, Math.min(14, Math.ceil(dailyWaterMl / GLASS_ML)));

    // Ventana diurna: 07:00 (420 min) a 22:00 (1320 min) — garantizado fuera de 23:00 a 06:00
    const START_MINUTE = 420; // 07:00 hrs
    const END_MINUTE = 1320;  // 22:00 hrs
    const spanMinutes = END_MINUTE - START_MINUTE;

    for (let i = 0; i < glassesCount; i++) {
      const targetMinute =
        glassesCount === 1
          ? 720
          : Math.round(START_MINUTE + (i * spanMinutes) / (glassesCount - 1));

      const hour = Math.floor(targetMinute / 60);
      const minute = targetMinute % 60;
      const glassNumber = i + 1;

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `💧 Vaso ${glassNumber} de ${glassesCount} (250 ml)`,
            body: `Momento de hidratarte para avanzar hacia tu meta diaria de ${dailyWaterMl} ml.`,
            sound: true,
            data: { type: 'water_reminder', glass: glassNumber },
            ...(Platform.OS === 'android' ? { channelId: 'water-channel' } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
      } catch (e) {
        console.warn(`No se pudo programar recordatorio de agua para vaso ${glassNumber} a las ${hour}:${minute}`, e);
      }
    }

    this.lastWaterScheduleKey = scheduleKey;
  }

  /**
   * Cancela todas las notificaciones programadas de agua
   */
  static async cancelAllWaterReminders(): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.content.data?.type === 'water_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch (e) {
      console.warn('Error al cancelar recordatorios de agua:', e);
    }
  }

  /**
   * Programa o ajusta la alerta de inactividad fija de las 18:00 hrs
   */
  static async updateInactivityAlert(currentSteps: number, goalSteps: number, enabled: boolean): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.content.data?.type === 'inactivity_alert') {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }

      if (!enabled) return;

      const remaining = Math.max(0, goalSteps - currentSteps);

      // Si la app está abierta y ya se alcanzó la meta de hoy, no molestar hoy
      if (remaining === 0) return;

      const hasPermission = await this.setup();
      if (!hasPermission) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚶 Meta de Actividad Diaria',
          body: `¡Aún estás a tiempo! Te faltan ${remaining.toLocaleString('es-MX')} pasos para completar tu objetivo de hoy.`,
          sound: true,
          data: { type: 'inactivity_alert' },
          ...(Platform.OS === 'android' ? { channelId: 'activity-channel' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 18,
          minute: 0,
        },
      });
    } catch (e) {
      console.warn('Error al actualizar alerta de inactividad:', e);
    }
  }

  /**
   * Dispara una notificación de prueba en 10 segundos (para la demostración)
   */
  static async triggerTestNotification(): Promise<string> {
    await this.setup();

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Notificación de Prueba — NutriScan AI',
        body: 'Demostración de notificación local exitosa en tu dispositivo.',
        sound: true,
        data: { type: 'demo_test' },
        ...(Platform.OS === 'android' ? { channelId: 'water-channel' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 10,
        repeats: false,
      },
    });
  }
}
