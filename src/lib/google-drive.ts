import type { FullExport, GoogleUser } from './types';

const FILE_NAME = 'gdwl_backup.json';
const APPDATA_FOLDER = 'appDataFolder';

/**
 * Fetch Google User Info using Access Token
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUser> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    throw new Error('انتهت مدة جلسة Google، يرجى إعادة تسيجل الدخول لتجديد الاتصال.');
  }

  if (!response.ok) {
    throw new Error('فشل جلب بيانات حساب Google');
  }

  const data = await response.json();
  return {
    id: data.sub,
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

/**
 * Get backup file metadata (id & modifiedTime) from Google Drive AppData Folder
 */
export async function getDriveBackupMetadata(accessToken: string): Promise<{ id: string; modifiedTime: string } | null> {
  try {
    const query = encodeURIComponent(`name = '${FILE_NAME}' and '${APPDATA_FOLDER}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=${APPDATA_FOLDER}&q=${query}&fields=files(id,name,modifiedTime)`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    if (result.files && result.files.length > 0) {
      return { id: result.files[0].id, modifiedTime: result.files[0].modifiedTime };
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Find existing gdwl_backup.json file inside AppData Folder
 */
export async function findDriveBackupFile(accessToken: string): Promise<string | null> {
  const meta = await getDriveBackupMetadata(accessToken);
  return meta ? meta.id : null;
}

/**
 * Upload or Update backup data in Google Drive AppData Folder
 */
export async function uploadToDriveAppData(accessToken: string, data: FullExport): Promise<{ fileId: string; modifiedTime: string }> {
  const fileId = await findDriveBackupFile(accessToken);
  const jsonContent = JSON.stringify(data, null, 2);

  if (fileId) {
    // Update existing file content via direct media PATCH
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,modifiedTime`;
    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonContent,
    });

    if (response.status === 401) {
      throw new Error('SESSION_EXPIRED');
    }

    if (!response.ok) {
      throw new Error(`فشل تحديث ملف النسخة الاحتياطية في Google Drive (${response.status})`);
    }

    const resData = await response.json();
    return { fileId: resData.id, modifiedTime: resData.modifiedTime || new Date().toISOString() };
  } else {
    // Create new file in appDataFolder using explicit MIME multipart/related
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: FILE_NAME,
      parents: [APPDATA_FOLDER],
      mimeType: 'application/json',
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime';
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (response.status === 401) {
      throw new Error('SESSION_EXPIRED');
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`فشل إنشاء ملف النسخة الاحتياطية في Google Drive (${response.status})`);
    }

    const resData = await response.json();
    return { fileId: resData.id, modifiedTime: resData.modifiedTime || new Date().toISOString() };
  }
}

/**
 * Download backup data from Google Drive AppData Folder
 */
export async function downloadFromDriveAppData(accessToken: string, fileId?: string): Promise<FullExport | null> {
  const targetFileId = fileId || (await findDriveBackupFile(accessToken));
  if (!targetFileId) return null;

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${targetFileId}?alt=media`;
  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    throw new Error('انتهت مدة صلاحية الجلسة المؤقتة لـ Google (ساعة واحدة). يرجى التجديد.');
  }

  if (!response.ok) {
    throw new Error('فشل تنزيل البيانات من Google Drive');
  }

  const data: FullExport = await response.json();
  return data;
}
