import toast from 'react-hot-toast';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown, fallbackMessage?: string) {
  if (error instanceof AppError) {
    toast.error(error.message);
    console.error(`[${error.code || 'ERROR'}] ${error.message}`);
  } else if (error instanceof Error) {
    toast.error(fallbackMessage || error.message);
    console.error(error);
  } else {
    toast.error(fallbackMessage || 'Une erreur est survenue');
    console.error(error);
  }
}
