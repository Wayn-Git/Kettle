# Admin Panel Delete Fix

## Problem
The admin panel was unable to delete posts because the Supabase database was missing the required **Row Level Security (RLS) DELETE policy** for the `posts` table.

## Solution

### 1. Run the SQL Migration

Execute the SQL file in your Supabase SQL Editor:

```sql
-- Go to: https://app.supabase.com/project/_/sql
-- Copy and paste the contents of: supabase-fix-admin-delete.sql
-- Click "Run"
```

This script adds:
- ✅ DELETE policy for posts table
- ✅ DELETE policy for kettles table  
- ✅ `is_hidden` column to posts table (if missing)
- ✅ `report_count` column to posts table (if missing)
- ✅ Admin functions for secure deletion with logging:
  - `admin_delete_post(post_id, admin_identifier)`
  - `admin_hide_post(post_id, admin_identifier)`
  - `admin_restore_post(post_id, admin_identifier)`
- ✅ Proper CASCADE delete for reports when posts are deleted

### 2. Admin Panel Improvements

The admin panel now includes:

#### Posts Management (`/admin/posts`)
- ✅ **Better delete confirmation** - Requires typing "YES" for permanent deletions
- ✅ **Toast notifications** - Visual feedback for all actions
- ✅ **Error handling** - Shows detailed error messages in console and UI
- ✅ **Fallback logic** - Uses admin functions if available, falls back to direct queries
- ✅ **Loading states** - Shows which action is in progress

#### Reports Management (`/admin/reports`)
- ✅ **Enhanced delete flow** - Confirmation dialog specific to reported content
- ✅ **Toast notifications** - Success/error feedback
- ✅ **Better error messages** - Tells you if the delete policy is missing
- ✅ **Action logging** - All admin actions are logged to `moderation_log` table

## Features

### Delete Actions
- **Hide Post** - Soft delete, sets `is_hidden = true`
- **Restore Post** - Unhides a hidden post
- **Delete Post** - **PERMANENT** deletion, cannot be undone
  - Deletes all replies (CASCADE)
  - Deletes all reports (CASCADE)
  - Logs action to moderation_log

### Safety Features
- Double confirmation for permanent deletes
- Clear warning about what gets deleted
- Detailed error messages if policies are missing
- Fallback to direct queries if admin functions aren't available

## Testing

1. **Without running the SQL fix:**
   - Try to delete a post → Should see error: "Delete policy not configured"
   
2. **After running the SQL fix:**
   - Try to delete a post → Should succeed with green toast notification
   - Check that replies and reports are also deleted (CASCADE)

## Database Schema Updates

### New Columns Added
```sql
ALTER TABLE posts 
  ADD COLUMN is_hidden BOOLEAN DEFAULT false,
  ADD COLUMN report_count INT DEFAULT 0;
```

### New Functions Added
```sql
admin_delete_post(post_id UUID, admin_identifier TEXT)
admin_hide_post(post_id UUID, admin_identifier TEXT)  
admin_restore_post(post_id UUID, admin_identifier TEXT)
```

### New Policies Added
```sql
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (true);
CREATE POLICY "kettles_delete" ON kettles FOR DELETE USING (true);
```

## Security Considerations

⚠️ **Current Setup**: The DELETE policies allow anonymous users to delete (for demo/development).

🔒 **For Production**: Update the policies to check for admin authentication:

```sql
-- Example: Restrict to authenticated admins only
CREATE POLICY "posts_delete" ON posts 
  FOR DELETE 
  USING (
    auth.role() = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );
```

## Troubleshooting

### Error: "policy violation"
- **Cause**: DELETE policy is missing
- **Fix**: Run `supabase-fix-admin-delete.sql`

### Error: "column is_hidden does not exist"
- **Cause**: Schema is outdated
- **Fix**: Run `supabase-fix-admin-delete.sql` (includes column creation)

### Error: "function admin_delete_post does not exist"
- **Not an error**: The admin panel will fall back to direct DELETE queries
- **To fix**: Run `supabase-fix-admin-delete.sql` to add the functions

### Deletes work but reports remain
- **Cause**: Foreign key constraint missing CASCADE
- **Fix**: Run `supabase-fix-admin-delete.sql` (section 6)

## Monitoring

All admin actions are logged to the `moderation_log` table:

```sql
SELECT * FROM moderation_log 
WHERE action_type IN ('delete_post', 'hide_post', 'restore_post')
ORDER BY created_at DESC;
```

## Next Steps

1. ✅ Run the SQL migration
2. ✅ Test deletion in admin panel
3. ⏭ Add proper admin authentication (for production)
4. ⏭ Set up email notifications for moderation actions
5. ⏭ Add bulk delete functionality
6. ⏭ Add undo/restore for deleted posts (soft delete)
