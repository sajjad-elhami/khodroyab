import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "vehicle-images";
const PAGE_SIZE = 1000;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function listAllStoragePaths(
  admin: ReturnType<typeof createAdminClient>,
  currentPath = "",
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(BUCKET).list(currentPath, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

      // Supabase Storage represents folders as entries without a file id.
      if (entry.id === null) {
        paths.push(...(await listAllStoragePaths(admin, fullPath)));
      } else {
        paths.push(fullPath);
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return paths;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const [{ data: vehicles, error: vehiclesError }, { data: images, error: imagesError }] =
      await Promise.all([
        admin.from("vehicles").select("id"),
        admin.from("vehicle_images").select("storage_path, thumbnail_path"),
      ]);

    if (vehiclesError) throw vehiclesError;
    if (imagesError) throw imagesError;

    const vehicleIds = new Set((vehicles ?? []).map((row) => row.id));
    const linkedImagePaths = new Set<string>();

    for (const image of images ?? []) {
      if (image.storage_path) linkedImagePaths.add(image.storage_path);
      if (image.thumbnail_path) linkedImagePaths.add(image.thumbnail_path);
    }

    const allPaths = await listAllStoragePaths(admin);
    const orphanPaths = allPaths.filter((path) => {
      if (linkedImagePaths.has(path)) return false;

      const vehicleId = path.split("/")[0];

      // If the vehicle still exists, keep the file even if its image row is
      // missing. This is deliberately conservative and prevents accidental
      // deletion of potentially recoverable images.
      if (vehicleIds.has(vehicleId)) return false;

      // Root-level files with no image-row reference are true orphans.
      return true;
    });

    if (orphanPaths.length > 0) {
      const { error: removeError } = await admin.storage
        .from(BUCKET)
        .remove(orphanPaths);
      if (removeError) throw removeError;
    }

    console.info("[ORPHAN_STORAGE_CLEANUP]", {
      scanned: allPaths.length,
      linked: linkedImagePaths.size,
      removed: orphanPaths.length,
      removedPaths: orphanPaths,
    });

    return NextResponse.json({
      ok: true,
      scanned: allPaths.length,
      linked: linkedImagePaths.size,
      removed: orphanPaths.length,
    });
  } catch (error) {
    console.error("[ORPHAN_STORAGE_CLEANUP_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Storage cleanup failed.",
      },
      { status: 500 },
    );
  }
}
