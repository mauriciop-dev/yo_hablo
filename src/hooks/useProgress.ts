import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type ProgressRecord = {
  id: string;
  user_id: string;
  language: string;
  skill: string;
  level: string;
  lesson_id: number;
  score: number;
  completed: boolean;
  attempts: number;
  updated_at: string;
};

export function useProgress(userId?: string) {
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (data) setProgress(data as ProgressRecord[]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveProgress = useCallback(async (record: {
    user_id: string; language: string; skill: string;
    level: string; lesson_id: number; score: number; completed: boolean;
  }) => {
    const { data: existing } = await supabase
      .from('progress')
      .select('id, attempts, score')
      .eq('user_id', record.user_id)
      .eq('lesson_id', record.lesson_id)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('progress')
        .update({
          score: record.score,
          completed: record.completed,
          attempts: (existing as any).attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (existing as any).id);
      if (error) console.error('Error updating progress:', error);
    } else {
      const { error } = await supabase
        .from('progress')
        .insert([record]);
      if (error) console.error('Error inserting progress:', error);
    }
    fetchProgress();
  }, [fetchProgress]);

  const getSkillProgress = useCallback((skill: string, language: string) => {
    const skillRecords = progress.filter(p => p.skill === skill && p.language === language);
    if (skillRecords.length === 0) return { percent: 0, level: 'A1', lastLesson: null };
    const completed = skillRecords.filter(p => p.completed).length;
    const total = skillRecords.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const highestLevel = ['A1', 'A2', 'B1', 'B2', 'C1'].find(
      lv => !skillRecords.some(p => p.level === lv && p.completed)
    ) || 'C1';
    return { percent, level: highestLevel, lastLesson: skillRecords[0]?.lesson_id || null };
  }, [progress]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  return { progress, loading, fetchProgress, saveProgress, getSkillProgress };
}
