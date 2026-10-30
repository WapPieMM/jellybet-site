-- Increase the existing storefront music bucket limit to 50 MB.
update storage.buckets
set file_size_limit = 52428800
where id = 'shop-music';
