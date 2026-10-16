-- Hosts can upload one background-music MP3 per invitation, stored next to the photo in the same public bucket.
update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/png','image/webp','audio/mpeg'],
       file_size_limit = 8388608
 where id = 'invitation-media';
