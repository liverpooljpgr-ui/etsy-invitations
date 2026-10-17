-- Uploaded background music is limited to 4 MB (photos are resized in the browser and stay far below that).
update storage.buckets set file_size_limit = 4194304 where id = 'invitation-media';
