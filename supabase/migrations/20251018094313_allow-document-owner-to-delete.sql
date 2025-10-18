-- Allow document owners to delete their own documents
CREATE POLICY "Users can delete their own documents"
ON public.documents
FOR DELETE
USING (user_id = auth.uid());
