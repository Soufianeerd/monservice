import { generateId } from '../../utils/id-generator';

const SIMULATED_LATENCY = 100; // ms (reduced for better UX)

export abstract class BaseRepository<T extends { id: string }> {
  protected items: T[] = [];
  private initialData: T[];
  private storageKey: string;
  private loaded: boolean = false;

  constructor(initialData: T[] = []) {
    this.initialData = [...initialData];
    this.storageKey = `monservice_data_${this.constructor.name}`;
  }

  protected ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        try {
          this.items = JSON.parse(stored);
          return;
        } catch (e) {
          console.error(`Error parsing ${this.storageKey} from localStorage`, e);
        }
      }
    }
    // Fallback to initial data if no localStorage or SSR
    this.items = [...this.initialData];
    this.persist();
  }

  protected persist() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    }
  }

  protected async simulateLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY));
  }

  async getAll(): Promise<T[]> {
    this.ensureLoaded();
    await this.simulateLatency();
    return [...this.items];
  }

  async getById(id: string): Promise<T | null> {
    this.ensureLoaded();
    await this.simulateLatency();
    const item = this.items.find((i) => i.id === id);
    return item ? { ...item } : null;
  }

  async create(data: Omit<T, 'id'> & { id?: string }): Promise<T> {
    this.ensureLoaded();
    await this.simulateLatency();
    const newItem = {
      ...data,
      id: data.id || generateId(),
    } as T;
    this.items.push(newItem);
    this.persist();
    return { ...newItem };
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    this.ensureLoaded();
    await this.simulateLatency();
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const updatedItem = {
      ...this.items[index],
      ...data,
    };
    this.items[index] = updatedItem;
    this.persist();
    return { ...updatedItem };
  }

  async delete(id: string): Promise<boolean> {
    this.ensureLoaded();
    await this.simulateLatency();
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) return false;

    this.items.splice(index, 1);
    this.persist();
    return true;
  }
}
