export async function listDriveFiles(accessToken: string, folderId?: string) {
  let query = "mimeType != 'application/vnd.google-apps.folder' and trashed = false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=1000&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink)&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || response.statusText;
    throw new Error(`Failed to fetch files from Google Drive: ${message} (${response.status})`);
  }

  return response.json();
}

export async function listDriveFolders(accessToken: string) {
  const query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?pageSize=100&fields=files(id,name)&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || response.statusText;
    throw new Error(`Failed to fetch folders from Google Drive: ${message} (${response.status})`);
  }

  return response.json();
}

export async function uploadToDrive(accessToken: string, file: File | Blob, fileName?: string, folderId?: string) {
  const metadata: any = {
    name: fileName || (file as File).name || 'untitled',
    mimeType: file.type,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || response.statusText;
    throw new Error(`Failed to upload file to Google Drive: ${message} (${response.status})`);
  }

  return response.json();
}

export async function makeFilePublic(accessToken: string, fileId: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.warn('Failed to make file public:', errorData);
  }
}
