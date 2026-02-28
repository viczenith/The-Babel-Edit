'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';

const feedbackSchema = z.object({
  type: z.string().nonempty('Feedback type is required'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be less than 1000 characters'),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface FeedbackFormProps {
  onSubmit: (values: FeedbackFormValues) => Promise<void>;
}

export function FeedbackForm({ onSubmit }: FeedbackFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: 'GENERAL',
      message: '',
    },
  });

  const handleSubmit = async (values: FeedbackFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      toast.success('Thank you for your feedback!');
      form.reset();
    } catch (error) {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="text-left">
              <FormLabel>Feedback Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a feedback type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="BUG">Bug Report</SelectItem>
                  <SelectItem value="SUGGESTION">Suggestion</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem className="text-left">
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What's on your mind? Share your experience, ideas, or anything you'd like us to know..."
                  className="resize-none bg-white min-h-[140px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-2.5 font-semibold"
          style={{ backgroundColor: '#111827' }}
        >
          {isSubmitting ? 'Sending...' : 'Submit Feedback'}
        </Button>
      </form>
    </Form>
  );
}
