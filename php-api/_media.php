<?php
/**
 * HeritOS: website image ingest (Phase 4). Requires _lib.php, _jobs.php and
 * _cms.php first.
 *
 * An upload is accepted only when finfo and getimagesize() both say JPEG, PNG or
 * WebP, it is under MEDIA_MAX_MB and 40 megapixels. It is then decoded and
 * re-encoded with GD, which drops every metadata block (EXIF, GPS, XMP, ICC,
 * comments) and anything appended to the file. The original bytes are never
 * stored. Output: WebP at 800, 1600 and 2400 pixels wide (never upscaled;
 * quality 86 since D-030) plus one JPEG fallback at the largest width (88), all named <32 random hex>-w<width>.<ext>,
 * written with mode 0644 to PUBLIC_UPLOAD_DIR (default <doc root>/uploads/site),
 * a folder whose .htaccess refuses to run scripts. Without GD the upload is
 * refused (501), because metadata could not be stripped.
 */

/** Folder that holds published images, and the URL it is served from. */
function media_dir() { return rtrim((string)cfg('PUBLIC_UPLOAD_DIR', __DIR__ . '/uploads/site'), '/'); }
function media_base_url() { return rtrim((string)cfg('PUBLIC_UPLOAD_URL', '/uploads/site'), '/'); }
function media_max_bytes() { return (int)round((float)cfg('MEDIA_MAX_MB', 8) * 1024 * 1024); }

/** A media row as staff see it (with variants decoded and public URLs). */
function media_staff_view(array $m) {
  $v = json_decode((string)$m['variants'], true) ?: [];
  return [
    'id' => (int)$m['id'], 'width' => (int)$m['width'], 'height' => (int)$m['height'],
    'alt_text' => (string)($m['alt_text'] ?? ''), 'caption' => (string)($m['caption'] ?? ''),
    'bytes' => (int)$m['bytes'], 'created_at' => $m['created_at'],
    'public' => media_public($m + ['variants' => $v], media_base_url()),
  ];
}

/** Fail the request when the upload field is missing, broken or too large. */
function media_check_upload_error($f) {
  $len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
  if (!$f || !is_array($f)) {
    if ($len > media_max_bytes()) fail('The image is too large (at most ' . cfg('MEDIA_MAX_MB', 8) . ' MB)', 413);
    fail('Choose an image to upload (field "file")');
  }
  if (is_array($f['error'])) fail('Upload one image at a time');
  switch ((int)$f['error']) {
    case UPLOAD_ERR_OK: break;
    case UPLOAD_ERR_INI_SIZE: case UPLOAD_ERR_FORM_SIZE:
      fail('The image is too large for this server', 413);
    case UPLOAD_ERR_NO_FILE: fail('Choose an image to upload (field "file")');
    default: fail('The upload did not finish; please try again', 400);
  }
  if ((int)$f['size'] > media_max_bytes()) fail('The image is too large (at most ' . cfg('MEDIA_MAX_MB', 8) . ' MB)', 413);
  if (!is_uploaded_file($f['tmp_name'])) fail('The upload did not finish; please try again', 400);
}

/**
 * Check, re-encode and store one image file. Returns the new media row id and
 * whether it was a duplicate of an existing (not deleted) upload.
 */
