import { supabase } from '@/services/supabase/client';
import type {
  AdminFeedbackItem,
  AdminFeedbackSummary,
  FeedbackPriority,
  FeedbackRow,
  FeedbackStatus,
  FeedbackType,
  FeedbackPromptState,
  SubmitFeedbackPayload,
  UserFeedbackItem,
} from '@/types';

const ALLOWED_SCREENSHOT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB

const USER_FEEDBACK_COLUMNS =
  'id, user_id, feedback_type, category, title, description, benefit_or_impact, steps_to_reproduce, expected_behavior, actual_behavior, page_url, priority, screenshot_path, status, admin_response, created_at, updated_at';

/**
 * Submit a new feedback item (Feature Request, Bug Report, or General Feedback).
 * Validates inputs and uploads optional bug screenshots to the private bucket.
 */
export async function submitFeedback(
  payload: SubmitFeedbackPayload
): Promise<{ data: UserFeedbackItem | null; error: Error | null }> {
  let uploadedScreenshotPath: string | null = null;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('You must be signed in to submit feedback.');
    }

    const cleanTitle = payload.title.trim();
    const cleanDescription = payload.description.trim();

    if (cleanTitle.length < 3 || cleanTitle.length > 180) {
      throw new Error('Title must be between 3 and 180 characters.');
    }
    if (cleanDescription.length < 10 || cleanDescription.length > 4000) {
      throw new Error('Description must be between 10 and 4000 characters.');
    }

    if (payload.screenshotFile) {
      if (!ALLOWED_SCREENSHOT_TYPES.has(payload.screenshotFile.type)) {
        throw new Error('Screenshot must be a PNG, JPEG, or WebP image.');
      }
      if (payload.screenshotFile.size > MAX_SCREENSHOT_BYTES) {
        throw new Error('Screenshot file size must be 5 MB or smaller.');
      }

      const ext =
        payload.screenshotFile.type === 'image/png'
          ? 'png'
          : payload.screenshotFile.type === 'image/webp'
            ? 'webp'
            : 'jpg';
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('feedback-screenshots')
        .upload(filePath, payload.screenshotFile, {
          contentType: payload.screenshotFile.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          uploadError.message || 'Could not upload screenshot attachment.'
        );
      }
      uploadedScreenshotPath = filePath;
    }

    const priorityValue: FeedbackPriority | null =
      payload.priority && payload.priority.length > 0
        ? payload.priority
        : null;

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        feedback_type: payload.feedback_type,
        category: payload.category?.trim() || null,
        title: cleanTitle,
        description: cleanDescription,
        benefit_or_impact: payload.benefit_or_impact?.trim() || null,
        steps_to_reproduce: payload.steps_to_reproduce?.trim() || null,
        expected_behavior: payload.expected_behavior?.trim() || null,
        actual_behavior: payload.actual_behavior?.trim() || null,
        page_url: payload.page_url?.trim() || null,
        priority: priorityValue,
        screenshot_path: uploadedScreenshotPath,
      })
      .select(USER_FEEDBACK_COLUMNS)
      .single();

    if (error) {
      if (uploadedScreenshotPath) {
        await supabase.storage
          .from('feedback-screenshots')
          .remove([uploadedScreenshotPath])
          .catch(() => {});
      }
      throw error;
    }

    return { data: data as UserFeedbackItem, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch the authenticated user's own feedback history (never includes internal admin notes).
 */
export async function fetchMyFeedback(): Promise<{
  data: UserFeedbackItem[];
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('feedback')
      .select(USER_FEEDBACK_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data ?? []) as UserFeedbackItem[], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Generate a short-lived signed URL for a private feedback screenshot.
 */
export async function getFeedbackScreenshotSignedUrl(
  screenshotPath: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from('feedback-screenshots')
      .createSignedUrl(screenshotPath, 300);

    if (error) throw error;
    return { url: data?.signedUrl ?? null, error: null };
  } catch (err) {
    return { url: null, error: err as Error };
  }
}

/**
 * Record user engagement events in Supabase for the contextual feedback prompt.
 */
export async function recordFeedbackEngagement(
  eventType: 'session_start' | 'heartbeat' | 'meaningful_action',
  activeSecondsDelta = 0,
  actionName?: string
): Promise<FeedbackPromptState | null> {
  try {
    const { data, error } = await supabase.rpc('record_feedback_engagement', {
      p_event_type: eventType,
      p_active_seconds_delta: activeSecondsDelta,
      p_action_name: actionName ?? null,
    });
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Persist user response to the contextual feedback prompt in Supabase.
 */
export async function respondToFeedbackPrompt(
  decision: 'defer' | 'decline' | 'opened_feedback'
): Promise<FeedbackPromptState | null> {
  try {
    const { data, error } = await supabase.rpc('respond_to_feedback_prompt', {
      p_decision: decision,
    });
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Admin: fetch aggregate feedback summary metrics.
 */
export async function fetchAdminFeedbackSummary(): Promise<{
  data: AdminFeedbackSummary | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_get_feedback_summary');
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Admin: list all feedback submissions with optional type and status filters.
 */
export async function fetchAdminFeedbackList(filters?: {
  feedbackType?: FeedbackType | 'all';
  status?: FeedbackStatus | 'all';
  limit?: number;
  offset?: number;
}): Promise<{ data: AdminFeedbackItem[]; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('admin_list_feedback', {
      p_feedback_type:
        filters?.feedbackType && filters.feedbackType !== 'all'
          ? filters.feedbackType
          : null,
      p_status:
        filters?.status && filters.status !== 'all' ? filters.status : null,
      p_limit: filters?.limit ?? 50,
      p_offset: filters?.offset ?? 0,
    });
    if (error) throw error;
    return { data: data ?? [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Admin: update feedback status, public admin response, and internal notes.
 */
export async function adminUpdateFeedback(params: {
  feedbackId: string;
  status: FeedbackStatus;
  adminResponse?: string;
  internalNotes?: string;
}): Promise<{ data: FeedbackRow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('admin_update_feedback', {
      p_feedback_id: params.feedbackId,
      p_status: params.status,
      p_admin_response:
        params.adminResponse !== undefined ? params.adminResponse : null,
      p_internal_notes:
        params.internalNotes !== undefined ? params.internalNotes : null,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

