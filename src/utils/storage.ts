import localforage from 'localforage';
import { ImageItem, NoteItem, User } from '../types';

localforage.config({
  name: 'InspirationCollector',
  version: 1.0,
  storeName: 'inspiration_data',
});

const IMAGES_KEY = 'images';
const NOTES_KEY = 'notes';
const USER_KEY = 'user';

export const storage = {
  async getImages(): Promise<ImageItem[]> {
    const images = await localforage.getItem<ImageItem[]>(IMAGES_KEY);
    return images || [];
  },
  
  async getImagesByUser(userId: string): Promise<ImageItem[]> {
    const images = await this.getImages();
    return images.filter(img => img.user_id === userId);
  },
  
  async saveImages(images: ImageItem[]): Promise<void> {
    await localforage.setItem(IMAGES_KEY, images);
  },
  
  async addImage(image: ImageItem): Promise<void> {
    const images = await this.getImages();
    images.unshift(image);
    await this.saveImages(images);
  },

  async updateImage(id: string, updates: Partial<ImageItem>): Promise<void> {
    const images = await this.getImages();
    const index = images.findIndex(img => img.id === id);
    if (index !== -1) {
      images[index] = { ...images[index], ...updates };
      await this.saveImages(images);
    }
  },

  async deleteImage(id: string): Promise<void> {
    const images = await this.getImages();
    await this.saveImages(images.filter(img => img.id !== id));
  },

  async getNotes(): Promise<NoteItem[]> {
    const notes = await localforage.getItem<NoteItem[]>(NOTES_KEY);
    return notes || [];
  },

  async getNotesByUser(userId: string): Promise<NoteItem[]> {
    const notes = await this.getNotes();
    return notes.filter(note => note.user_id === userId);
  },

  async saveNotes(notes: NoteItem[]): Promise<void> {
    await localforage.setItem(NOTES_KEY, notes);
  },

  async addNote(note: NoteItem): Promise<void> {
    const notes = await this.getNotes();
    notes.unshift(note);
    await this.saveNotes(notes);
  },

  async updateNote(id: string, updates: Partial<NoteItem>): Promise<void> {
    const notes = await this.getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
      notes[index] = { ...notes[index], ...updates, updated_at: new Date().toISOString() };
      await this.saveNotes(notes);
    }
  },

  async deleteNote(id: string): Promise<void> {
    const notes = await this.getNotes();
    await this.saveNotes(notes.filter(n => n.id !== id));
  },

  async getUser(): Promise<User | null> {
    return await localforage.getItem<User>(USER_KEY);
  },

  async saveUser(user: User): Promise<void> {
    await localforage.setItem(USER_KEY, user);
  },
  
  async exportData(): Promise<string> {
    const images = await this.getImages();
    const notes = await this.getNotes();
    const user = await this.getUser();
    
    const data = { images, notes, user };
    return JSON.stringify(data);
  },
  
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      if (data.images) await this.saveImages(data.images);
      if (data.notes) await this.saveNotes(data.notes);
      if (data.user) await this.saveUser(data.user);
    } catch (error) {
      console.error('Failed to import data', error);
      throw new Error('Invalid data format');
    }
  }
};
