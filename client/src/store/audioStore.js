import { create } from 'zustand';
import { audioManager } from '../audio/AudioManager';

export const useAudioStore = create((set, get) => ({
  soundEnabled: localStorage.getItem('happy_drop_sound') !== 'false',
  musicEnabled: localStorage.getItem('happy_drop_music') !== 'false',

  toggleSound: () => {
    const next = !get().soundEnabled;
    localStorage.setItem('happy_drop_sound', String(next));
    audioManager.setSfxEnabled(next);
    set({ soundEnabled: next });
    if (next) {
      audioManager.play('click');
    }
  },

  toggleMusic: () => {
    const next = !get().musicEnabled;
    localStorage.setItem('happy_drop_music', String(next));
    audioManager.setMusicEnabled(next);
    set({ musicEnabled: next });
    if (next) {
      audioManager.startMusic();
    } else {
      audioManager.stopMusic();
    }
  },

  setSoundEnabled: (enabled) => {
    localStorage.setItem('happy_drop_sound', String(enabled));
    audioManager.setSfxEnabled(enabled);
    set({ soundEnabled: enabled });
  },

  setMusicEnabled: (enabled) => {
    localStorage.setItem('happy_drop_music', String(enabled));
    audioManager.setMusicEnabled(enabled);
    set({ musicEnabled: enabled });
  },
}));
