import { createClient } from '@/utils/supabase/server';
import fs from 'fs';
import path from 'path';

export const storageService = {
  async save(fileName: string, content: string | Buffer): Promise<string> {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    const bucket = 'einvoices';
    const filePath = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;
    
    // In local development, save to the file system
    if (process.env.NODE_ENV === 'development') {
      const dir = path.join(process.cwd(), 'storage', bucket, `${new Date().getFullYear()}`, `${new Date().getMonth() + 1}`);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const fullPath = path.join(dir, fileName);
      fs.writeFileSync(fullPath, buffer);
      return fullPath;
    }
    
    // In production, use Supabase Storage
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
      contentType: fileName.endsWith('.xml') ? 'application/xml' : (fileName.endsWith('.zip') ? 'application/zip' : 'application/pdf'),
      upsert: true, // Replace if exists
    });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload: ${error.message}`);
    }

    return filePath;
  },

  async getDownloadUrl(filePath: string): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
      // For local development, this would ideally return a route that reads the file
      // In this app, we will handle this in the API route. We just return the path.
      return filePath;
    }
    
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from('einvoices').createSignedUrl(filePath, 3600); // 1 hour expiry
    if (error) {
      throw new Error(`Failed to create download url: ${error.message}`);
    }
    return data.signedUrl;
  },
  
  async getFileBuffer(filePath: string): Promise<Buffer> {
    if (process.env.NODE_ENV === 'development') {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
      }
      throw new Error('File not found');
    }
    
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from('einvoices').download(filePath);
    if (error || !data) {
       throw new Error('File not found in storage');
    }
    
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
};
