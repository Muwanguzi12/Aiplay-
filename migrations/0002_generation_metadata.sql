-- Add generation metadata while keeping generated objects private in R2.
ALTER TABLE generation_jobs ADD COLUMN output_duration_seconds REAL;
