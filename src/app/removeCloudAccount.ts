interface AccountCleanup<Photo> {
  listPhotos(): Promise<readonly Photo[]>;
  deletePhoto(photo: Photo): Promise<void>;
  deleteDocument(): Promise<void>;
  deleteAccount(): Promise<void>;
}

export async function removeCloudAccount<Photo>(cleanup: AccountCleanup<Photo>) {
  const photos = await cleanup.listPhotos();
  for (const photo of photos) {
    try {
      await cleanup.deletePhoto(photo);
    } catch (error) {
      if ((error as { code?: string })?.code !== "storage/object-not-found") throw error;
    }
  }
  await cleanup.deleteDocument();
  await cleanup.deleteAccount();
}
