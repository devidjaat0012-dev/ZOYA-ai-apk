/**
 * Zoya Smart Reminder & Alarm Service
 * Manages reminders, alarms, background triggers, voice commands, and audio alerts.
 */

export type ReminderCategory =
  | "general"
  | "health"
  | "work"
  | "love"
  | "medicine"
  | "water"
  | "study";

export interface ZoyaReminder {
  id: string;
  title: string;
  scheduledTime: number; // Unix timestamp in ms
  category: ReminderCategory;
  priority: "low" | "medium" | "high";
  completed: boolean;
  triggered: boolean;
  createdAt: number;
  voiceAnnounced?: boolean;
}

const STORAGE_KEY = "zoya_reminders_v1";

type ReminderListener = (reminders: ZoyaReminder[]) => void;
type TriggerListener = (reminder: ZoyaReminder) => void;

class ReminderService {
  private listeners: Set<ReminderListener> = new Set();
  private triggerListeners: Set<TriggerListener> = new Set();
  private checkInterval: any = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.startBackgroundChecker();
  }

  public getReminders(): ZoyaReminder[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("Failed to load reminders from localStorage", e);
    }
    return [];
  }

  public saveReminders(reminders: ZoyaReminder[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
      this.notifyListeners(reminders);
    } catch (e) {
      console.warn("Failed to save reminders to localStorage", e);
    }
  }

  public addReminder(
    title: string,
    delayMinutesOrTimestamp: number,
    category: ReminderCategory = "general",
    priority: "low" | "medium" | "high" = "medium"
  ): ZoyaReminder {
    const now = Date.now();
    let scheduledTime: number;

    // If less than 1 year in ms (~3e10), treat as relative minutes from now
    if (delayMinutesOrTimestamp < 100000000) {
      const minutes = Math.max(0.5, delayMinutesOrTimestamp);
      scheduledTime = now + Math.round(minutes * 60 * 1000);
    } else {
      scheduledTime = delayMinutesOrTimestamp;
    }

    const cleanTitle = title.trim() || "Important Reminder";

    // Infer category if general
    let finalCategory = category;
    const lower = cleanTitle.toLowerCase();
    if (lower.includes("paani") || lower.includes("water") || lower.includes("hydration")) {
      finalCategory = "water";
    } else if (lower.includes("medicine") || lower.includes("dawa") || lower.includes("tablet") || lower.includes("doctor")) {
      finalCategory = "medicine";
    } else if (lower.includes("exercise") || lower.includes("gym") || lower.includes("walk") || lower.includes("workout")) {
      finalCategory = "health";
    } else if (lower.includes("meeting") || lower.includes("call") || lower.includes("project") || lower.includes("code") || lower.includes("study") || lower.includes("padhai")) {
      finalCategory = "work";
    } else if (lower.includes("love") || lower.includes("kiss") || lower.includes("date") || lower.includes("zoya") || lower.includes("pyar")) {
      finalCategory = "love";
    }

    const newReminder: ZoyaReminder = {
      id: `rem_${now}_${Math.random().toString(36).slice(2, 7)}`,
      title: cleanTitle,
      scheduledTime,
      category: finalCategory,
      priority,
      completed: false,
      triggered: false,
      createdAt: now,
    };

    const current = this.getReminders();
    const updated = [newReminder, ...current].sort((a, b) => a.scheduledTime - b.scheduledTime);
    this.saveReminders(updated);
    return newReminder;
  }

  public deleteReminder(id: string): void {
    const current = this.getReminders();
    const updated = current.filter((r) => r.id !== id);
    this.saveReminders(updated);
  }

  public toggleComplete(id: string): void {
    const current = this.getReminders();
    const updated = current.map((r) =>
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    this.saveReminders(updated);
  }

  public snoozeReminder(id: string, snoozeMinutes: number = 5): ZoyaReminder | null {
    const current = this.getReminders();
    let snoozedItem: ZoyaReminder | null = null;
    const updated = current.map((r) => {
      if (r.id === id) {
        const nextTime = Date.now() + snoozeMinutes * 60 * 1000;
        snoozedItem = {
          ...r,
          scheduledTime: nextTime,
          triggered: false,
          voiceAnnounced: false,
          completed: false,
        };
        return snoozedItem;
      }
      return r;
    });

    if (snoozedItem) {
      this.saveReminders(updated.sort((a, b) => a.scheduledTime - b.scheduledTime));
    }
    return snoozedItem;
  }

  public clearCompleted(): void {
    const current = this.getReminders();
    const updated = current.filter((r) => !r.completed);
    this.saveReminders(updated);
  }

  public clearAll(): void {
    this.saveReminders([]);
  }

  /**
   * Subscribes to reminder list updates
   */
  public subscribe(callback: ReminderListener): () => void {
    this.listeners.add(callback);
    callback(this.getReminders());
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Subscribes to reminder ring / alarm events
   */
  public onReminderTrigger(callback: TriggerListener): () => void {
    this.triggerListeners.add(callback);
    return () => {
      this.triggerListeners.delete(callback);
    };
  }

  private notifyListeners(reminders: ZoyaReminder[]): void {
    this.listeners.forEach((listener) => {
      try {
        listener(reminders);
      } catch (e) {
        console.warn("Reminder listener error", e);
      }
    });
  }

  /**
   * Background checker running every 2.5 seconds
   */
  private startBackgroundChecker(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      const now = Date.now();
      const reminders = this.getReminders();
      let hasChanges = false;

      const updated = reminders.map((r) => {
        // If due and not yet triggered/completed
        if (!r.completed && !r.triggered && r.scheduledTime <= now) {
          hasChanges = true;
          const triggeredItem = { ...r, triggered: true };
          // Play melody chime
          this.playMelodicAlarmChime();
          // Fire trigger listeners
          this.triggerListeners.forEach((fn) => {
            try {
              fn(triggeredItem);
            } catch (err) {
              console.warn("Trigger listener error", err);
            }
          });
          return triggeredItem;
        }
        return r;
      });

      if (hasChanges) {
        this.saveReminders(updated);
      }
    }, 2500);
  }

  /**
   * Melodic alarm chime synthesized using Web Audio API
   * Crisp, sweet, non-jarring multi-tone chord (C5 -> E5 -> G5 -> C6)
   */
  public playMelodicAlarmChime(): void {
    try {
      const AudioCtxClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx || this.audioCtx.state === "closed") {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // 4 Sweet Melodic Notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.7);
      });
    } catch (e) {
      console.warn("Could not play alarm chime audio", e);
    }
  }

  /**
   * Parse Hinglish and English voice commands into Reminder actions
   */
  public parseVoiceReminderCommand(promptText: string): {
    isReminderCommand: boolean;
    action: "add" | "list" | "delete_all" | "none";
    title?: string;
    delayMinutes?: number;
    scheduledTime?: number;
    feedbackMessage?: string;
  } {
    const raw = promptText.trim().toLowerCase();

    // Check if voice input is about reminders
    const isReminderWord =
      raw.includes("reminder") ||
      raw.includes("remind") ||
      raw.includes("yaad dila") ||
      raw.includes("yaad dilana") ||
      raw.includes("yaad rakhna");

    if (!isReminderWord) {
      return { isReminderCommand: false, action: "none" };
    }

    // 1. Check for list command
    if (
      raw.includes("list") ||
      raw.includes("dikhao") ||
      raw.includes("batao") ||
      raw.includes("kya hai") ||
      raw.includes("what are") ||
      raw.includes("show my") ||
      raw.includes("check reminder")
    ) {
      const active = this.getReminders().filter((r) => !r.completed);
      if (active.length === 0) {
        return {
          isReminderCommand: true,
          action: "list",
          feedbackMessage: "Aapka abhi koi active reminder nahi hai! Sab tasks complete hain.",
        };
      }
      const listStr = active
        .map((r, i) => `${i + 1}. ${r.title} (${this.formatTimeRemaining(r.scheduledTime)})`)
        .join(", ");
      return {
        isReminderCommand: true,
        action: "list",
        feedbackMessage: `Aapke ye reminders scheduled hain: ${listStr}`,
      };
    }

    // 2. Check for delete all command
    if (
      raw.includes("delete all") ||
      raw.includes("saare delete") ||
      raw.includes("clear all") ||
      raw.includes("hata do") ||
      raw.includes("clear reminder")
    ) {
      this.clearAll();
      return {
        isReminderCommand: true,
        action: "delete_all",
        feedbackMessage: "Maine aapke saare reminders clear kar diye hain!",
      };
    }

    // 3. Adding a new reminder
    // Extract time / duration
    let delayMinutes = 10; // default 10 minutes

    // Check relative minutes: e.g. "10 minute", "5 mins", "15 min baad", "aadhe ghante baad"
    const minMatch = raw.match(/(\d+)\s*(?:minute|min|m\b)/i);
    const hourMatch = raw.match(/(\d+)\s*(?:ghanta|ghante|hour|hr)/i);

    if (raw.includes("aadhe ghante") || raw.includes("aadha ghanta") || raw.includes("half an hour")) {
      delayMinutes = 30;
    } else if (raw.includes("ek ghante") || raw.includes("1 ghanta") || raw.includes("one hour")) {
      delayMinutes = 60;
    } else if (hourMatch) {
      delayMinutes = parseInt(hourMatch[1], 10) * 60;
    } else if (minMatch) {
      delayMinutes = parseInt(minMatch[1], 10);
    } else {
      // Check absolute time e.g. "5 baje", "8:30 pm", "at 4 pm"
      const timeMatch = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)?/i);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1], 10);
        const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const isPm = raw.includes("pm") || (raw.includes("shaam") && hour <= 12);
        const isAm = raw.includes("am") || (raw.includes("subah") && hour <= 12);

        const targetDate = new Date();
        let targetHours = hour;
        if (isPm && targetHours < 12) targetHours += 12;
        if (isAm && targetHours === 12) targetHours = 0;

        targetDate.setHours(targetHours, mins, 0, 0);

        // If target time is already in the past today, schedule for tomorrow
        if (targetDate.getTime() <= Date.now()) {
          targetDate.setDate(targetDate.getDate() + 1);
        }

        const diffMinutes = Math.max(1, Math.round((targetDate.getTime() - Date.now()) / 60000));
        delayMinutes = diffMinutes;
      }
    }

    // Extract title
    // Remove command keywords
    let title = raw
      .replace(/zoya/gi, "")
      .replace(/mujhe/gi, "")
      .replace(/kripya/gi, "")
      .replace(/please/gi, "")
      .replace(/reminder\s*(?:lagao|set karo|add karo|dalo|lagana|karo)?/gi, "")
      .replace(/remind me to/gi, "")
      .replace(/remind me/gi, "")
      .replace(/yaad dila dena/gi, "")
      .replace(/yaad dilana/gi, "")
      .replace(/yaad dila/gi, "")
      .replace(/\d+\s*(?:minute|min|m|ghanta|ghante|hour|hr|baje)\s*(?:baad|ke baad|after)?/gi, "")
      .replace(/(?:in|after)\s*\d+\s*(?:minutes|mins|hours)/gi, "")
      .replace(/ka\s*reminder/gi, "")
      .replace(/ke liye/gi, "")
      .replace(/baad/gi, "")
      .trim();

    if (!title || title.length < 2) {
      title = "Important Reminder";
    }

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    const reminder = this.addReminder(title, delayMinutes);

    return {
      isReminderCommand: true,
      action: "add",
      title: reminder.title,
      delayMinutes,
      scheduledTime: reminder.scheduledTime,
      feedbackMessage: `Maine aapka reminder set kar diya hai: "${reminder.title}" ${this.formatTimeRemaining(
        reminder.scheduledTime
      )} ke liye! Main aapko theek time par yaad dila dungi.`,
    };
  }

  public formatTimeRemaining(scheduledTime: number): string {
    const diff = scheduledTime - Date.now();
    if (diff <= 0) return "Abhi (Just now)";

    const totalMinutes = Math.round(diff / 60000);
    if (totalMinutes < 60) {
      return `${totalMinutes} minute baad`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours} ghante ${mins} min baad` : `${hours} ghante baad`;
  }

  public formatAbsoluteTime(scheduledTime: number): string {
    const date = new Date(scheduledTime);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

export const reminderService = new ReminderService();
