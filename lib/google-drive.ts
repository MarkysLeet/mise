import { drive_v3 } from "googleapis";

/**
 * Ensures that a specific folder path exists inside a given root folder on Google Drive.
 *
 * @param drive - Google Drive API client instance
 * @param rootFolderId - The ID of the root folder to start checking from
 * @param pathArray - An array of folder names representing the path (e.g., ['Anex', 'Tutanak'])
 * @returns The ID of the final folder in the path
 */
export async function ensureFolderPath(
  drive: drive_v3.Drive,
  rootFolderId: string,
  pathArray: string[]
): Promise<string> {
  let currentParentId = rootFolderId;

  for (const folderName of pathArray) {
    const escapedName = folderName.replace(/'/g, "\\'");

    // Search for the folder in the current parent
    const res = await drive.files.list({
      q: `'${currentParentId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = res.data.files || [];

    if (files.length > 0 && files[0].id) {
      // Folder exists, move to it
      currentParentId = files[0].id;
    } else {
      // Folder doesn't exist, create it
      const createRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [currentParentId],
        },
        fields: 'id',
        supportsAllDrives: true,
      });

      if (!createRes.data.id) {
        throw new Error(`Google Drive'da '${folderName}' klasörü oluşturulamadı.`);
      }

      currentParentId = createRes.data.id;
    }
  }

  return currentParentId;
}