function media_ingest($path, $userId, $alt = '', $caption = '') {
  if (!function_exists('imagecreatetruecolor') || !function_exists('imagejpeg')) fail('Image processing (GD) is not available on this server', 501);
  $bytes = filesize($path);
  if ($bytes === false || $bytes <= 0) fail('The file is empty', 400);
  if ($bytes > media_max_bytes()) fail('The image is too large (at most ' . cfg('MEDIA_MAX_MB', 8) . ' MB)', 413);

  // Type: finfo on the content, and getimagesize must agree. The name and the
  // browser's Content-Type are ignored.
  $mime = function_exists('finfo_open') ? finfo_file(finfo_open(FILEINFO_MIME_TYPE), $path) : null;
  $ext = upload_mime_ok($mime);
  $info = @getimagesize($path);
  $typeMap = [IMAGETYPE_JPEG => 'image/jpeg', IMAGETYPE_PNG => 'image/png', IMAGETYPE_WEBP => 'image/webp'];
  if (!$ext || !$info || ($typeMap[$info[2]] ?? null) !== $mime) fail('Only JPEG, PNG or WebP images can be uploaded', 415);
  [$w, $h] = $info;
  if ($w < 1 || $h < 1 || $w * $h > IMAGE_MAX_PIXELS) fail('The image dimensions are not supported (40 megapixels at most)', 415);

  $sha = hash_file('sha256', $path);
  $dup = db_row('SELECT * FROM media_assets WHERE sha256 = ? AND deleted_at IS NULL LIMIT 1', 's', $sha);
  // A repeat upload of a known image keeps its row. When that row was made
  // before the current sizes (D-030 added 2400px), the variants are made again
  // from this upload, since the original bytes were never kept.
  if ($dup && !media_needs_refresh($dup)) return [(int)$dup['id'], true];

  @ini_set('memory_limit', '256M');
  $im = match ($mime) {
    'image/jpeg' => @imagecreatefromjpeg($path),
    'image/png' => @imagecreatefrompng($path),
    'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
  };
  if (!$im) fail('The image could not be read', 415);
  if (!imageistruecolor($im)) imagepalettetotruecolor($im);

  // Camera orientation, read before the EXIF block is discarded.
  if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
    $exif = @exif_read_data($path);
    $o = (int)($exif['Orientation'] ?? 1);
    $rot = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
    if ($rot) { $r = imagerotate($im, $rot, 0); if ($r) { $im = $r; } }
  }
  $w = imagesx($im); $h = imagesy($im);

  $dir = media_dir();
  if (!is_dir($dir) && !@mkdir($dir, 0755, true)) fail('The upload folder is missing and could not be created', 500);
  if (!is_writable($dir)) fail('The upload folder is not writable', 500);

  $base = bin2hex(random_bytes(16));
  $plan = image_variant_plan($w);
  $variants = ['webp' => [], 'jpg' => []];
  $written = [];
  $canWebp = function_exists('imagewebp');
  try {
    foreach ($plan as $tw) {
      $th = max(1, (int)round($h * $tw / $w));
      $scaled = $tw === $w ? $im : media_resample($im, $tw, $th);
      if ($canWebp) {
        imagesavealpha($scaled, true);
        $name = "$base-w$tw.webp";
        if (!imagewebp($scaled, "$dir/$name", MEDIA_WEBP_QUALITY)) throw new RuntimeException('webp write failed');
        $written[] = "$dir/$name"; $variants['webp'][(string)$tw] = $name;
      }
      if ($tw === end($plan)) {
        // JPEG fallback (and link-preview image) at the largest width, on white.
        $flat = imagecreatetruecolor($tw, $th);
        imagefill($flat, 0, 0, imagecolorallocate($flat, 255, 255, 255));
        imagecopy($flat, $scaled, 0, 0, 0, 0, $tw, $th);
        imageinterlace($flat, true);
        $name = "$base-w$tw.jpg";
        if (!imagejpeg($flat, "$dir/$name", MEDIA_JPEG_QUALITY)) throw new RuntimeException('jpeg write failed');
        $written[] = "$dir/$name"; $variants['jpg'][(string)$tw] = $name;
        unset($flat);
      }
      unset($scaled);
    }
  } catch (Throwable $e) {
    foreach ($written as $f) @unlink($f);
    unset($im);
    fail('The image could not be processed', 500);
  }
  unset($im);
  foreach ($written as $f) @chmod($f, 0644);

  if ($dup) {
    // Swap in the new files, then remove the old ones; alt text and caption stay.
    db_exec('UPDATE media_assets SET base_name = ?, width = ?, height = ?, variants = ? WHERE id = ?', 'siisi',
      $base, $w, $h, json_encode($variants), (int)$dup['id']);
    $old = json_decode((string)$dup['variants'], true) ?: [];
    foreach (['webp', 'jpg'] as $k) foreach (($old[$k] ?? []) as $name) {
      if (preg_match('/^[a-f0-9]{32}-w\d+\.(webp|jpg)$/', (string)$name)) @unlink("$dir/$name");
    }
    return [(int)$dup['id'], true];
  }

  $alt = cms_text($alt); $caption = cms_text($caption);
  if (cms_len($alt) > 250) $alt = mb_substr($alt, 0, 250);
  if (cms_len($caption) > 250) $caption = mb_substr($caption, 0, 250);
  db_exec('INSERT INTO media_assets (base_name, width, height, variants, alt_text, caption, sha256, bytes, mime_in, uploaded_by)
           VALUES (?,?,?,?,?,?,?,?,?,?)', 'siissssisi',
    $base, $w, $h, $vj = json_encode($variants), $alt, $caption, $sha, $bytes, $mime, $userId);
  return [(int)$GLOBALS['conn']->insert_id, false];
}

/** A resized copy that keeps transparency (imagescale() is not reliable on every GD build). */
const MEDIA_WEBP_QUALITY = 86;
const MEDIA_JPEG_QUALITY = 88;

/** True when a stored image lacks a width the current plan would make for it. */
function media_needs_refresh(array $m) {
  $v = json_decode((string)($m['variants'] ?? ''), true) ?: [];
  $have = array_map('intval', array_keys($v['webp'] ?? []));
  if (!$have) return false;
  foreach (image_variant_plan((int)$m['width']) as $t) if (!in_array($t, $have, true)) return true;
  return false;
}

function media_resample($im, $tw, $th) {
  $out = imagecreatetruecolor($tw, $th);
  imagealphablending($out, false);
  imagesavealpha($out, true);
  imagefill($out, 0, 0, imagecolorallocatealpha($out, 0, 0, 0, 127));
  if (!imagecopyresampled($out, $im, 0, 0, 0, 0, $tw, $th, imagesx($im), imagesy($im))) throw new RuntimeException('resample failed');
  return $out;
}

/** Media rows by id (deleted ones included, so callers can say so). */
function media_rows(array $ids) {
  $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
  if (!$ids) return [];
  $rows = db_rows('SELECT * FROM media_assets WHERE id IN (' . implode(',', $ids) . ')');
  $out = [];
  foreach ($rows as $r) { $r['variants'] = json_decode((string)$r['variants'], true) ?: []; $out[(int)$r['id']] = $r; }
  return $out;
}
