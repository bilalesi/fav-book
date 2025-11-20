-- Seed default categories
INSERT INTO category (id, name, "userId", "isSystem", "createdAt")
VALUES 
  (gen_random_uuid(), 'Technology', NULL, true, NOW()),
  (gen_random_uuid(), 'Programming', NULL, true, NOW()),
  (gen_random_uuid(), 'AI & Machine Learning', NULL, true, NOW()),
  (gen_random_uuid(), 'Web Development', NULL, true, NOW()),
  (gen_random_uuid(), 'DevOps', NULL, true, NOW()),
  (gen_random_uuid(), 'Design', NULL, true, NOW()),
  (gen_random_uuid(), 'Business', NULL, true, NOW()),
  (gen_random_uuid(), 'Marketing', NULL, true, NOW()),
  (gen_random_uuid(), 'Productivity', NULL, true, NOW()),
  (gen_random_uuid(), 'Science', NULL, true, NOW()),
  (gen_random_uuid(), 'Education', NULL, true, NOW()),
  (gen_random_uuid(), 'News', NULL, true, NOW()),
  (gen_random_uuid(), 'Entertainment', NULL, true, NOW()),
  (gen_random_uuid(), 'Health', NULL, true, NOW()),
  (gen_random_uuid(), 'Finance', NULL, true, NOW())
ON CONFLICT (name, "userId") DO NOTHING;
