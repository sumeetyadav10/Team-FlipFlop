import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';

export class ScreenshotService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Store screenshot in Supabase
   * Supports both base64 storage in database and file storage in Supabase Storage
   */
  async storeScreenshot(
    teamId: string,
    userId: string,
    screenshot: {
      filename: string;
      data: string; // Base64 encoded image data
      mimeType?: string;
      memoryId?: string;
      metadata?: Record<string, any>;
    }
  ) {
    try {
      // Extract base64 data (remove data URL prefix if present)
      const base64Data = screenshot.data.replace(/^data:image\/\w+;base64,/, '');
      
      // Calculate size from base64 (approximate)
      const sizeBytes = Math.ceil((base64Data.length * 3) / 4);
      
      // Get image dimensions if possible (would need image processing library in production)
      let width: number | null = null;
      let height: number | null = null;
      
      // Option 1: Store in Supabase Storage (recommended for production)
      let storagePath: string | null = null;
      const useStorage = process.env.USE_SUPABASE_STORAGE === 'true';
      
      if (useStorage) {
        // Upload to Supabase Storage
        const storageFileName = `${teamId}/${userId}/${Date.now()}_${screenshot.filename}`;
        
        const { data: uploadData, error: uploadError } = await this.supabase
          .storage
          .from('screenshots')
          .upload(storageFileName, decode(base64Data), {
            contentType: screenshot.mimeType || 'image/png',
            upsert: false
          });
          
        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          // Fall back to base64 storage
        } else {
          storagePath = uploadData.path;
        }
      }
      
      // Store metadata in database
      const { data, error } = await (this.supabase as any)
        .from('screenshots')
        .insert({
          team_id: teamId,
          user_id: userId,
          memory_id: screenshot.memoryId,
          filename: screenshot.filename,
          size_bytes: sizeBytes,
          mime_type: screenshot.mimeType || 'image/png',
          width,
          height,
          storage_path: storagePath,
          base64_data: storagePath ? null : base64Data, // Only store base64 if not using Storage
          metadata: screenshot.metadata || {}
        })
        .select()
        .single();
        
      if (error) {
        throw new Error(`Failed to store screenshot: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error('Screenshot storage error:', error);
      throw error;
    }
  }

  /**
   * Get screenshot by ID
   */
  async getScreenshot(screenshotId: string, teamId: string) {
    const { data, error } = await this.supabase
      .from('screenshots')
      .select('*')
      .eq('id', screenshotId)
      .eq('team_id', teamId)
      .single();
      
    if (error) {
      throw new Error('Screenshot not found');
    }
    
    // If stored in Supabase Storage, get the public URL
    if ((data as any)?.storage_path) {
      const { data: { publicUrl } } = (this.supabase as any)
        .storage
        .from('screenshots')
        .getPublicUrl((data as any).storage_path);
        
      return Object.assign({}, data || {}, {
        url: publicUrl
      });
    }
    
    // If stored as base64, return with data URL
    if ((data as any)?.base64_data) {
      return Object.assign({}, data || {}, {
        url: `data:${(data as any).mime_type};base64,${(data as any).base64_data}`
      });
    }
    
    return data || {};
  }

  /**
   * List screenshots for a memory
   */
  async getMemoryScreenshots(memoryId: string, teamId: string) {
    const { data, error } = await this.supabase
      .from('screenshots')
      .select('*')
      .eq('memory_id', memoryId)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new Error(`Failed to fetch screenshots: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Delete screenshot
   */
  async deleteScreenshot(screenshotId: string, userId: string) {
    // Get screenshot first to check ownership and get storage path
    const { data: screenshot, error: fetchError } = await this.supabase
      .from('screenshots')
      .select('*')
      .eq('id', screenshotId)
      .eq('user_id', userId)
      .single();
      
    if (fetchError || !screenshot) {
      throw new Error('Screenshot not found or access denied');
    }
    
    // Delete from storage if applicable
    if ((screenshot as any)?.storage_path) {
      await (this.supabase as any)
        .storage
        .from('screenshots')
        .remove([(screenshot as any).storage_path]);
    }
    
    // Delete from database
    const { error } = await this.supabase
      .from('screenshots')
      .delete()
      .eq('id', screenshotId)
      .eq('user_id', userId);
      
    if (error) {
      throw new Error(`Failed to delete screenshot: ${error.message}`);
    }
    
    return { success: true };
  }
}

// Helper function to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}